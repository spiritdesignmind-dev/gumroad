class SomethingController < ApplicationController
  layout "inertia"

  def index
     render inertia: "Something/index", props: RenderingExtension.custom_context(view_context)
  end
end

