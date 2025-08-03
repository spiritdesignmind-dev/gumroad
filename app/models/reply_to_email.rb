# frozen_string_literal: true

class ReplyToEmail < ApplicationRecord
  belongs_to :user
  has_many :products, class_name: "Link", dependent: :nullify


  validates :email, presence: true, format: URI::MailTo::EMAIL_REGEXP

  def as_json(*)
    {
      id:,
      email:,
      applied_products: products.map do |product|
        {
          id: product.external_id,
          name: product.name,
        }
      end
    }
  end
end
