# frozen_string_literal: true

class CollaboratorsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_meta, only: [:index]
  after_action :verify_authorized

  def index
    authorize Collaborator
    @hide_nav = true
    render inertia: "Collaborators/index",
           props: RenderingExtension.custom_context(view_context)
  end

  private
    def set_meta
      @title = "Collaborators"
    end
end
