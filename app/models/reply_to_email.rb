# frozen_string_literal: true

class ReplyToEmail < ApplicationRecord
  belongs_to :user
  has_many :products, class_name: "Link", dependent: :nullify

  validates :email, presence: true, format: URI::MailTo::EMAIL_REGEXP, uniqueness: { scope: :user_id }

  def as_json(*)
    {
      id:,
      email:,
      applied_products: products.map { |product| product.external_id }
    }
  end
end
