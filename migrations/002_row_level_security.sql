-- Tolip Row Level Security and server-side rate limiting.
-- The API must connect as tolip_runtime (NO BYPASSRLS), never as tolip_admin.
-- The Express API sets transaction-local app.* claims only after validating the request.
-- Public shoppers can read published catalog/settings, create a checkout order,
-- and retrieve only an order matching their order number + phone pair.

CREATE TABLE IF NOT EXISTS tolip_security_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tolip_security_rate_limits_window_idx
  ON tolip_security_rate_limits (window_started_at);

GRANT USAGE ON SCHEMA public TO tolip_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tolip_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON tolip_security_rate_limits TO tolip_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE tolip_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tolip_runtime;

-- Enable and force RLS on every application and legacy table.
ALTER TABLE tolip_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_store_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_products FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_product_variants FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_offers FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_offer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_offer_products FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_schema_migrations FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_store_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_store_state FORCE ROW LEVEL SECURITY;
ALTER TABLE tolip_security_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolip_security_rate_limits FORCE ROW LEVEL SECURITY;

-- Remove any prior policies so this migration can be reapplied safely.
DROP POLICY IF EXISTS tolip_admin_users_read ON tolip_admin_users;
DROP POLICY IF EXISTS tolip_admin_users_write ON tolip_admin_users;
DROP POLICY IF EXISTS tolip_settings_read ON tolip_store_settings;
DROP POLICY IF EXISTS tolip_settings_admin_write ON tolip_store_settings;
DROP POLICY IF EXISTS tolip_categories_read ON tolip_categories;
DROP POLICY IF EXISTS tolip_categories_admin_write ON tolip_categories;
DROP POLICY IF EXISTS tolip_products_read ON tolip_products;
DROP POLICY IF EXISTS tolip_products_admin_write ON tolip_products;
DROP POLICY IF EXISTS tolip_variants_read ON tolip_product_variants;
DROP POLICY IF EXISTS tolip_variants_admin_write ON tolip_product_variants;
DROP POLICY IF EXISTS tolip_offers_read ON tolip_offers;
DROP POLICY IF EXISTS tolip_offers_admin_write ON tolip_offers;
DROP POLICY IF EXISTS tolip_offer_products_read ON tolip_offer_products;
DROP POLICY IF EXISTS tolip_offer_products_admin_write ON tolip_offer_products;
DROP POLICY IF EXISTS tolip_orders_read ON tolip_orders;
DROP POLICY IF EXISTS tolip_orders_public_insert ON tolip_orders;
DROP POLICY IF EXISTS tolip_orders_admin_write ON tolip_orders;
DROP POLICY IF EXISTS tolip_order_items_read ON tolip_order_items;
DROP POLICY IF EXISTS tolip_order_items_public_insert ON tolip_order_items;
DROP POLICY IF EXISTS tolip_order_items_admin_write ON tolip_order_items;
DROP POLICY IF EXISTS tolip_migrations_read ON tolip_schema_migrations;
DROP POLICY IF EXISTS tolip_migrations_admin_write ON tolip_schema_migrations;
DROP POLICY IF EXISTS tolip_legacy_state_bootstrap ON tolip_store_state;
DROP POLICY IF EXISTS tolip_rate_limits_server_only ON tolip_security_rate_limits;

-- Auth reads are constrained to the single admin candidate or login email.
-- The API verifies the signed session and current session_version before granting admin context.
CREATE POLICY tolip_admin_users_read ON tolip_admin_users
  FOR SELECT
  USING (
    current_setting('app.actor_role', true) IN ('admin', 'bootstrap')
    OR id = NULLIF(current_setting('app.admin_candidate_id', true), '')
    OR lower(email) = lower(NULLIF(current_setting('app.login_email', true), ''))
  );
CREATE POLICY tolip_admin_users_write ON tolip_admin_users
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_settings_read ON tolip_store_settings
  FOR SELECT
  USING (id = 1 AND current_setting('app.actor_role', true) IN ('public', 'admin', 'bootstrap'));
CREATE POLICY tolip_settings_admin_write ON tolip_store_settings
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_categories_read ON tolip_categories
  FOR SELECT
  USING (is_active = true OR current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));
