# frozen_string_literal: true

FactoryBot.define do
  factory :reply_to_email do
    user { create(:user) }
    email { "contact@example.com" }
  end
end
