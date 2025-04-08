# frozen_string_literal: true

class Iffy::Post::IngestJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: 3

  def perform(post_id)
    post = Installment.find(post_id)
    raise "Skip job for now" if Feature.active?(:skip_iffy_ingest)

    Iffy::Post::IngestService.new(post).perform
  end
end
