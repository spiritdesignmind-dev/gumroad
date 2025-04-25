# frozen_string_literal: true

class HelpController < Sellers::BaseController
  before_action :skip_authorization

  def index
    @title = "Help"
    @on_help_page = true
    @body_class = "help-container"
  end

  def article
    slug = params[:slug]

    render template: "help/#{slug}"
  rescue ActionView::MissingTemplate => e
    render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false
  end

end
