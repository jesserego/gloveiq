# GloveIQ (fresh structured export)

## Quick start
```bash
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

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

## Private B2 image handling

Set one of:
- `B2_SIGNING_BASE_URL` (+ optional `B2_SIGNING_SECRET`) for signed media-key URLs
- or `B2_PUBLIC_BASE_URL` if a public gateway is intentionally used

The API will emit signed/proxied media URLs and does not mutate source truth records.
