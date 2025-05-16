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
      @active_category = params[:category_name]

      if @active_category.present?
        parameterized_category_from_param = @active_category.parameterize
        @title = "#{@active_category.titleize} - Gumroad Blog"
        @posts = all_posts_meta.filter { |p| p.category&.parameterize == parameterized_category_from_param }
                               .sort { |a, b| (b.date || Time.at(0)) <=> (a.date || Time.at(0)) }
        @featured_post = nil
        @product_updates = []
      else
        @posts = all_posts_meta
        @featured_post = BlogService.featured_post

        if @featured_post
          current_posts_array = @posts.is_a?(Array) ? @posts.dup : Array(@posts).dup
          current_posts_array.delete(@featured_post)
          @posts = current_posts_array
        end

        @posts.sort! { |a, b| (b.date || Time.at(0)) <=> (a.date || Time.at(0)) }

        # Fetch and sort only "Product Update" category posts for the sidebar
        @product_updates = all_posts_meta
                             .filter { |p| p.category&.parameterize == "product-updates" }
                             .sort { |a, b| (b.date || Time.at(0)) <=> (a.date || Time.at(0)) }
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
