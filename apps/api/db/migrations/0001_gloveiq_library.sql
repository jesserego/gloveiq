-- GloveIQ Library schema (v1.0)
-- Raw data is immutable; normalized data is derived.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  brand_type text NOT NULL,
  country_code text,
  website_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id),
  source_type text NOT NULL,
  name text,
  base_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gloves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL CHECK (record_type IN ('variant','artifact')),
  manufacturer_brand_id uuid REFERENCES brands(id),
  canonical_name text,
  item_number text,
  pattern text,
  series text,
  level text,
  sport text,
  age_group text,
  size_in numeric,
  throwing_hand text,
  market_origin text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glove_specs_normalized (
  glove_id uuid PRIMARY KEY REFERENCES gloves(id),
  back text,
  color text,
  fit text,
  leather text,
  lining text,
  padding text,
  shell text,
  special_feature text,
  usage text,
  used_by text,
  web text,
  wrist text,
  description text,
  confidence jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id),
  external_listing_id text,
  url text,
  title text,
  seller_name text,
  condition text,
  price_amount numeric,
  price_currency text,
  available boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source_id, external_listing_id)
);

CREATE TABLE IF NOT EXISTS listing_specs_raw (
  listing_id uuid REFERENCES listings(id),
  spec_key text,
  spec_value text,
  source_label text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (listing_id, spec_key)
);

CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id),
  glove_id uuid REFERENCES gloves(id),
  role text NOT NULL,
  source_url text,
  b2_bucket text,
  b2_key text,
  sha256 text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Link table used by ingestion step 6 (listing -> glove), preserving source truth.
CREATE TABLE IF NOT EXISTS listing_glove_links (
  listing_id uuid PRIMARY KEY REFERENCES listings(id),
  glove_id uuid NOT NULL REFERENCES gloves(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gloves_record_type ON gloves(record_type);
CREATE INDEX IF NOT EXISTS idx_gloves_canonical_name ON gloves(canonical_name);
CREATE INDEX IF NOT EXISTS idx_listings_external ON listings(external_listing_id);
CREATE INDEX IF NOT EXISTS idx_images_glove_id ON images(glove_id);
