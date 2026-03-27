# GloveIQ (fresh structured export)

## Quick start
```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

Hosted dev target:

- Web: `https://dev.gloveiq.info`
- API: `https://api.dev.gloveiq.info`

Hosted env files:

- API template: `apps/api/.env.hosted.example`
- Web template: `apps/web/.env.hosted.example`

## Repo layout
- `apps/web` — Vite + React + TypeScript (Material UI desktop dashboard)
- `apps/api` — Express + TypeScript (mock API + upload endpoint + smart cache)
- `packages/shared` — shared types + enums + schemas
- `docs` — product + taxonomy docs
- `ai/dataset` — schema + example jsonl

## Cost controls included
- **Request cache** for artifact lookups (TTL 60s)
- **Photo dedupe hash** on upload (SHA-256, TTL 24h)
- Shared types ensure the UI/API stay aligned

## Library Import (XLSX -> GloveIQ data exports)
Run these from repo root:

```bash
source scrapers/jbg/.venv/bin/activate
python scrapers/jbg/validate_library_xlsx.py \
  --xlsx scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx

python scrapers/jbg/library_import.py \
  --xlsx scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx \
  --out-dir data_exports

python scrapers/jbg/qa_regression_check.py \
  --xlsx scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx
```

Or run in one pass with the orchestrator:

```bash
source scrapers/jbg/.venv/bin/activate
python scrapers/jbg/run_gloveiq_pipeline.py \
  --xlsx scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx \
  --out-dir data_exports \
  --library-only
```
# Library Build Spec Implementation

GloveIQ Library implementation adds:
- Postgres migration: `apps/api/db/migrations/0001_gloveiq_library.sql`
- Ingestion pipeline migration: `apps/api/db/migrations/0002_gloveiq_ingestion.sql`
- Idempotent XLSX ingestion: `scrapers/jbg/library_import.py`
- Pipeline orchestration: `scrapers/jbg/run_gloveiq_pipeline.py`
- Library APIs:
  - `GET /api/library/search?q=`
  - `GET /api/library/gloves/:id`
  - `GET /api/library/listings/:id`

## End-to-end from repo root

1. Validate workbook:
`npm --workspace apps/api run library:validate -- --xlsx scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx`

2. Ingest and export deterministic artifacts:
`npm --workspace apps/api run library:ingest -- --xlsx scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx --out-dir data_exports`

3. Start API:
`npm --workspace apps/api run dev`

4. Outputs:
- `data_exports/listings.normalized.jsonl`
- `data_exports/listings.raw.jsonl`
- `data_exports/media_manifest.jsonl`
- `data_exports/import_report.json`

## DB-native ingestion schema

The library database is now split into two layers:

- Canonical library tables in `apps/api/db/migrations/0001_gloveiq_library.sql`
- Raw ingestion and pipeline-control tables in `apps/api/db/migrations/0002_gloveiq_ingestion.sql`

The second migration adds durable raw-ingest state for source pulls, cursor checkpoints, raw listing payloads, raw image manifests, and structured ingest errors. That gives us a proper place to persist eBay API pulls and scraper results before normalization and B2 upload.

## Supabase + Backblaze setup

For hosted development, configure:

- `DATABASE_URL` to the active Postgres connection string used by Prisma at runtime
- `DIRECT_DATABASE_URL` to the direct Postgres connection string used by Prisma migrations
- `SUPABASE_DB_URL` to your Supabase Postgres connection string
- `SUPABASE_PROJECT_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for future Supabase-backed services
- `PUBLIC_BASE_URL=https://api.dev.gloveiq.info`
- `WEB_APP_URL=https://dev.gloveiq.info`
- `ALLOWED_ORIGINS=https://dev.gloveiq.info`

For Backblaze B2, configure:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_NAME`
- `B2_BUCKET_ID`
- `B2_ENDPOINT=https://api.backblazeb2.com` for the native B2 API used by the current upload helper
- `B2_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com` for S3-compatible tooling and future worker support
- optional `B2_PUBLIC_BASE_URL` if public delivery is intentional
- or `B2_SIGNING_BASE_URL` + `B2_SIGNING_SECRET` for signed media delivery

The API now exposes `GET /api/system/config` to show configuration readiness without exposing secret values.

To deploy the schema to hosted Postgres/Supabase from `apps/api`:

```bash
npm run db:deploy
```

That applies both:

- Prisma-managed migrations in `apps/api/prisma/migrations`
- Raw SQL library/ingestion migrations in `apps/api/db/migrations`

