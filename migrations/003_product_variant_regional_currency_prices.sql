-- Optional regional prices for each product size/type.
-- Existing storefront price remains unchanged and continues to be used by current checkout.
ALTER TABLE tolip_product_variants
  ADD COLUMN IF NOT EXISTS price_sar numeric(12,2),
  ADD COLUMN IF NOT EXISTS price_yer_south numeric(12,2),
  ADD COLUMN IF NOT EXISTS price_yer_north numeric(12,2);

INSERT INTO tolip_schema_migrations (version, name)
VALUES (3, 'product-variant-regional-currency-prices')
ON CONFLICT (version) DO NOTHING;
