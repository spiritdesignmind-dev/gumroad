# frozen_string_literal: true

class AddCreatorRiskStateToProductsIndex < ActiveRecord::Migration[7.1]
  def up
    EsClient.indices.put_mapping(
      index: Link.index_name,
      body: {
        properties: {
          creator_risk_state: { type: "keyword" },
        }
      }
    )
  end
end
