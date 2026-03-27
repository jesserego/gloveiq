-- GloveIQ per-glove market summary layer
-- Materializes marketplace rollups onto canonical glove records.

CREATE TABLE IF NOT EXISTS glove_market_summaries (
  glove_id uuid PRIMARY KEY REFERENCES gloves(id) ON DELETE CASCADE,
  listings_count integer NOT NULL DEFAULT 0,
  available_count integer NOT NULL DEFAULT 0,
  sold_count integer NOT NULL DEFAULT 0,
  price_min numeric,
  price_max numeric,
  price_avg numeric,
  current_median numeric,
  p10 numeric,
  p90 numeric,
  last_sale_price numeric,
  last_sale_date timestamptz,
  ma7 numeric,
  ma30 numeric,
  ma90 numeric,
  source_mix jsonb NOT NULL DEFAULT '[]'::jsonb,
  region_mix jsonb NOT NULL DEFAULT '[]'::jsonb,
  affiliate_offers jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glove_market_summaries_computed_at
  ON glove_market_summaries(computed_at DESC);
