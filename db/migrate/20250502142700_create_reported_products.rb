class CreateReportedProducts < ActiveRecord::Migration[7.0]
  def change
    create_table :reported_products do |t|
      t.string :external_id, null: false
      t.references :reporting_user, foreign_key: { to_table: :users }, null: true
      t.references :reported_product, foreign_key: { to_table: :links }, null: false
      t.references :original_product, foreign_key: { to_table: :links }, null: true
      t.string :reason, null: false
      t.string :state, null: false
      t.text :description
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :reported_products, :external_id, unique: true
  end
end
