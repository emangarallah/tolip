-- Tolip normalized relational store schema (PostgreSQL 17+)
-- Version 1. The legacy tolip_store_state row is intentionally retained as a
-- migration/rollback snapshot and is not dropped by this migration.

CREATE TABLE IF NOT EXISTS tolip_schema_migrations (
  version integer PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tolip_admin_users (
  id text PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  salt text NOT NULL,
  session_version text,
  bootstrap_completed boolean NOT NULL DEFAULT false,
  name text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tolip_admin_users_email_lower_uidx
  ON tolip_admin_users (lower(email));

CREATE TABLE IF NOT EXISTS tolip_store_settings (
  id smallint PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tolip_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tolip_categories_active_sort_idx
  ON tolip_categories (is_active, sort_order, id);

CREATE TABLE IF NOT EXISTS tolip_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_id text REFERENCES tolip_categories(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_instructions text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tolip_products_category_created_idx
  ON tolip_products (category_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tolip_products_active_created_idx
  ON tolip_products (created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS tolip_products_featured_created_idx
  ON tolip_products (created_at DESC)
  WHERE is_active = true AND is_featured = true;

CREATE INDEX IF NOT EXISTS tolip_products_best_seller_created_idx
  ON tolip_products (created_at DESC)
  WHERE is_active = true AND is_best_seller = true;

CREATE TABLE IF NOT EXISTS tolip_product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES tolip_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2),
  original_price numeric(12,2),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku text
);

CREATE INDEX IF NOT EXISTS tolip_product_variants_product_idx
  ON tolip_product_variants (product_id);

CREATE TABLE IF NOT EXISTS tolip_offers (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('percentage', 'fixed', 'bundle', 'buy_get')),
  value numeric(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  bundle_price numeric(12,2),
  buy_quantity integer NOT NULL DEFAULT 1 CHECK (buy_quantity > 0),
  get_quantity integer NOT NULL DEFAULT 1 CHECK (get_quantity > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS tolip_offers_active_window_idx
  ON tolip_offers (is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS tolip_offer_products (
  offer_id text NOT NULL REFERENCES tolip_offers(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES tolip_products(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, product_id)
);

CREATE INDEX IF NOT EXISTS tolip_offer_products_product_idx
  ON tolip_offer_products (product_id, offer_id);

CREATE TABLE IF NOT EXISTS tolip_orders (
  id text PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_details jsonb NOT NULL,
  items_total numeric(12,2),
  delivery_fee numeric(12,2),
  delivery_fee_note text,
  final_total numeric(12,2),
  status text NOT NULL CHECK (status IN ('new', 'awaiting_whatsapp_confirmation', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled')),
  whatsapp_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tolip_orders_status_created_idx
  ON tolip_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS tolip_orders_created_idx
  ON tolip_orders (created_at DESC);

CREATE TABLE IF NOT EXISTS tolip_order_items (
  order_id text NOT NULL REFERENCES tolip_orders(id) ON DELETE CASCADE,
  line_number integer NOT NULL CHECK (line_number > 0),
  product_id text NOT NULL,
  product_name text NOT NULL,
  variant_id text NOT NULL,
  variant_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2),
  total_price numeric(12,2),
  image text,
  PRIMARY KEY (order_id, line_number)
);

CREATE INDEX IF NOT EXISTS tolip_order_items_product_idx
  ON tolip_order_items (product_id);

INSERT INTO tolip_admin_users (id, email, password_hash, salt, session_version, bootstrap_completed, name)
SELECT
  payload->'adminUser'->>'id',
  payload->'adminUser'->>'email',
  payload->'adminUser'->>'passwordHash',
  payload->'adminUser'->>'salt',
  payload->'adminUser'->>'sessionVersion',
  COALESCE((payload->'adminUser'->>'bootstrapCompleted')::boolean, false),
  payload->'adminUser'->>'name'
FROM tolip_store_state
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_store_settings (id, payload, updated_at)
SELECT 1, payload->'settings', now()
FROM tolip_store_state
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_categories (id, name, slug, description, image, sort_order, is_active, created_at)
SELECT
  c.id, c.name, c.slug, COALESCE(c.description, ''), COALESCE(c.image, ''),
  COALESCE(c."sortOrder", 0), COALESCE(c."isActive", true), COALESCE(c."createdAt", now())
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'categories') AS c(
  id text, name text, slug text, description text, image text,
  "sortOrder" integer, "isActive" boolean, "createdAt" timestamptz
)
WHERE s.id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_products (
  id, name, slug, category_id, description, features, usage_instructions, images,
  is_featured, is_best_seller, is_active, in_stock, created_at, updated_at
)
SELECT
  p.id, p.name, p.slug, p."categoryId", COALESCE(p.description, ''),
  COALESCE(p.features, '[]'::jsonb), COALESCE(p."usageInstructions", ''),
  COALESCE(p.images, '[]'::jsonb), COALESCE(p."isFeatured", false),
  COALESCE(p."isBestSeller", false), COALESCE(p."isActive", true),
  COALESCE(p."inStock", true), COALESCE(p."createdAt", now()), COALESCE(p."updatedAt", now())
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'products') AS p(
  id text, name text, slug text, "categoryId" text, description text,
  features jsonb, "usageInstructions" text, images jsonb,
  "isFeatured" boolean, "isBestSeller" boolean, "isActive" boolean,
  "inStock" boolean, "createdAt" timestamptz, "updatedAt" timestamptz
)
WHERE s.id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_product_variants (id, product_id, name, price, original_price, stock, sku)
SELECT
  v.id, p.id, v.name, v.price, v."originalPrice", COALESCE(v.stock, 0), v.sku
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'products') AS p(
  id text, variants jsonb
)
CROSS JOIN LATERAL jsonb_to_recordset(p.variants) AS v(
  id text, name text, price numeric, "originalPrice" numeric, stock integer, sku text
)
WHERE s.id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_offers (
  id, title, description, image, type, value, bundle_price, buy_quantity,
  get_quantity, starts_at, ends_at, is_active, created_at, updated_at
)
SELECT
  o.id, o.title, COALESCE(o.description, ''), COALESCE(o.image, ''),
  o.type, COALESCE(o.value, 0), o."bundlePrice",
  COALESCE(o."buyQuantity", 1), COALESCE(o."getQuantity", 1),
  o."startsAt", o."endsAt", COALESCE(o."isActive", true),
  COALESCE(o."createdAt", now()), COALESCE(o."updatedAt", now())
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'offers') AS o(
  id text, title text, description text, image text, type text, value numeric,
  "bundlePrice" numeric, "buyQuantity" integer, "getQuantity" integer,
  "startsAt" timestamptz, "endsAt" timestamptz,
  "isActive" boolean, "createdAt" timestamptz, "updatedAt" timestamptz
)
WHERE s.id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_offer_products (offer_id, product_id)
SELECT o.id, x.product_id
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'offers') AS o(
  id text, "productIds" jsonb
)
CROSS JOIN LATERAL jsonb_array_elements_text(o."productIds") AS x(product_id)
WHERE s.id = 1
ON CONFLICT (offer_id, product_id) DO NOTHING;

INSERT INTO tolip_orders (
  id, order_number, customer_details, items_total, delivery_fee,
  delivery_fee_note, final_total, status, whatsapp_message, created_at, updated_at
)
SELECT
  o.id, o."orderNumber", o."customerDetails", o."itemsTotal", o."deliveryFee",
  o."deliveryFeeNote", o."finalTotal", o.status, COALESCE(o."whatsappMessage", ''),
  COALESCE(o."createdAt", now()), COALESCE(o."updatedAt", now())
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'orders') AS o(
  id text, "orderNumber" text, "customerDetails" jsonb,
  "itemsTotal" numeric, "deliveryFee" numeric, "deliveryFeeNote" text,
  "finalTotal" numeric, status text, "whatsappMessage" text,
  "createdAt" timestamptz, "updatedAt" timestamptz, items jsonb
)
WHERE s.id = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO tolip_order_items (
  order_id, line_number, product_id, product_name, variant_id, variant_name,
  quantity, unit_price, total_price, image
)
SELECT
  o.id, item.ordinality::integer, item.value->>'productId',
  item.value->>'productName', item.value->>'variantId',
  item.value->>'variantName', (item.value->>'quantity')::integer,
  NULLIF(item.value->>'unitPrice', '')::numeric,
  NULLIF(item.value->>'totalPrice', '')::numeric,
  item.value->>'image'
FROM tolip_store_state s
CROSS JOIN LATERAL jsonb_to_recordset(s.payload->'orders') AS o(
  id text, items jsonb
)
CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS item(value, ordinality)
WHERE s.id = 1
ON CONFLICT (order_id, line_number) DO NOTHING;

INSERT INTO tolip_schema_migrations (version, name)
VALUES (1, 'normalized-relational-store')
ON CONFLICT (version) DO NOTHING;
