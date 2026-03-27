-- GloveIQ ingestion pipeline schema (v1.0)
-- Adds durable raw-ingest state around the canonical library tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ingest_run_status'
  ) THEN
    CREATE TYPE ingest_run_status AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'raw_listing_state'
  ) THEN
    CREATE TYPE raw_listing_state AS ENUM ('DISCOVERED', 'FETCHED', 'NORMALIZED', 'LINKED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'image_fetch_status'
  ) THEN
    CREATE TYPE image_fetch_status AS ENUM ('PENDING', 'FETCHED', 'UPLOADED', 'FAILED', 'SKIPPED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  trigger_mode text NOT NULL DEFAULT 'manual',
  run_type text NOT NULL,
  status ingest_run_status NOT NULL DEFAULT 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  initiated_by text,
  cursor_in jsonb NOT NULL DEFAULT '{}'::jsonb,
  cursor_out jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (run_type <> ''),
  CHECK (trigger_mode <> '')
);

CREATE TABLE IF NOT EXISTS source_sync_cursors (
  source_id uuid PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  cursor_key text NOT NULL DEFAULT 'default',
  cursor_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  checkpointed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cursor_key <> '')
);

CREATE TABLE IF NOT EXISTS raw_listing_payloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_run_id uuid REFERENCES ingest_runs(id) ON DELETE SET NULL,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_listing_id text NOT NULL,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  fetched_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  state raw_listing_state NOT NULL DEFAULT 'DISCOVERED',
  dedupe_key text,
  payload_sha256 text NOT NULL,
  listing_url text,
  title text,
  seller_name text,
  condition text,
  price_amount numeric,
  price_currency text,
  available boolean,
  payload jsonb NOT NULL,
  normalization jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason text,
  canonical_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  canonical_glove_id uuid REFERENCES gloves(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_listing_id),
  UNIQUE (payload_sha256)
);

CREATE TABLE IF NOT EXISTS raw_listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_listing_id uuid NOT NULL REFERENCES raw_listing_payloads(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  source_url text NOT NULL,
  source_storage_key text,
  content_type text,
  width integer,
  height integer,
  bytes integer,
  fetch_status image_fetch_status NOT NULL DEFAULT 'PENDING',
  sha256 text,
  b2_bucket text,
  b2_key text,
  canonical_image_id uuid REFERENCES images(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  fetched_at timestamptz,
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raw_listing_id, ordinal),
  UNIQUE (raw_listing_id, source_url),
  CHECK (ordinal >= 0)
);

CREATE TABLE IF NOT EXISTS ingest_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_run_id uuid REFERENCES ingest_runs(id) ON DELETE CASCADE,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  raw_listing_id uuid REFERENCES raw_listing_payloads(id) ON DELETE CASCADE,
  raw_image_id uuid REFERENCES raw_listing_images(id) ON DELETE CASCADE,
  phase text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  code text,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (phase <> ''),
  CHECK (severity IN ('warning', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_source_created ON ingest_runs(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_status_created ON ingest_runs(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_sync_cursors_source_key
  ON source_sync_cursors(source_id, cursor_key);

CREATE INDEX IF NOT EXISTS idx_raw_listing_payloads_run_state
  ON raw_listing_payloads(ingest_run_id, state, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_listing_payloads_source_state
  ON raw_listing_payloads(source_id, state, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_listing_payloads_canonical_listing
  ON raw_listing_payloads(canonical_listing_id);
CREATE INDEX IF NOT EXISTS idx_raw_listing_payloads_canonical_glove
  ON raw_listing_payloads(canonical_glove_id);
CREATE INDEX IF NOT EXISTS idx_raw_listing_payloads_dedupe_key
  ON raw_listing_payloads(dedupe_key);

CREATE INDEX IF NOT EXISTS idx_raw_listing_images_status_created
  ON raw_listing_images(fetch_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_listing_images_canonical_image
  ON raw_listing_images(canonical_image_id);
CREATE INDEX IF NOT EXISTS idx_raw_listing_images_sha256
  ON raw_listing_images(sha256);

CREATE INDEX IF NOT EXISTS idx_ingest_errors_run_created
  ON ingest_errors(ingest_run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_errors_listing_created
  ON ingest_errors(raw_listing_id, created_at DESC);
