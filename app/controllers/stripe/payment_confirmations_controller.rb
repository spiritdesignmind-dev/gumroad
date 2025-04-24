# frozen_string_literal: true

class Stripe::PaymentConfirmationsController < ApplicationController
  include Events, Order::ResponseHelpers
  # Return url to confirm Stripe non-card payments
  def confirm
    redirect_to checkout_index_path and return unless params[:reference].present?

    redirect_status = params[:redirect_status]
    payment_intent = params[:payment_intent]
    if params[:reference].present?
      order = Order.find_by_external_id(params[:reference])
      charge = order.charges.count == 1 ? order.charges.last : nil
      redirect_to checkout_index_path and return unless charge.present?

      if charge.stripe_payment_intent_id == payment_intent
        if redirect_status == StripeIntentStatus::SUCCESS
          confirm_responses, _offer_codes = Order::ConfirmService.new(order:, params: {}).perform

          confirm_responses.each do |purchase_id, response|
            next unless response[:success]

            purchase = Purchase.find(purchase_id)
            create_purchase_event(purchase)
            purchase.handle_recommended_purchase if purchase.was_product_recommended
          end
          order.cart.mark_deleted! if order.cart.present?
          order.send_charge_receipts
        else
          order.purchases.each do |purchase|
            purchase.stripe_error_code = "generic_decline"
            Purchase::MarkFailedService.new(purchase).perform
          end
        end
      end

      redirect_to checkout_index_path(order_id: order.external_id)
    end
  end
end
