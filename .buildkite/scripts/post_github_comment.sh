#!/bin/bash

set -e

GREEN="\033[0;32m"
NC="\033[0m"
logger() {
  echo -e "${GREEN}$(date "+%Y/%m/%d %H:%M:%S") post_github_comment.sh: $1${NC}"
}

# Required environment variables for GitHub App
if [[ -z "$GITHUB_APP_ID" ]]; then
  logger "GITHUB_APP_ID environment variable is required but not set"
  exit 1
fi

if [[ -z "$GITHUB_APP_PRIVATE_KEY" ]]; then
  logger "GITHUB_APP_PRIVATE_KEY environment variable is required but not set"
  exit 1
fi

if [[ -z "$GITHUB_APP_INSTALLATION_ID" ]]; then
  logger "GITHUB_APP_INSTALLATION_ID environment variable is required but not set"
  exit 1
fi

if [[ -z "$BUILDKITE_COMMIT" ]]; then
  logger "BUILDKITE_COMMIT environment variable is required but not set"
  exit 1
fi

if [[ -z "$BUILDKITE_REPO" ]]; then
  logger "BUILDKITE_REPO environment variable is required but not set"
  exit 1
fi

if [[ -z "$BUILDKITE_BRANCH" ]]; then
  logger "BUILDKITE_BRANCH environment variable is required but not set"
  exit 1
fi

# Function to generate JWT token for GitHub App authentication
generate_jwt_token() {
  local app_id="$1"
  local private_key="$2"

  # JWT header
  local header='{"typ":"JWT","alg":"RS256"}'
  local header_b64=$(echo -n "$header" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

  # JWT payload (expires in 10 minutes)
  local now=$(date +%s)
  local exp=$((now + 600))
  local payload="{\"iat\":$now,\"exp\":$exp,\"iss\":\"$app_id\"}"
  local payload_b64=$(echo -n "$payload" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

  # Create signature
  local header_payload="${header_b64}.${payload_b64}"
  local signature=$(echo -n "$header_payload" | openssl dgst -sha256 -sign <(echo "$private_key") | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

  echo "${header_payload}.${signature}"
}

# Function to get installation access token
get_installation_token() {
  local jwt_token="$1"
  local installation_id="$2"

  logger "Getting installation access token"

  local response=$(curl -s \
    -X POST \
    -H "Authorization: Bearer $jwt_token" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/app/installations/$installation_id/access_tokens")

  local token=$(echo "$response" | jq -r '.token')

  if [[ "$token" == "null" || -z "$token" ]]; then
    logger "Failed to get installation access token. Response: $response"
    exit 1
  fi

  echo "$token"
}

# Generate JWT and get installation access token
logger "Authenticating with GitHub App"
JWT_TOKEN=$(generate_jwt_token "$GITHUB_APP_ID" "$GITHUB_APP_PRIVATE_KEY")
GITHUB_TOKEN=$(get_installation_token "$JWT_TOKEN" "$GITHUB_APP_INSTALLATION_ID")
logger "Successfully authenticated with GitHub App"

# Extract GitHub repo info from BUILDKITE_REPO
# Expected format: git@github.com:owner/repo.git or https://github.com/owner/repo.git
REPO_URL="$BUILDKITE_REPO"
if [[ "$REPO_URL" =~ git@github\.com:(.+)\.git$ ]]; then
  REPO_PATH="${BASH_REMATCH[1]}"
elif [[ "$REPO_URL" =~ https://github\.com/(.+)\.git$ ]]; then
  REPO_PATH="${BASH_REMATCH[1]}"
else
  logger "Unable to parse GitHub repository from BUILDKITE_REPO: $REPO_URL"
  exit 1
fi

# Get app name using the same function from deploy script
function get_app_name(){
  echo "$1" | tr -d '\n' | tr -c '[:alnum:]' '-' | tr '[:upper:]' '[:lower:]' | sed "s/^deploy-//" | cut -c1-32 | sed 's/[^[:alnum:]]$//'
}

APP_NAME=$(get_app_name "$BUILDKITE_BRANCH")
APP_DOMAIN="apps.staging.gumroad.org"
PREVIEW_URL="https://${APP_NAME}.${APP_DOMAIN}"

# Short commit SHA (first 12 characters)
SHORT_COMMIT="${BUILDKITE_COMMIT:0:12}"

# Create comment body
COMMENT_BODY="🚀 **Preview app deployed successfully!**

📱 **Preview URL:** [$PREVIEW_URL]($PREVIEW_URL)
🔗 **Commit:** [\`$SHORT_COMMIT\`](https://github.com/$REPO_PATH/commit/$BUILDKITE_COMMIT)
🌿 **Branch:** \`$BUILDKITE_BRANCH\`

The preview app is now available for testing."

# Find pull request associated with this commit
logger "Finding pull request for commit $BUILDKITE_COMMIT"

# GitHub API call to find PRs associated with the commit
PR_RESPONSE=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_PATH/commits/$BUILDKITE_COMMIT/pulls")

# Check if we found any PRs
PR_COUNT=$(echo "$PR_RESPONSE" | jq '. | length')

if [[ "$PR_COUNT" -eq 0 ]]; then
  logger "No pull request found for commit $BUILDKITE_COMMIT"

  # Try to find PRs for this branch instead
  logger "Searching for pull requests on branch $BUILDKITE_BRANCH"

  PR_RESPONSE=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO_PATH/pulls?head=$(echo $REPO_PATH | cut -d'/' -f1):$BUILDKITE_BRANCH&state=open")

  PR_COUNT=$(echo "$PR_RESPONSE" | jq '. | length')

  if [[ "$PR_COUNT" -eq 0 ]]; then
    logger "No open pull request found for branch $BUILDKITE_BRANCH"
    exit 0
  fi
fi

# Get the first (most recent) PR number
PR_NUMBER=$(echo "$PR_RESPONSE" | jq -r '.[0].number')

if [[ "$PR_NUMBER" == "null" || -z "$PR_NUMBER" ]]; then
  logger "Could not extract PR number from response"
  exit 1
fi

logger "Found pull request #$PR_NUMBER"

# Post comment to the pull request
logger "Posting deployment comment to PR #$PR_NUMBER"

COMMENT_RESPONSE=$(curl -s \
  -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$REPO_PATH/issues/$PR_NUMBER/comments" \
  -d "{\"body\": $(echo "$COMMENT_BODY" | jq -R -s .)}")

# Check if comment was posted successfully
COMMENT_ID=$(echo "$COMMENT_RESPONSE" | jq -r '.id')

if [[ "$COMMENT_ID" == "null" || -z "$COMMENT_ID" ]]; then
  logger "Failed to post comment. Response: $COMMENT_RESPONSE"
  exit 1
fi

logger "Successfully posted comment (ID: $COMMENT_ID) to PR #$PR_NUMBER"
logger "Preview URL: $PREVIEW_URL"
