# frozen_string_literal: true

class ProductReportsController < ApplicationController
  before_action :authenticate_user!, except: [:create]
  before_action :fetch_product, only: [:create]

  def create
    @report = ReportedProduct.new(report_params)
    @report.reporting_user = current_user if user_signed_in?
    @report.reported_product = @product

    if @report.save
      # Trigger Iffy moderation for the reported product
      Iffy::Product::IngestJob.perform_async(@product.id)
      
      render json: { success: true, message: "Thank you for your report. We will review it shortly." }
    else
      render json: { success: false, message: @report.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  private
    def fetch_product
      @product = Link.find_by_external_id!(params[:product_id])
    end

    def report_params
      params.permit(:reason, :description, :original_product_id)
    end
end
