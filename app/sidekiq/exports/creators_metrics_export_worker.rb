# frozen_string_literal: true

class Exports::CreatorsMetricsExportWorker
  include Sidekiq::Job
  sidekiq_options retry: 5, queue: :low, lock: :until_executed

  def perform(recipient_id)
    recipient = User.find(recipient_id)
    result = Exports::CreatorsMetricsExportService.new(recipient).perform

    ContactingCreatorMailer.creators_metrics_data(
      recipient:,
      tempfile: result.tempfile,
      filename: result.filename
    )
  end
end
