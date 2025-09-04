# frozen_string_literal: true

require "spec_helper"

describe UrlRedirectsController, "download improvements" do
  let(:seller) { create(:named_seller) }
  let(:product) { create(:product, user: seller) }
  let(:purchase) { create(:purchase, link: product, seller: seller) }
  let(:url_redirect) { create(:url_redirect, purchase: purchase) }
  let(:pdf_file) { create(:pdf_product_file, link: product, pdf_stamp_enabled: true) }

  before do
    Rails.cache.clear
  end

  describe "GET download_product_files with PDF stamping" do
    context "when files need PDF stamping" do
      before do
        allow(PdfStampingService).to receive(:files_need_stamping?).and_return(true)
        allow(PdfStampingService).to receive(:stamping_in_progress?).and_return(false)
        allow(PdfStampingService).to receive(:mark_stamping_in_progress!)
        allow(StampPdfForPurchaseJob).to receive(:perform_async)
      end

      context "with JSON request" do
        it "returns processing response and enqueues job" do
          get :download_product_files, params: { id: url_redirect.token, product_file_ids: [pdf_file.external_id] }, format: :json

          expect(response).to have_http_status(:success)
          json_response = JSON.parse(response.body)
          expect(json_response["success"]).to be false
          expect(json_response["processing"]).to be true
          expect(json_response["message"]).to include("processing your PDF files")
          expect(StampPdfForPurchaseJob).to have_received(:perform_async).with(purchase.id, true)
        end
      end

      context "with HTML request" do
        it "redirects with flash message and enqueues job" do
          get :download_product_files, params: { id: url_redirect.token, product_file_ids: [pdf_file.external_id] }

          expect(response).to redirect_to(url_redirect.download_page_url)
          expect(flash[:info]).to include("processing your PDF files")
          expect(StampPdfForPurchaseJob).to have_received(:perform_async).with(purchase.id, true)
        end
      end
    end

    context "when stamping is already in progress" do
      before do
        allow(PdfStampingService).to receive(:files_need_stamping?).and_return(true)
        allow(PdfStampingService).to receive(:stamping_in_progress?).and_return(true)
      end

      it "returns appropriate response for JSON" do
        get :download_product_files, params: { id: url_redirect.token, product_file_ids: [pdf_file.external_id] }, format: :json

        json_response = JSON.parse(response.body)
        expect(json_response["processing"]).to be true
        expect(json_response["message"]).to include("currently being processed")
      end
    end
  end

  describe "GET download_page" do
    it "does not trigger PDF stamping on page load" do
      expect_any_instance_of(UrlRedirect).not_to receive(:enqueue_job_to_regenerate_deleted_stamped_pdfs)

      get :download_page, params: { id: url_redirect.token }

      expect(response).to be_successful
    end
  end
end
