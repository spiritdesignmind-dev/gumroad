# frozen_string_literal: true

class Admin::CreatorsController < ApplicationController
  before_action :require_login

  def export_metrics
    authorize :creator, :export_metrics?
    
    result = Exports::CreatorsMetricsExportService.export(
      recipient: impersonating_user || logged_in_user,
    )
    
    if result
      # Synchronous export
      send_data result.tempfile.read,
                type: "text/csv",
                disposition: "attachment",
                filename: result.filename
    else
      # Asynchronous export
      flash[:notice] = "Your export is being generated and will be emailed to you shortly."
      redirect_to dashboard_path
    end
  end
end
