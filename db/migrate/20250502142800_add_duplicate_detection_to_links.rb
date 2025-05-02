class AddDuplicateDetectionToLinks < ActiveRecord::Migration[7.0]
  def change
    add_column :links, :duplicate_detection_score, :decimal, precision: 5, scale: 2
    add_column :links, :potential_duplicate_of_id, :integer
    add_index :links, :potential_duplicate_of_id
  end
end
