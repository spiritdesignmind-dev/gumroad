# frozen_string_literal: true

class AddReplyToEmailToLinks < ActiveRecord::Migration[7.1]
  def change
    change_table :links, bulk: true do |t|
      t.string :reply_to_email, null: true, default: nil
      t.index :reply_to_email
    end
  end
end
