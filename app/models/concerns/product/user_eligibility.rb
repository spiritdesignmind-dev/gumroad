# frozen_string_literal: true

module Product::UserEligibility
  extend ActiveSupport::Concern

  included do
    validate :user_is_eligible_for_service_products, on: :create, if: :is_service?
    validate :user_is_eligible_for_bundle_products, on: :create, if: :is_bundle?
  end

  private
    def user_is_eligible_for_service_products
      return if user.eligible_for_service_products?

      errors.add(:base, "Service products are disabled until your account is 30 days old.")
    end

    def user_is_eligible_for_bundle_products
      return if user.eligible_for_bundle_products?

      errors.add(:base, "Create at least two products to unlock Bundles.")
    end
end
