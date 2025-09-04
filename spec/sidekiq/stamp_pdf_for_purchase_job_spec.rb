# frozen_string_literal: true

require "spec_helper"

describe StampPdfForPurchaseJob do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, link: product, seller: seller) }
  let(:mail_double) { double }

  before do
    allow(PdfStampingService).to receive(:stamp_for_purchase!)
    allow(mail_double).to receive(:deliver_now)
    Rails.cache.clear
  end

  context "without notification" do
    it "performs the job" do
      described_class.new.perform(purchase.id)
      expect(PdfStampingService).to have_received(:stamp_for_purchase!).with(purchase)
    end

    context "when stamping fails" do
      before do
        allow(PdfStampingService).to receive(:stamp_for_purchase!).and_raise(PdfStampingService::Error)
      end

      it "logs and doesn't raise an error" do
        expect(Rails.logger).to receive(:error).with(/Failed stamping for purchase #{purchase.id}:/)
        expect { described_class.new.perform(purchase.id) }.not_to raise_error
      end
    end
  end

  context "with notification enabled" do
    before do
      purchase.create_url_redirect!
      Rails.cache.write("pdf_stamping_in_progress_#{purchase.id}", true, expires_in: 30.minutes)
    end

    it "stamps PDFs and sends notification" do
      expect(CustomerMailer).to receive(:receipt).with(purchase.id).and_return(mail_double)

      described_class.new.perform(purchase.id, true)

      expect(PdfStampingService).to have_received(:stamp_for_purchase!).with(purchase)
      expect(mail_double).to have_received(:deliver_now)
      expect(Rails.cache.exist?("pdf_stamping_in_progress_#{purchase.id}")).to be false
    end

    context "when stamping fails" do
      before do
        allow(PdfStampingService).to receive(:stamp_for_purchase!).and_raise(PdfStampingService::Error)
      end

      it "clears progress flag and re-raises error" do
        expect do
          described_class.new.perform(purchase.id, true)
        end.to raise_error(PdfStampingService::Error)

        expect(Rails.cache.exist?("pdf_stamping_in_progress_#{purchase.id}")).to be false
      end
    end
  end
end
