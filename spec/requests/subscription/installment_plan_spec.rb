# frozen_string_literal: true

require "spec_helper"

describe "Installment Plans", type: :feature, js: true do
  include ManageSubscriptionHelpers

  let(:seller) { create(:user) }
  let(:buyer) { create(:user) }
  let(:credit_card) { create(:credit_card) }

  let(:product) { create(:product, :with_installment_plan, user: seller, price_cents: 30_00) }

  RSpec.shared_context "setup installment plan subscription" do |started_at: Time.current|
    let(:subscription) { create(:subscription, is_installment_plan: true, credit_card:, user: buyer, link: product) }
    let(:purchase) { create(:installment_plan_purchase, subscription:, link: product, credit_card:, purchaser: buyer) }

    before do
      travel_to(started_at) do
        subscription
        purchase
      end

      setup_subscription_token(subscription:)
    end
  end

  context "paid in full" do
    include_context "setup installment plan subscription"

    it "404s when the installment plan has been paid in full" do
      subscription.end_subscription!

      visit manage_subscription_path(subscription.external_id, token: subscription.token)

      expect(page).to have_text("Not Found")
    end
  end

  context "active with overdue charges" do
    include_context "setup installment plan subscription", started_at: 33.days.ago

    it "allows updating the installment plan's credit card and charges the new card" do
      visit manage_subscription_path(subscription.external_id, token: subscription.token)

      click_on "Use a different card?"

      fill_in_credit_card(number: StripePaymentMethodHelper.success[:cc_number])
      expect(page).to have_text "You'll be charged US$10 today."

      expect do
        click_on "Update installment plan"
        wait_for_ajax

        expect(page).to have_alert(text: "Your installment plan has been updated")
      end
        .to change { subscription.purchases.successful.count }.by(1)
        .and change { subscription.reload.credit_card }.from(credit_card).to(be_present)
    end
  end

  context "active with no overdue charges" do
    include_context "setup installment plan subscription"

    it "displays the payment method that'll be used for future charges" do
      visit manage_subscription_path(subscription.external_id, token: subscription.token)
      expect(page).to have_selector("[aria-label=\"Saved credit card\"]", text: /#{ChargeableVisual.get_card_last4(credit_card.visual)}$/)
    end

    it "allows updating the installment plan's credit card" do
      visit manage_subscription_path(subscription.external_id, token: subscription.token)

      click_on "Use a different card?"

      fill_in_credit_card(number: StripePaymentMethodHelper.success[:cc_number])

      expect do
        click_on "Update installment plan"
        wait_for_ajax

        expect(page).to have_alert(text: "Your installment plan has been updated.")
      end
        .to change { subscription.purchases.successful.count }.by(0)
        .and change { subscription.reload.credit_card }.from(credit_card).to(be_present)
    end

    it "does not allow cancelling" do
      visit manage_subscription_path(subscription.external_id, token: subscription.token)

      expect(page).not_to have_button("Cancel")
    end
  end

  context "failed" do
    include_context "setup installment plan subscription", started_at: 40.days.ago

    before { subscription.unsubscribe_and_fail! }

    it "allows updating the installment plan's credit card and charges the new card" do
      visit manage_subscription_path(subscription.external_id, token: subscription.token)

      click_on "Use a different card?"

      fill_in_credit_card(number: StripePaymentMethodHelper.success[:cc_number])
      expect(page).to have_text "You'll be charged US$10 today."

      expect do
        click_on "Restart installment plan"
        wait_for_ajax

        expect(page).to have_alert(text: "Installment plan restarted")
      end
        .to change { subscription.purchases.successful.count }.by(1)
        .and change { subscription.reload.credit_card }.from(credit_card).to(be_present)
    end
  end

  describe "receipt copy verification" do
    include_context "setup installment plan subscription"

    it "displays correct installment plan copy in receipt emails" do
      receipt_presenter = ReceiptPresenter::ItemInfo.new(purchase)
      props = receipt_presenter.props

      expect(props[:manage_subscription_note]).to include("Installment plan initiated on")
      expect(props[:manage_subscription_note]).to include("Your final charge will be on")
      expect(props[:manage_subscription_note]).to include("You can manage your payment settings")
      expect(props[:manage_subscription_note]).not_to include("You will be charged once a month")
      expect(props[:manage_subscription_note]).not_to include("subscription settings")
    end

    it "displays correct payment labels with installment numbers" do
      payment_info = ReceiptPresenter::PaymentInfo.new(purchase)
      today_payment_attrs = payment_info.today_payment_attributes
      upcoming_payment_attrs = payment_info.upcoming_payment_attributes

      today_payment_label = today_payment_attrs.find { |attr| attr[:label]&.include?("Today's payment") }
      upcoming_payment_label = upcoming_payment_attrs.find { |attr| attr[:label]&.include?("Upcoming payment") }

      expect(today_payment_label[:label]).to eq("Today's payment: 1 of 3")
      expect(upcoming_payment_label[:label]).to eq("Upcoming payment: 2 of 3")
    end
  end
end
