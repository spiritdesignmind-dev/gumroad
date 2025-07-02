# frozen_string_literal: true

require 'faraday/typhoeus'
Faraday::Adapter.register_middleware(typhoeus: Faraday::Adapter::Typhoeus)

EsClient = Elasticsearch::Model.client = Elasticsearch::Client.new(
  host: ENV.fetch("ELASTICSEARCH_HOST"),
  retry_on_failure: 5,
  transport_options: { request: { timeout: 5 } },
  logger: Rails.env.test? && ENV["LOG_ES"] != "true" ? Logger.new(File::NULL) : Rails.logger
)

USE_ES_ALIASES = Rails.env.production? || (Rails.env.staging? && ENV["BRANCH_DEPLOYMENT"] != "true")
