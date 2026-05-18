export const schemaDdl = `
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  region_id TEXT,
  sales_channel_id TEXT,
  email TEXT,
  currency_code TEXT NOT NULL,
  locale TEXT,
  metadata JSONB,
  completed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,

  shipping_customer_id TEXT,
  shipping_company TEXT,
  shipping_first_name TEXT,
  shipping_last_name TEXT,
  shipping_address1 TEXT,
  shipping_address2 TEXT,
  shipping_city TEXT,
  shipping_country_code TEXT,
  shipping_province TEXT,
  shipping_postal_code TEXT,
  shipping_phone TEXT,
  shipping_metadata JSONB,
  shipping_address_present BOOLEAN NOT NULL DEFAULT FALSE,

  billing_customer_id TEXT,
  billing_company TEXT,
  billing_first_name TEXT,
  billing_last_name TEXT,
  billing_address1 TEXT,
  billing_address2 TEXT,
  billing_city TEXT,
  billing_country_code TEXT,
  billing_province TEXT,
  billing_postal_code TEXT,
  billing_phone TEXT,
  billing_metadata JSONB,
  billing_address_present BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_line_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  thumbnail TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DOUBLE PRECISION NOT NULL CHECK (unit_price >= 0),
  compare_at_unit_price DOUBLE PRECISION,
  variant_id TEXT,
  product_id TEXT,
  product_title TEXT,
  product_description TEXT,
  product_subtitle TEXT,
  product_type TEXT,
  product_type_id TEXT,
  product_collection TEXT,
  product_handle TEXT,
  variant_sku TEXT,
  variant_barcode TEXT,
  variant_title TEXT,
  variant_option_values JSONB,
  requires_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  is_discountable BOOLEAN NOT NULL DEFAULT TRUE,
  is_giftcard BOOLEAN NOT NULL DEFAULT FALSE,
  is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom_price BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_shipping_methods (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description JSONB,
  amount DOUBLE PRECISION NOT NULL CHECK (amount >= 0),
  is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  shipping_option_id TEXT,
  data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_credit_lines (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  raw_amount JSONB NOT NULL,
  reference TEXT,
  reference_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS line_item_adjustments (
  id TEXT PRIMARY KEY,
  line_item_id TEXT NOT NULL REFERENCES cart_line_items(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL CHECK (amount >= 0),
  code TEXT,
  description TEXT,
  promotion_id TEXT,
  provider_id TEXT,
  is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS line_item_tax_lines (
  id TEXT PRIMARY KEY,
  line_item_id TEXT NOT NULL REFERENCES cart_line_items(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  description TEXT,
  tax_rate_id TEXT,
  provider_id TEXT,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS shipping_method_adjustments (
  id TEXT PRIMARY KEY,
  shipping_method_id TEXT NOT NULL REFERENCES cart_shipping_methods(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL CHECK (amount >= 0),
  code TEXT,
  description TEXT,
  promotion_id TEXT,
  provider_id TEXT,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS shipping_method_tax_lines (
  id TEXT PRIMARY KEY,
  shipping_method_id TEXT NOT NULL REFERENCES cart_shipping_methods(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  description TEXT,
  tax_rate_id TEXT,
  provider_id TEXT,
  metadata JSONB
);
`
