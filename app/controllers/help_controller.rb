# frozen_string_literal: true

class HelpController < Sellers::BaseController
    def index
      authorize Purchase

      @title = "Help Center"
      @on_help_page = true
      @title = "Help"
      @body_class = "help-container"
    end

end
