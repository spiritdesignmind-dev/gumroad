# frozen_string_literal: true

require "spec_helper"

describe "Admin::AffiliatesController Scenario", type: :system, js: true do
  let(:admin) { create(:admin_user, has_risk_privilege: true) }
  let(:affiliate_user) { create(:affiliate_user) }

  before do
    # Mock the request_from_iffy? method to return false
    allow_any_instance_of(Admin::BaseController).to receive(:request_from_iffy?).and_return(false)

    # Stub the ObfuscateIds module constants since the view uses obfuscated IDs
    stub_const("ObfuscateIds::CIPHER_KEY", "test_cipher_key_32_characters_long")
    stub_const("ObfuscateIds::NUMERIC_CIPHER_KEY", 123456789)

    login_as(admin)
  end

  context "when user has no affiliated products" do
    before do
      create(:direct_affiliate, affiliate_user:)
    end

    it "shows no products alert" do
      visit admin_affiliate_path(affiliate_user)

      # Click on the Products tab to make the content visible
      click_on "Products"

      expect(page).to have_text("No affiliated products.")
    end
  end

  context "when user has affiliated products" do
    before do
      products = []
      %w(a b c).each_with_index do |l, i|
        product = create(:product, unique_permalink: l, name: "Product #{l}", created_at: i.minutes.ago)
        products << product
      end
      create(:direct_affiliate, affiliate_user:, products:)
      stub_const("Admin::UsersController::PRODUCTS_PER_PAGE", 2)
    end

    it "shows products" do
      visit admin_affiliate_path(affiliate_user)

      # Click on the Products tab to make the content visible
      click_on "Products"

      expect(page).to have_text("Product a")
      expect(page).to have_text("Product b")
      expect(page).not_to have_text("Product c")

      within("[aria-label='Pagination']") { click_on("2") }
      expect(page).not_to have_text("Product a")
      expect(page).not_to have_text("Product b")
      expect(page).to have_text("Product c")
      within("[aria-label='Pagination']") { expect(page).to have_link("1") }
    end
  end
end
