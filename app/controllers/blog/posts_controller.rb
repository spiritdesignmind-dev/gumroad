# frozen_string_literal: true

module Blog
  class PostsController < ApplicationController
    layout "home"
    before_action :set_hide_layouts
    before_action :load_blog_post_from_manifest, only: [:show]

    # TODO: Potentially skip authentication for public blog pages
    # skip_before_action :authenticate_user!, only: [:index, :show]

    def index
      @title = "Gumroad Blog"
      @is_on_blog_index_page = true
      @meta_data = {}

      # Load all post metadata from the manifest
      # The view will be responsible for how it displays featured, recent, and the main grid
      # based on the data in these instance variables.
      all_posts_meta = BlogService.all_posts
      @posts = all_posts_meta # Display all published posts by default
      @featured_post = BlogService.featured_post
      # Ensure featured post is not duplicated in the main list if it wasn't already handled by view logic
      @posts = @posts.reject { |p| @featured_post && p.slug == @featured_post.slug } if @featured_post && @posts.include?(@featured_post)
      @recent_updates = BlogService.recent_posts(5)

      # Category pills in the view are now static links; controller doesn't need to provide @categories or @tags for filtering.

      render "blog/posts/index"
    end

    def show
      if @post.nil? || !@post.published # Ensure post exists in manifest and is published
        return render_404
      end

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
