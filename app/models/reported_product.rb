# frozen_string_literal: true

class ReportedProduct < ApplicationRecord
  include ExternalId, Deletable

  REPORT_REASONS = {
    impersonation: "impersonation",
    copyright_violation: "copyright_violation",
    content_violation: "content_violation",
    other: "other"
  }.freeze

  REPORT_STATES = {
    pending: "pending",
    under_review: "under_review",
    declined: "declined",
    actioned: "actioned"
  }.freeze

  belongs_to :reporting_user, class_name: "User", optional: true
  belongs_to :reported_product, class_name: "Link"
  belongs_to :original_product, class_name: "Link", optional: true

  validates :reason, inclusion: { in: REPORT_REASONS.values }
  validates :state, inclusion: { in: REPORT_STATES.values }

  before_create :set_initial_state

  def set_initial_state
    self.state ||= REPORT_STATES[:pending]
  end
end
