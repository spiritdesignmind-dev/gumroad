# frozen_string_literal: true

class Iffy::Profile::IngestJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: 3

  def perform(user_id)
    user = User.find(user_id)

    raise "Skip job for now" if Feature.active?(:skip_iffy_ingest)

    Iffy::Profile::IngestService.new(user).perform
  end
end
