# frozen_string_literal: true

require 'yaml'
require 'redcarpet'

class BlogService
  # Placeholder for path to blog content
  CONTENT_PATH = Rails.root.join("content", "blog")

  # Define a struct to hold post data
  PostData = Struct.new(:slug, :title, :date, :category, :tags, :featured_image, :excerpt, :published, :featured, :html_content, :file_path, keyword_init: true) do
    def id
      slug # or derive from file_path if slug is not guaranteed unique by itself
    end

    def persisted?
      true # Mimics ActiveRecord for form helpers, etc.
    end

    def to_param
      slug
    end
  end

  # Returns only published posts, sorted
  def self.all_posts
    loaded_posts = _load_all_parsed_posts
    loaded_posts.filter(&:published).sort_by(&:date).reverse
  end

  # Finds a post by slug, regardless of published status (for potential previews)
  # but controller currently only shows published ones.
  def self.find_by_slug(slug)
    _load_all_parsed_posts.find do |post|
      post.slug == slug || File.basename(post.file_path, '.md') == slug
    end
  end

  def self.categories
    all_posts.map(&:category).compact.uniq.sort
  end

  def self.tags
    all_posts.flat_map(&:tags).compact.uniq.sort
  end

  def self.featured_post
    all_posts.find(&:featured) # Assumes featured posts are also published
  end

  def self.recent_posts(limit = 5)
    all_posts.take(limit)
  end

  private

  # Memoized method to load and parse all .md files once per request/class load.
  # Returns an array of PostData objects (both published and unpublished).
  def self._load_all_parsed_posts
    # In development, this cache will clear on class reload.
    # For production, a more robust Rails.cache strategy based on file mtimes
    # or a deployment hook would be needed if posts change without server restart.
    @_cached_all_parsed_posts ||= Dir.glob(CONTENT_PATH.join("*.md")).map do |file_path|
      parse_file(file_path)
    end.compact
  end

  def self.read_frontmatter(file_path)
    content = File.read(file_path)
    match = content.match(/\A(---\s*\n(.*?)\n---\s*\n)/m)
    match ? YAML.safe_load(match[2], permitted_classes: [Date, Time, Symbol], aliases: true) : {}
  rescue Psych::SyntaxError => e
    Rails.logger.error "Error parsing YAML frontmatter from #{file_path}: #{e.message}"
    nil
  end

  def self.parse_file(file_path)
    begin
      content = File.read(file_path)
      match = content.match(/\A(---\s*\n(.*?)\n---\s*\n)(.*)/m)

      if match
        frontmatter_yaml = match[2]
        markdown_content = match[3]
      else
        # Handle files with no frontmatter or incorrect format
        Rails.logger.warn "No YAML frontmatter found or incorrect format in #{file_path}. Treating as full Markdown content."
        frontmatter_yaml = ""
        markdown_content = content
      end

      frontmatter = YAML.safe_load(frontmatter_yaml, permitted_classes: [Date, Time, Symbol], aliases: true) || {}

      # Ensure date is parsed correctly
      date = frontmatter['date']
      date = Date.parse(date.to_s) if date.present? && !date.is_a?(Date)

      # Initialize Redcarpet Markdown renderer
      # Adjust these options as needed for your desired Markdown features
      renderer = Redcarpet::Render::HTML.new(hard_wrap: true, filter_html: true, link_attributes: { rel: 'noopener noreferrer', target: '_blank' })
      markdown = Redcarpet::Markdown.new(renderer,
        autolink: true,
        tables: true,
        fenced_code_blocks: true,
        strikethrough: true,
        superscript: true,
        underline: true,
        highlight: true,
        quote: true,
        footnotes: true
      )

      html_content = markdown.render(markdown_content.to_s)
      base_slug = frontmatter['slug'] || File.basename(file_path, ".md")

      PostData.new(
        slug: base_slug,
        title: frontmatter['title'],
        date: date,
        category: frontmatter['category'],
        tags: frontmatter['tags'] || [],
        featured_image: frontmatter['featured_image'],
        excerpt: frontmatter['excerpt'],
        published: frontmatter.fetch('published', false),
        featured: frontmatter.fetch('featured', false),
        html_content: html_content,
        file_path: file_path.to_s
      )
    rescue Psych::SyntaxError => e
      Rails.logger.error "Error parsing YAML frontmatter from #{file_path}: #{e.message}"
      nil
    rescue StandardError => e
      Rails.logger.error "Error parsing Markdown file #{file_path}: #{e.message}"
      nil
    end
  end
end
