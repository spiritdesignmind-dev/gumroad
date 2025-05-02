# frozen_string_literal: true

class Admin::ReportedProductsController < Admin::BaseController
  before_action :fetch_report, only: [:show, :update]

  def index
    @reports = ReportedProduct.alive.order(created_at: :desc).page(params[:page])
  end

  def show
    @reported_product = @report.reported_product
    @original_product = @report.original_product
  end

  def update
    case params[:action_type]
    when "approve"
      # Mark the product as impersonation and unpublish
      @report.reported_product.unpublish!(is_unpublished_by_admin: true)
      @report.update!(state: ReportedProduct::REPORT_STATES[:actioned])
      
      # Notify the creator
      ContactingCreatorMailer.product_unpublished_due_to_similarity(@report.reported_product.id).deliver_later
      
      flash[:notice] = "Report approved and product unpublished."
    when "decline"
      @report.update!(state: ReportedProduct::REPORT_STATES[:declined])
      flash[:notice] = "Report declined."
    end
    
    redirect_to admin_reported_products_path
  end

  private
    def fetch_report
      @report = ReportedProduct.alive.find_by_external_id!(params[:id])
    end
end