To ingest the current library export artifacts into the database from `apps/api`:

```bash
npm run library:ingest:db
```

That loads:

- canonical library tables (`brands`, `sources`, `gloves`, `glove_specs_normalized`, `listings`, `listing_specs_raw`, `images`, `listing_glove_links`)
- raw ingest audit tables (`ingest_runs`, `raw_listing_payloads`, `raw_listing_images`)

To sync eBay marketplace data into the database from `apps/api`:

```bash
npm run ebay:sync
```

The eBay sync path supports:

- `EBAY_ENV=production|sandbox`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- optional `EBAY_APP_ID` for Finding API / sold-completed mode
- `EBAY_SYNC_QUERY`
- `EBAY_SYNC_PER_MARKET`
- `EBAY_SYNC_PAGES`
- `EBAY_SYNC_GLOBAL_IDS`
- `EBAY_SYNC_MODE=active|sold`

Recommended multi-region value:

- `EBAY_SYNC_GLOBAL_IDS=EBAY-US,EBAY-JP,EBAY-GB,EBAY-DE,EBAY-AU,EBAY-CA,EBAY-FR,EBAY-IT,EBAY-ES`

It writes marketplace data into:

- `raw_listing_payloads`
- `raw_listing_images`
- `listings`
- `listing_specs_raw`
- `listing_glove_links` when a best-effort catalog match is found

Sandbox keys are useful for verifying the integration flow, but they may return little or no live inventory. Real market population requires production eBay access.

Suggested hosted environment values:

```env
# apps/api/.env
PORT=8787
PUBLIC_BASE_URL=https://api.dev.gloveiq.info
WEB_APP_URL=https://dev.gloveiq.info
ALLOWED_ORIGINS=https://dev.gloveiq.info
DIRECT_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.pdvxcbkdzpnofirdlbix.supabase.co:5432/postgres
SUPABASE_PROJECT_URL=https://pdvxcbkdzpnofirdlbix.supabase.co
B2_BUCKET_ID=0f61423c1cee579a9ecb0a15
B2_ENDPOINT=https://api.backblazeb2.com
B2_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_SIGNING_BASE_URL=https://api.dev.gloveiq.info

# apps/web/.env
VITE_API_BASE=https://api.dev.gloveiq.info
```

## Render deploy

This repo now includes a root-level [render.yaml](/Users/jesserego/Documents/GitHub/gloveiq/render.yaml) blueprint for deploying the API service from the monorepo root.

Recommended Render setup:

1. Create a Render `Web Service` from this GitHub repo.
2. Keep the service rooted at the repo root so workspace packages remain available.
3. Render will use:
   - build command: `npm install && npm run build:api`
   - start command: `npm run start:api`
4. Add your API env vars in Render, especially:
   - `PUBLIC_BASE_URL=https://api.dev.gloveiq.info`
   - `WEB_APP_URL=https://dev.gloveiq.info`
   - `ALLOWED_ORIGINS=https://dev.gloveiq.info`
   - database, Supabase, Backblaze, OpenAI, and eBay secrets
5. In Render, add the custom domain `api.dev.gloveiq.info`
6. In GoDaddy DNS, point:
   - `Type`: `CNAME`
   - `Name`: `api.dev`
   - `Value`: the Render-provided hostname
   - `TTL`: default / 1 hour

Now that the custom domain is active, eBay webhook validation should use:

- endpoint: `https://api.dev.gloveiq.info/api/integrations/ebay/notifications`
- verification token: `gloveanalytics_gloveanalytics_2026`

## Private B2 image handling

Set one of:
- `B2_SIGNING_BASE_URL` (+ optional `B2_SIGNING_SECRET`) for signed media-key URLs
- or `B2_PUBLIC_BASE_URL` if a public gateway is intentionally used

The API will emit signed/proxied media URLs and does not mutate source truth records.

## Data Contract Governance

Contract and boundary docs:

- `docs/contracts/CONTRACTS.md`
- `docs/contracts/OWNERSHIP.md`
- `docs/contracts/MIGRATION_POLICY.md`
- `docs/contracts/scraper_payload.schema.v1.json`

Run contract checks locally:

```bash
npm --workspace apps/api run contract:check
npm --workspace apps/api run test:contracts
```

## Optional live eBay sales on Home tab

To enable live global eBay sales pull in `GET /sales?live=1`, set one of:

- `EBAY_APP_ID` (Finding API path), or
- `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` (OAuth Browse API path)

Without these env vars, Home sales fall back to seeded sales data.
