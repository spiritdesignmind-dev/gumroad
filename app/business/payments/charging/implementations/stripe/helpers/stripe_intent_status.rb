# frozen_string_literal: true

class StripeIntentStatus
  SUCCESS = "succeeded"
  REQUIRES_CONFIRMATION = "requires_confirmation"
  REQUIRES_ACTION = "requires_action"
  PROCESSING = "processing"
  CANCELED = "canceled"
end
