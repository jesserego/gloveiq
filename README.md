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
