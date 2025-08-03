# frozen_string_literal: true

class CreateReplyToEmails < ActiveRecord::Migration[7.1]
  def change
    create_table :reply_to_emails do |t|
      t.string :email, null: false
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
  end
end
