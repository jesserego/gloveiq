# GloveIQ Scrapers Bundle (SidelineSwap + JustBallGloves + Backblaze Images)

This bundle is meant to be **dropped into** your existing repo and run from the same venv you already use.

## Files included (swap-in)
- `ss_master_scraper.py` (GloveIQ-ready SS scraper)
- `jbg_master_scraper.py` (GloveIQ-ready JBG scraper)
- `b2_ingest_images.py` (uploads per-listing images to a **private** Backblaze B2 bucket; writes B2 keys back into the workbook)
- `run_gloveiq_pipeline.py` (one command to run SS + JBG + B2)
- `requirements.txt`
- `.env.example`

## What Codex receives
Codex should be pointed at the **completed XLSX** that the scrapers write into (you choose location/name).

Codex should read:
- `SS_Catalog` + `SS_Detail_Enrichment`
- `JBG_Full_Catalog` + `JBG_Detail_Enrichment`

Each *Detail* row has:
- `glove_profile_json` (GloveIQ-ready normalized fields)
- `spec_json` (raw-ish scraped specs map)
- `images_json` (source image URLs list)
- `b2_images_json` (after ingest: private Backblaze object keys)

## Quick start (Mac)
From the folder containing these scripts:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

### 1) Run scrapes + enrich + image ingest
```bash
# Copy .env.example to .env and fill values first for B2 step
cp .env.example .env

python run_gloveiq_pipeline.py \
  --xlsx "../jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx" \
  --ss-pages 25 \
  --jbg-pages 25 \
  --details 2000 \
  --delay 1.5 \
  --resume
```

### 2) If you want to do B2 later
```bash
python b2_ingest_images.py \
  --xlsx "../jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx" \
  --resume
```

### 3) Generate GloveIQ Library import artifacts
```bash
python validate_library_xlsx.py \
  --xlsx "../jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx"

python library_import.py \
  --xlsx "../jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx" \
  --out-dir "../../data_exports"

python qa_regression_check.py \
  --xlsx "../jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx"
```

## Notes
- If you Ctrl+C, you can restart with `--resume` on scrapers and B2 ingest.
- Bucket is private: you will store keys, not public URLs.
