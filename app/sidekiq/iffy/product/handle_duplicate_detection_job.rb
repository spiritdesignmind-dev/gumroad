# frozen_string_literal: true

class Iffy::Product::HandleDuplicateDetectionJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: 3

  def perform(product_id, similar_products)
    product = Link.find(product_id)
    
    # If similarity is very high, automatically unpublish
    if similar_products.any? { |p| p["similarity_score"] > 0.95 }
      product.unpublish!(is_unpublished_by_admin: true)
      
      # Create a report for admin review
      ReportedProduct.create!(
        reported_product: product,
        original_product_id: similar_products.first["product_id"],
        reason: ReportedProduct::REPORT_REASONS[:impersonation],
        description: "Automatically detected as duplicate with similarity score: #{similar_products.first["similarity_score"]}"
      )
      
      # Notify the creator about the unpublishing
      ContactingCreatorMailer.product_unpublished_due_to_similarity(product.id).deliver_later
    elsif similar_products.any? { |p| p["similarity_score"] > 0.8 }
      # Flag for admin review without unpublishing
      ReportedProduct.create!(
        reported_product: product,
        original_product_id: similar_products.first["product_id"],
        reason: ReportedProduct::REPORT_REASONS[:impersonation],
        description: "Detected as potential duplicate with similarity score: #{similar_products.first["similarity_score"]}"
      )
    end
  end
end
