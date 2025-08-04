# frozen_string_literal: true

class AddReplyToEmailToLinks < ActiveRecord::Migration[7.1]
  def change
    add_reference :links, :reply_to_email, foreign_key: { on_delete: :nullify }
  end
end
