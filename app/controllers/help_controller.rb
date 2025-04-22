# frozen_string_literal: true

class HelpController < Sellers::BaseController
  skip_after_action :verify_authorized

  def index
    @title = "Help"
    @on_help_page = true
    @body_class = "help-container"
  end

  def why_gumroad
    @title = "Why Gumroad"
    @on_help_page = true
  end
end