CREATE POLICY tolip_categories_admin_write ON tolip_categories
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_products_read ON tolip_products
  FOR SELECT
  USING (is_active = true OR current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));
CREATE POLICY tolip_products_admin_write ON tolip_products
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_variants_read ON tolip_product_variants
  FOR SELECT
  USING (
    current_setting('app.actor_role', true) IN ('admin', 'bootstrap')
    OR EXISTS (
      SELECT 1 FROM tolip_products p
      WHERE p.id = tolip_product_variants.product_id AND p.is_active = true
    )
  );
CREATE POLICY tolip_variants_admin_write ON tolip_product_variants
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_offers_read ON tolip_offers
  FOR SELECT
  USING (
    current_setting('app.actor_role', true) IN ('admin', 'bootstrap')
    OR (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
    )
  );
CREATE POLICY tolip_offers_admin_write ON tolip_offers
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_offer_products_read ON tolip_offer_products
  FOR SELECT
  USING (
    current_setting('app.actor_role', true) IN ('admin', 'bootstrap')
    OR (
      EXISTS (
        SELECT 1 FROM tolip_offers o
        WHERE o.id = tolip_offer_products.offer_id
          AND o.is_active = true
          AND (o.starts_at IS NULL OR o.starts_at <= now())
          AND (o.ends_at IS NULL OR o.ends_at >= now())
      )
      AND EXISTS (
        SELECT 1 FROM tolip_products p
        WHERE p.id = tolip_offer_products.product_id AND p.is_active = true
      )
    )
  );
CREATE POLICY tolip_offer_products_admin_write ON tolip_offer_products
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

-- Guest customers can only see the specific order for which the API has set
-- both matching identifiers; the tracking route returns a reduced DTO.
CREATE POLICY tolip_orders_read ON tolip_orders
  FOR SELECT
  USING (
    current_setting('app.actor_role', true) IN ('admin', 'bootstrap')
    OR (
      lower(order_number) = lower(COALESCE(current_setting('app.track_order_number', true), ''))
      AND regexp_replace(COALESCE(customer_details->>'phone', ''), '[^0-9]', '', 'g')
          = COALESCE(current_setting('app.track_order_phone', true), '')
      AND COALESCE(current_setting('app.track_order_number', true), '') <> ''
      AND COALESCE(current_setting('app.track_order_phone', true), '') <> ''
    )
  );
CREATE POLICY tolip_orders_public_insert ON tolip_orders
  FOR INSERT
  WITH CHECK (
    current_setting('app.actor_role', true) = 'public'
    AND status = 'awaiting_whatsapp_confirmation'
  );
CREATE POLICY tolip_orders_admin_write ON tolip_orders
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

CREATE POLICY tolip_order_items_read ON tolip_order_items
  FOR SELECT
  USING (
    current_setting('app.actor_role', true) IN ('admin', 'bootstrap')
    OR EXISTS (
      SELECT 1 FROM tolip_orders o WHERE o.id = tolip_order_items.order_id
    )
  );
CREATE POLICY tolip_order_items_public_insert ON tolip_order_items
  FOR INSERT
  WITH CHECK (
    current_setting('app.actor_role', true) = 'public'
    AND order_id = NULLIF(current_setting('app.created_order_id', true), '')
  );
CREATE POLICY tolip_order_items_admin_write ON tolip_order_items
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

-- Migration metadata is not customer data; allow reads, but reserve writes for
-- trusted bootstrap/admin request contexts.
CREATE POLICY tolip_migrations_read ON tolip_schema_migrations
  FOR SELECT USING (true);
CREATE POLICY tolip_migrations_admin_write ON tolip_schema_migrations
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

-- The legacy full-store snapshot contains personal/order/admin data. It is
-- retained for recovery but must not be visible to ordinary API requests.
CREATE POLICY tolip_legacy_state_bootstrap ON tolip_store_state
  FOR ALL
  USING (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'))
  WITH CHECK (current_setting('app.actor_role', true) IN ('admin', 'bootstrap'));

-- The limiter table is reachable only during a server-side rate-limit operation.
CREATE POLICY tolip_rate_limits_server_only ON tolip_security_rate_limits
  FOR ALL
  USING (current_setting('app.rate_limit_access', true) = 'true')
  WITH CHECK (current_setting('app.rate_limit_access', true) = 'true');
