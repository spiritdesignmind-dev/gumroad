# frozen_string_literal: true

class Iffy::Product::IngestJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: 3

  def perform(product_id)
    product = Link.find(product_id)

    raise "Skip job for now" if Feature.active?(:skip_iffy_ingest)

    Iffy::Product::IngestService.new(product).perform
  end
end
