puts 'Testing fee calculation logic...'

test_cases = [
  { description: "Gumroad merchant account with tier pricing", 
    conditions: "charged_using_gumroad_merchant_account? && seller.tier_pricing_enabled?" },
  { description: "Gumroad merchant account with flat fee", 
    conditions: "charged_using_gumroad_merchant_account? && flat_fee_applicable?" },
  { description: "Stripe Connect account", 
    conditions: "charged_using_stripe_connect_account?" },
  { description: "PayPal Connect account", 
    conditions: "charged_using_paypal_connect_account?" },
  { description: "Purchase with discover fees", 
    conditions: "was_discover_fee_charged?" }
]

Purchase.joins(:link).includes(:seller, :subscription).limit(20).each do |purchase|
  service = Exports::PurchaseExportService.new([purchase])
  gumroad = service.send(:calculate_gumroad_fee_dollars, purchase)
  stripe = service.send(:calculate_stripe_fee_dollars, purchase)
  paypal = service.send(:calculate_paypal_fee_dollars, purchase)
  total_calculated = gumroad + stripe + paypal
  actual_total = purchase.fee_dollars
  difference = (total_calculated - actual_total).abs
  
  if difference > 0.01
    puts "❌ Purchase #{purchase.id}: G=#{gumroad}, S=#{stripe}, P=#{paypal}, " \
         "Total=#{total_calculated}, Actual=#{actual_total}, Diff=#{difference}"
    puts "   Tier pricing: #{purchase.seller.tier_pricing_enabled?}, " \
         "Discover fee: #{purchase.send(:was_discover_fee_charged?)}, " \
         "Merchant: #{purchase.charged_using_gumroad_merchant_account?}"
  else
    puts "✅ Purchase #{purchase.id}: Fee breakdown correct (diff: #{difference})"
  end
end
