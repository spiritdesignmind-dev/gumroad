# frozen_string_literal: true

module Blog
  class PostsController < ApplicationController
    layout "home" # Use the home layout

    # TODO: Potentially skip authentication for public blog pages
    # skip_before_action :authenticate_user!, only: [:index, :show]

    def index
      @title = "Gumroad Blog" # Set title for blog index
      @is_on_blog_index_page = true # Flag for layout
      @meta_data = {} # Initialize for home layout
      all_blog_posts = BlogService.all_posts # Fetch all published posts initially

      if params[:category_name].present?
        @active_category = params[:category_name]
        @title = "#{@active_category.titleize} - Gumroad Blog"
        @posts = all_blog_posts.filter { |p| p.category == @active_category }
      elsif params[:tag_name].present?
        @active_tag = params[:tag_name]
        @title = "Posts tagged '#{@active_tag.titleize}' - Gumroad Blog"
        @posts = all_blog_posts.filter { |p| p.tags.include?(@active_tag) }
      else
        @posts = all_blog_posts
      end

      @featured_post = BlogService.featured_post
      # Ensure featured post is not duplicated in the main list if it would also appear there
      @posts = @posts.reject { |p| @featured_post && p.slug == @featured_post.slug } if @featured_post

      @recent_updates = BlogService.recent_posts(5) # Get 5 recent posts for the sidebar
      @categories = BlogService.categories
      @tags = BlogService.tags

      render 'blog/posts/index'
    end

    def show
      @post = BlogService.find_by_slug(params[:slug])
      @meta_data = {} # Initialize for home layout
      if @post.nil? || !@post.published
        render file: Rails.root.join('public', '404.html'), layout: false, status: :not_found
      else
        @title = "#{@post.title} - Gumroad Blog" if @post.title.present? # Set title for individual post
        @is_on_blog_post_page = true # Flag for layout
        # For potential breadcrumbs or related posts, you might want these too:
        # @categories = BlogService.categories
        # @tags = BlogService.tags
        render 'blog/posts/show'
      end
    end
  end
end
