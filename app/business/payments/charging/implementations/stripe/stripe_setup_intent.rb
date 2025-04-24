# frozen_string_literal: true

# Creates a SetupIntent from Stripe::SetupIntent
class StripeSetupIntent < SetupIntent
  delegate :id, :client_secret, to: :setup_intent

  def initialize(setup_intent)
    self.setup_intent = setup_intent
  end

  def succeeded?
    setup_intent.status == StripeIntentStatus::SUCCESS
  end

  def requires_action?
    setup_intent.status == StripeIntentStatus::REQUIRES_ACTION
  end

  def canceled?
    setup_intent.status == StripeIntentStatus::CANCELED
  end
end
