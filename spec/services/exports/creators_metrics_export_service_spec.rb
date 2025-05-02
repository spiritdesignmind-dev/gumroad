# frozen_string_literal: true

require "spec_helper"

describe Exports::CreatorsMetricsExportService do
  describe "#perform" do
    let(:recipient) { create(:user) }
    let!(:creator1) { create(:user, name: "Creator 1") }
    let!(:creator2) { create(:user, name: "Creator 2") }

    before do
      allow_any_instance_of(User).to receive(:gross_sales_cents_total_as_seller).and_return(500_000_00)
      allow_any_instance_of(User).to receive(:sales_cents_total).and_return(350_000_00)
    end

    it "generates a CSV file with creator metrics" do
      service = described_class.new(recipient)
      result = service.perform

      csv_content = CSV.parse(result.tempfile.read)
      headers = csv_content.first
      data_rows = csv_content[1..-2] # Exclude headers and totals row
      totals_row = csv_content.last

      # Verify headers
      expect(headers).to eq(described_class::CREATOR_FIELDS)

      # Verify data rows (assuming we have created users)
      expect(data_rows.size).to be >= 2

      # Verify totals row
      expect(totals_row.first).to eq(described_class::TOTALS_COLUMN_NAME)

      # Verify specific columns in data rows
      data_rows.each do |row|
        creator_id_index = headers.index("Creator ID")
        sales_index = headers.index("Total Sales ($)")
        earnings_index = headers.index("Total Earnings ($)")

        expect(row[creator_id_index]).to be_present
        expect(row[sales_index]).to eq("500,000.00")
        expect(row[earnings_index]).to eq("350,000.00")
      end
    end
  end

  describe ".export" do
    let(:recipient) { create(:user) }

    context "when user count is below threshold" do
      before do
        allow(User).to receive_message_chain(:where, :not, :count).and_return(10)
      end

      it "performs export synchronously" do
        service_instance = instance_double(described_class)
        allow(described_class).to receive(:new).and_return(service_instance)
        expect(service_instance).to receive(:perform)

        described_class.export(recipient:)
      end
    end

    context "when user count is above threshold" do
      before do
        allow(User).to receive_message_chain(:where, :not, :count).and_return(1000)
      end

      it "enqueues async export job" do
        expect(Exports::CreatorsMetricsExportWorker).to receive(:perform_async).with(recipient.id)

        result = described_class.export(recipient:)
        expect(result).to be false
      end
    end
  end
end
