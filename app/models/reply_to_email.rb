# frozen_string_literal: true

class ReplyToEmail < ApplicationRecord
  belongs_to :user
  has_many :links, dependent: :nullify


  validates :email, presence: true, format: URI::MailTo::EMAIL_REGEXP

  def as_json(*)
    {
      id:,
      email:,
      applied_products: links.map do |link|
        {
          id: link.id,
          name: link.name,
        }
      end
    }
  end
end
