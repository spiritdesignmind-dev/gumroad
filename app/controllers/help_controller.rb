# frozen_string_literal: true

class HelpController < Sellers::BaseController
    skip_after_action :verify_authorized

    def index

      @title = "Help Center"
      @on_help_page = true
      @title = "Help"
      @body_class = "help-container"
    end

end
