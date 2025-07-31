# frozen_string_literal: true

require "spec_helper"

describe GenerateSalesReportJob do
  let (:country_code) { "GB" }
  let(:start_date) { Date.new(2015, 1, 1) }
  let (:end_date) { Date.new(2015, 3, 31) }

  it "raises an argument error if the country code is not valid" do
    expect { described_class.new.perform("AUS", start_date, end_date) }.to raise_error(ArgumentError)
  end

  describe "happy case", :vcr do
    let(:s3_bucket_double) do
      s3_bucket_double = double
      allow(Aws::S3::Resource).to receive_message_chain(:new, :bucket).and_return(s3_bucket_double)
      s3_bucket_double
    end

    before :context do
      @s3_object = Aws::S3::Resource.new.bucket("gumroad-specs").object("specs/international-sales-reporting-spec-#{SecureRandom.hex(18)}.zip")
    end

    before do
      travel_to(Time.zone.local(2015, 1, 1)) do
        product = create(:product, price_cents: 100_00, native_type: "digital")

        @purchase1 = create(:purchase_in_progress, link: product, country: "United Kingdom")
        @purchase2 = create(:purchase_in_progress, link: product, country: "Australia")
        @purchase3 = create(:purchase_in_progress, link: product, country: "United Kingdom")
        @purchase4 = create(:purchase_in_progress, link: product, country: "Singapore")
        @purchase5 = create(:purchase_in_progress, link: product, country: "United Kingdom")

        Purchase.in_progress.find_each do |purchase|
          purchase.chargeable = create(:chargeable)
          purchase.process!
          purchase.update_balance_and_mark_successful!
        end
      end
    end

    it "creates a CSV file for sales into the United Kingdom" do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform(country_code, start_date, end_date)

      expect(SlackMessageWorker).to have_enqueued_sidekiq_job("payments", "VAT Reporting", anything, "green")

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload.length).to eq(4)
      expect(actual_payload[0]).to eq(["Sale time", "Sale ID",
                                       "Seller ID", "Seller Email",
                                       "Seller Country",
                                       "Buyer Email", "Buyer Card",
                                       "Price", "Gumroad Fee", "GST",
                                       "Shipping", "Total", "Customer Tax Number"])

      expect(actual_payload[1]).to eq(["2015-01-01 00:00:00 UTC", @purchase1.external_id,
                                       @purchase1.seller.external_id, @purchase1.seller.form_email&.gsub(/.{0,4}@/, '####@'),
                                       nil,
                                       @purchase1.email&.gsub(/.{0,4}@/, '####@'), "**** **** **** 4242",
                                       "10000", "1370", "0",
                                       "0", "10000", nil])

      expect(actual_payload[2]).to eq(["2015-01-01 00:00:00 UTC", @purchase3.external_id,
                                       @purchase3.seller.external_id, @purchase3.seller.form_email&.gsub(/.{0,4}@/, '####@'),
                                       nil,
                                       @purchase3.email&.gsub(/.{0,4}@/, '####@'), "**** **** **** 4242",
                                       "10000", "1370", "0",
                                       "0", "10000", nil])

      expect(actual_payload[3]).to eq(["2015-01-01 00:00:00 UTC", @purchase5.external_id,
                                       @purchase5.seller.external_id, @purchase5.seller.form_email&.gsub(/.{0,4}@/, '####@'),
                                       nil,
                                       @purchase5.email&.gsub(/.{0,4}@/, '####@'), "**** **** **** 4242",
                                       "10000", "1370", "0",
                                       "0", "10000", nil])
    end

    it "creates a CSV file for sales into Australia" do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform("AU", start_date, end_date)

      expect(SlackMessageWorker).to have_enqueued_sidekiq_job("payments", "GST Reporting", anything, "green")

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload.length).to eq(2)
      expect(actual_payload[0]).to eq(["Sale time", "Sale ID",
                                       "Seller ID", "Seller Email",
                                       "Seller Country",
                                       "Buyer Email", "Buyer Card",
                                       "Price", "Gumroad Fee", "GST",
                                       "Shipping", "Total",
                                       "Direct-To-Customer / Buy-Sell", "Zip Tax Rate ID", "Customer ABN Number"])

      expect(actual_payload[1]).to eq(["2015-01-01 00:00:00 UTC", @purchase2.external_id,
                                       @purchase2.seller.external_id, @purchase2.seller.form_email&.gsub(/.{0,4}@/, '####@'),
                                       nil,
                                       @purchase2.email&.gsub(/.{0,4}@/, '####@'), "**** **** **** 4242",
                                       "10000", "1370", "0",
                                       "0", "10000",
                                       "BS", nil, @purchase2.purchase_sales_tax_info&.business_vat_id])
    end

    it "creates a CSV file for sales into Singapore" do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform("SG", start_date, end_date)

      expect(SlackMessageWorker).to have_enqueued_sidekiq_job("payments", "GST Reporting", anything, "green")

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload.length).to eq(2)
      expect(actual_payload[0]).to eq(["Sale time", "Sale ID",
                                       "Seller ID", "Seller Email",
                                       "Seller Country",
                                       "Buyer Email", "Buyer Card",
                                       "Price", "Gumroad Fee", "GST",
                                       "Shipping", "Total",
                                       "Direct-To-Customer / Buy-Sell", "Zip Tax Rate ID", "Customer GST Number"])

      expect(actual_payload[1]).to eq(["2015-01-01 00:00:00 UTC", @purchase4.external_id,
                                       @purchase4.seller.external_id, @purchase4.seller.form_email&.gsub(/.{0,4}@/, '####@'),
                                       nil,
                                       @purchase4.email&.gsub(/.{0,4}@/, '####@'), "**** **** **** 4242",
                                       "10000", "1370", "0",
                                       "0", "10000",
                                       "BS", nil, @purchase4.purchase_sales_tax_info&.business_vat_id])
    end

    it "creates a CSV file for sales into the United Kingdom and does not send slack notification when send_notification is false",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_the_United_Kingdom" } do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform(country_code, start_date, end_date, false)

      expect(SlackMessageWorker.jobs.size).to eq(0)
    end

    it "creates a CSV file for sales into the United Kingdom and sends slack notification when send_notification is true",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_the_United_Kingdom" } do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform(country_code, start_date, end_date, true)

      expect(SlackMessageWorker).to have_enqueued_sidekiq_job("payments", "VAT Reporting", anything, "green")
    end

    it "creates a CSV file for sales into the United Kingdom and sends slack notification when send_notification is not provided (default behavior)",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_the_United_Kingdom" } do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform(country_code, start_date, end_date)

      expect(SlackMessageWorker).to have_enqueued_sidekiq_job("payments", "VAT Reporting", anything, "green")
    end

    it "populates Customer Tax Number when no tax is charged for non-AU/SG countries",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_the_United_Kingdom" } do
      # Modify existing UK purchase to have business_vat_id and no tax
      tax_info = PurchaseSalesTaxInfo.new(business_vat_id: "GB123456789")
      @purchase1.update!(purchase_sales_tax_info: tax_info, gumroad_tax_cents_net_of_refunds: 0)

      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform("GB", start_date, end_date)

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload[0]).to include("Customer Tax Number")
      # Find the row with @purchase1 data and check the last column (Customer Tax Number)
      purchase1_row = actual_payload.find { |row| row[1] == @purchase1.external_id }
      expect(purchase1_row.last).to eq("GB123456789")
    end

    it "leaves Customer Tax Number empty when tax is charged for non-AU/SG countries",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_the_United_Kingdom" } do
      # Modify existing UK purchase to have business_vat_id but with tax charged
      tax_info = PurchaseSalesTaxInfo.new(business_vat_id: "GB123456789")
      @purchase3.update!(purchase_sales_tax_info: tax_info, gumroad_tax_cents_net_of_refunds: 1000)

      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform("GB", start_date, end_date)

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload[0]).to include("Customer Tax Number")
      # Find the row with @purchase3 data and check the last column (Customer Tax Number)
      purchase3_row = actual_payload.find { |row| row[1] == @purchase3.external_id }
      expect(purchase3_row.last).to be_nil
    end

    it "does not include Customer Tax Number column for AU reports",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_Australia" } do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform("AU", start_date, end_date)

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload[0]).not_to include("Customer Tax Number")
      expect(actual_payload[0]).to include("Customer ABN Number")
    end

    it "does not include Customer Tax Number column for SG reports",
       vcr: { cassette_name: "GenerateSalesReportJob/happy_case/creates_a_CSV_file_for_sales_into_Singapore" } do
      expect(s3_bucket_double).to receive(:object).ordered.and_return(@s3_object)

      described_class.new.perform("SG", start_date, end_date)

      temp_file = Tempfile.new("actual-file", encoding: "ascii-8bit")
      @s3_object.get(response_target: temp_file)
      temp_file.rewind
      actual_payload = CSV.read(temp_file)

      expect(actual_payload[0]).not_to include("Customer Tax Number")
      expect(actual_payload[0]).to include("Customer GST Number")
    end
  end

  describe "s3_prefix functionality", :vcr do
    let(:s3_bucket_double) do
      s3_bucket_double = double
      allow(Aws::S3::Resource).to receive_message_chain(:new, :bucket).and_return(s3_bucket_double)
      s3_bucket_double
    end

    before :context do
      @s3_object = Aws::S3::Resource.new.bucket("gumroad-specs").object("specs/international-sales-reporting-spec-#{SecureRandom.hex(18)}.zip")
    end

    before do
      travel_to(Time.zone.local(2015, 1, 1)) do
        product = create(:product, price_cents: 100_00, native_type: "digital")
        @purchase = create(:purchase_in_progress, link: product, country: "United Kingdom")
        @purchase.chargeable = create(:chargeable)
        @purchase.process!
        @purchase.update_balance_and_mark_successful!
      end
    end

    it "uses custom s3_prefix when provided" do
      custom_prefix = "custom/reports"
      expect(s3_bucket_double).to receive(:object) do |key|
        expect(key).to start_with("#{custom_prefix}/sales-tax/gb-sales-quarterly/")
        expect(key).to include("united-kingdom-sales-report-2015-01-01-to-2015-03-31")
        @s3_object
      end

      described_class.new.perform(country_code, start_date, end_date, true, custom_prefix)
    end

    it "handles s3_prefix with trailing slash" do
      custom_prefix = "custom/reports/"
      expect(s3_bucket_double).to receive(:object) do |key|
        expect(key).to start_with("custom/reports/sales-tax/gb-sales-quarterly/")
        expect(key).not_to include("//")
        expect(key).to include("united-kingdom-sales-report-2015-01-01-to-2015-03-31")
        @s3_object
      end

      described_class.new.perform(country_code, start_date, end_date, true, custom_prefix)
    end

    it "uses default path when s3_prefix is nil" do
      expect(s3_bucket_double).to receive(:object) do |key|
        expect(key).to start_with("sales-tax/gb-sales-quarterly/")
        expect(key).to include("united-kingdom-sales-report-2015-01-01-to-2015-03-31")
        @s3_object
      end

      described_class.new.perform(country_code, start_date, end_date, true, nil)
    end

    it "uses default path when s3_prefix is empty string" do
      expect(s3_bucket_double).to receive(:object) do |key|
        expect(key).to start_with("sales-tax/gb-sales-quarterly/")
        expect(key).to include("united-kingdom-sales-report-2015-01-01-to-2015-03-31")
        @s3_object
      end

      described_class.new.perform(country_code, start_date, end_date, true, "")
    end
  end
end
