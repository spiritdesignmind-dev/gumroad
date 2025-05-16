# frozen_string_literal: true

require "yaml"
require "erb" # Required for ERB processing in YAML

class BlogService
  MANIFEST_PATH = Rails.root.join("config", "data", "blog_manifest.yml")

  PostData = Struct.new(:slug, :title, :date, :category, :tags, :featured_image, :excerpt, :published, :featured, :html_content, :file_path, keyword_init: true) do
    def id; slug; end
    def persisted?; true; end
    def to_param; slug; end
    def to_model; self; end
  end

  def self.all_posts
    _load_posts_from_manifest.filter(&:published).sort_by(&:date).reverse
  end

  def self.find_by_slug(slug)
    _load_posts_from_manifest.find { |p| p.slug == slug }
  end

  def self.categories
    all_posts.map(&:category).compact.uniq.sort
  end

  def self.tags
    all_posts.flat_map(&:tags).compact.uniq.sort
  end

  def self.featured_post
    all_posts.find(&:featured)
  end

  def self.recent_posts(limit = 5)
    all_posts.take(limit)
  end

  private
    def self._load_posts_from_manifest
      return [] unless File.exist?(MANIFEST_PATH)

      @_cached_manifest_posts ||= begin
        yaml_content = File.read(MANIFEST_PATH)
        # Process ERB in the YAML file (for dynamic dates in our sample)
        # In a real scenario, dates in manifest would likely be static.
        erb_processed_yaml = ERB.new(yaml_content).result

        posts_data = YAML.safe_load(erb_processed_yaml, permitted_classes: [Date, Symbol], aliases: true)
        (posts_data || []).map do |post_hash|
          # Convert string dates from YAML to Date objects if they are not already
          parsed_date = post_hash["date"]
          if parsed_date.is_a?(String)
            begin
              parsed_date = Date.parse(parsed_date)
              post_hash["date"] = parsed_date
            rescue ArgumentError
              Rails.logger.error "[BlogService] Invalid date string '#{post_hash['date']}' for post with slug '#{post_hash['slug']}' in manifest. Setting date to nil."
              parsed_date = nil
              post_hash["date"] = nil
            end
          end

          PostData.new(
            slug: post_hash["slug"],
            title: post_hash["title"],
            date: parsed_date,
            category: post_hash["category"],
            tags: post_hash["tags"] || [],
            featured_image: post_hash["featured_image"],
            excerpt: post_hash["excerpt"],
            published: post_hash.fetch("published", false),
            featured: post_hash.fetch("featured", false),
            html_content: nil,
            file_path: nil
          )
        end
      end
    rescue Psych::SyntaxError => e
      Rails.logger.error "[BlogService] Error parsing blog_manifest.yml: #{e.message}"
      []
    rescue StandardError => e
      Rails.logger.error "[BlogService] Failed to load posts from manifest: #{e.message}"
      []
    end
end
