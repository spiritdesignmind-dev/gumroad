# frozen_string_literal: true

class Exports::CreatorsMetricsExportService
  include CurrencyHelper
  
  CREATOR_FIELDS = [
    "Creator ID", "Name", "Username", "Email", "Total Sales ($)", "Total Earnings ($)",
    "Account Created At", "Profile URL"
  ].freeze
  TOTALS_FIELDS = ["Total Sales ($)", "Total Earnings ($)"].freeze
  TOTALS_COLUMN_NAME = "Totals"
  SYNCHRONOUS_EXPORT_THRESHOLD = 500
  attr_reader :filename, :tempfile

  def initialize(recipient)
    @recipient = recipient
    timestamp = Time.current.to_fs(:db).gsub(/ |:/, "-")
    @filename = "Creators-Metrics-#{timestamp}.csv"
    @totals = Hash.new(0)
  end

  def perform
    @tempfile = Tempfile.new(["CreatorsMetrics", ".csv"], "tmp", encoding: "UTF-8")

    CSV.open(@tempfile, "wb") do |csv|
      csv << CREATOR_FIELDS
      User.where.not(username: nil).find_each do |user|
        csv << creator_row(user)
      end

      totals_row = Array.new(CREATOR_FIELDS.size)
      totals_row[0] = TOTALS_COLUMN_NAME
      totals.each do |column_name, value|
        totals_row[CREATOR_FIELDS.index(column_name)] = value.round(2)
      end
      csv << totals_row
    end

    @tempfile.rewind
    self
  end

  def self.export(recipient:)
    if User.where.not(username: nil).count <= SYNCHRONOUS_EXPORT_THRESHOLD
      new(recipient).perform
    else
      Exports::CreatorsMetricsExportWorker.perform_async(recipient.id)
      false
    end
  end

  private
    attr_reader :totals

    def creator_row(user)
      total_sales_cents = user.gross_sales_cents_total_as_seller
      total_earnings_cents = user.sales_cents_total

      data = {
        "Creator ID" => user.external_id_numeric,
        "Name" => user.name.presence || user.username,
        "Username" => user.username,
        "Email" => user.email,
        "Total Sales ($)" => formatted_dollar_amount(total_sales_cents, with_currency: false),
        "Total Earnings ($)" => formatted_dollar_amount(total_earnings_cents, with_currency: false),
        "Account Created At" => user.created_at.to_date,
        "Profile URL" => user.profile_url
      }

      row = Array.new(CREATOR_FIELDS.size)

      data.each do |column_name, value|
        row[CREATOR_FIELDS.index(column_name)] = value
        @totals[column_name] += value.to_f if TOTALS_FIELDS.include?(column_name)
      end
      row
    end
end
