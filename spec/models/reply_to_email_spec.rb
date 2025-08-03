# frozen_string_literal: true

require "spec_helper"

describe ReplyToEmail do
  let(:user) { create(:user) }
  let(:reply_to_email) { create(:reply_to_email, user: user) }

  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:links) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:email) }

    context "email format validation" do
      it "accepts valid email addresses" do
        valid_emails = [
          "user@example.com",
          "test.email+tag@domain.co.uk",
          "user123@subdomain.example.org"
        ]

        valid_emails.each do |email|
          reply_to_email = build(:reply_to_email, email: email)
          expect(reply_to_email).to be_valid
        end
      end

      it "rejects invalid email addresses" do
        invalid_emails = [
          "invalid-email",
          "@example.com",
          "user@",
          "user@.com",
          ""
        ]

        invalid_emails.each do |email|
          reply_to_email = build(:reply_to_email, email: email)
          expect(reply_to_email).not_to be_valid
          expect(reply_to_email.errors[:email]).to be_present
        end
      end
    end
  end

  describe "#as_json" do
    let!(:product1) { create(:product, user: user, reply_to_email:) }
    let!(:product2) { create(:product, user: user, reply_to_email:) }

    it "returns the correct JSON structure" do
      result = reply_to_email.as_json

      expect(result).to include(
        id: reply_to_email.id,
        email: reply_to_email.email,
        applied_products: be_an(Array)
      )
    end

    it "includes applied products with correct structure" do
      result = reply_to_email.as_json

      expect(result[:applied_products]).to contain_exactly(
        {
          id: product1.id,
          name: product1.name
        },
        {
          id: product2.id,
          name: product2.name
        }
      )
    end

    it "returns empty applied_products when no links are associated" do
      reply_to_email_without_links = create(:reply_to_email, user: user)
      result = reply_to_email_without_links.as_json

      expect(result[:applied_products]).to eq([])
    end
  end
end
