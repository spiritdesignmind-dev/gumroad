# frozen_string_literal: true

# Stamps PDF(s) for a purchase
class StampPdfForPurchaseJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: 5, lock: :until_executed

  def perform(purchase_id, send_notification: false)
    purchase = Purchase.find(purchase_id)

    PdfStampingService.stamp_for_purchase!(purchase)

    # Send notification email if requested (for on-demand stamping)
    if send_notification
      CustomerMailer.receipt(purchase_id).deliver_now
      Rails.logger.info("[#{self.class.name}] Sent notification for purchase #{purchase_id} after PDF stamping")
    end
  rescue PdfStampingService::Error => e
    Rails.logger.error("[#{self.class.name}.#{__method__}] Failed stamping for purchase #{purchase.id}: #{e.message}")
    raise e if send_notification # Re-raise for on-demand requests so user gets error feedback
  ensure
    # Clear any "in progress" flag for on-demand requests
    Rails.cache.delete("pdf_stamping_in_progress_#{purchase_id}") if send_notification
  end
end
