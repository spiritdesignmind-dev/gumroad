# frozen_string_literal: true

module Blog
  class PostsController < ApplicationController
    layout "home"
    before_action :set_hide_layouts
    before_action :load_blog_post_from_manifest, only: [:show]

    def index
      @title = "Gumroad Blog"
      @is_on_blog_index_page = true
      @meta_data = {}

      all_posts_meta = BlogService.all_posts
      @posts = all_posts_meta
      @featured_post = BlogService.featured_post
      @posts = @posts - [@featured_post] if @featured_post
      @recent_updates = BlogService.recent_posts(5)

      render "blog/posts/index"
    end

    def show
      if @post.nil? || !@post.published
        return render_404
      end

      @title = "#{@post.title} - Gumroad Blog" if @post.title.present?
      @is_on_blog_post_page = true

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
