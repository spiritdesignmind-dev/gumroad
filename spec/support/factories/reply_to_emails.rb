# frozen_string_literal: true

FactoryBot.define do
  factory :reply_to_email do
    user { create(:user) }
    email { Faker::Internet.email }
  end
end
