# frozen_string_literal: true

class LinkReplyToEmail < ApplicationRecord
  belongs_to :link
  belongs_to :reply_to_email
end
