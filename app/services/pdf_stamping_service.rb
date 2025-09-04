# frozen_string_literal: true

module PdfStampingService
  class Error < StandardError; end

  extend self

  ERRORS_TO_RESCUE = [
    PdfStampingService::Stamp::Error,
    PDF::Reader::MalformedPDFError
  ].freeze

  def can_stamp_file?(product_file:)
    PdfStampingService::Stamp.can_stamp_file?(product_file:)
  end

  def stamp_for_purchase!(purchase)
    PdfStampingService::StampForPurchase.perform!(purchase)
  end

  # Helper methods for on-demand stamping
  def files_need_stamping?(url_redirect:, product_file_ids:)
    return false unless url_redirect.purchase&.link&.has_stampable_pdfs?

    product_files = url_redirect.alive_product_files.by_external_ids(product_file_ids).pdf_stamp_enabled
    return false if product_files.empty?

    stamped_file_ids = url_redirect.alive_stamped_pdfs.pluck(:product_file_id)
    missing_files = product_files.pluck(:id) - stamped_file_ids
    missing_files.any?
  end

  def stamping_in_progress?(purchase_id)
    Rails.cache.exist?("pdf_stamping_in_progress_#{purchase_id}")
  end

  def mark_stamping_in_progress!(purchase_id)
    Rails.cache.write("pdf_stamping_in_progress_#{purchase_id}", true, expires_in: 30.minutes)
  end
end
