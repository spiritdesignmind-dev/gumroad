# frozen_string_literal: true

module Blog
  class PostsController < ApplicationController
    layout "home"
    before_action :set_hide_layouts
    before_action :load_blog_post_from_manifest, only: [:show]

    def index
      @title = "Gumroad Blog"
      @is_on_blog_index_page = true
      @meta_data = {
        description: "Explore the latest insights, updates, and resources from the Gumroad team."
      }

      all_posts_meta = BlogService.all_posts
      @all_posts_count = all_posts_meta.size # Count for "All Posts"

      # Calculate counts for static categories
      @static_category_names = ["Creators", "Tips & tricks", "Product updates", "Community"]
      @category_counts = @static_category_names.each_with_object({}) do |name, counts|
        param_name = name.parameterize
        counts[param_name] = all_posts_meta.count { |p| p.category&.parameterize == param_name }
      end

      @active_category = params[:category_name]

      if @active_category.present?
        parameterized_category_from_param = @active_category.parameterize
        @title = "#{@active_category.titleize} - Gumroad Blog"
        @meta_data[:description] = "Explore #{@active_category.titleize} posts from the Gumroad team."
        @posts = all_posts_meta
                   .filter { |p| p.category&.parameterize == parameterized_category_from_param }
                   .sort_by { |p| p.date || Time.at(0) }.reverse
        @featured_post = nil
        @product_updates = []
      else
        @posts = all_posts_meta
        @featured_post = BlogService.featured_post

        if @featured_post
          @posts = @posts.reject { |p| p == @featured_post }
        end

        @posts.sort_by! { |p| p.date || Time.at(0) }
        @posts.reverse!

        @product_updates = all_posts_meta
                             .filter { |p| p.category&.parameterize == "product-updates" }
                             .sort_by { |p| p.date || Time.at(0) }.reverse
                             .first(4)
      end

      render "blog/posts/index"
    end

    def show
      if @post.nil? || !@post.published
        return render_404
      end

      @title = "#{@post.title} - Gumroad Blog" if @post.title.present?
      @is_on_blog_post_page = true

      # Populate @newer_post and @older_post for bottom navigation,
      # ensuring they are not nil if there is blog content.
      all_blog_posts = BlogService.all_posts # Sorted newest first

      @newer_post = nil
      @older_post = nil

      if all_blog_posts.any? # Should always be true if @post is valid
        other_posts_sorted = all_blog_posts.reject { |p| p.slug == @post.slug }

        if other_posts_sorted.length >= 2
          @newer_post = other_posts_sorted[0] # Newest of the other posts
          @older_post = other_posts_sorted[1] # Second newest of the other posts
        elsif other_posts_sorted.length == 1
          # Only one other post exists, use it for both slots
          @newer_post = other_posts_sorted[0]
          @older_post = other_posts_sorted[0]
        else
          # No other posts exist (current post is the only one)
          # Show the current post in both slots to ensure they are not nil
          @newer_post = @post
          @older_post = @post
        end
      end
      # If all_blog_posts is empty (e.g. manifest issue), they remain nil.
      # The view has `if @newer_post` checks which will handle this gracefully.

      render "blog/posts/show"
    end

    private
      def set_hide_layouts
        @hide_layouts = true
      end

      def load_blog_post_from_manifest
        @post = BlogService.find_by_slug(params[:slug])
        @meta_data = {}
      end

      def render_404
        render file: Rails.root.join("public", "404.html"), layout: false, status: :not_found
      end
  end
end
