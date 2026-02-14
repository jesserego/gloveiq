# GloveIQ Library Mapping (XLSX -> Normalized JSONL)

This mapping is derived from the current workbook and scraper code, not guessed.

Workbook inspected:
- `scrapers/jbg/GloveIQ_Library_Master_Template_GOOGLE_NATIVE_FULLCAT_READY.xlsx`
- Sheets present: `Catalog`, `JBG_Full_Catalog`, `JBG_Detail_Enrichment`

## Stable primary key
- `listing_pk = "{source}:{source_listing_id}"`
- Source IDs:
  - SS: `Catalog.listing_id`
  - JBG: `JBG_Detail_Enrichment.product_id`

## Source -> normalized fields

### SidelineSwap (`Catalog`)
- `source`: constant `SS`
- `source_listing_id`: `listing_id`
- `url`: `product_url`
- `title`: `title` fallback `normalized_json.norm.title`
- `brand`: `brand` fallback title brand inference; else `Unknown`
- `model`: `model` fallback title pattern extraction (`[Model: ...]`/trailing code); else `Unknown`
- `model_code`: same as `model`
- `size_in`: `normalized_json.norm.size_in`
- `throw_hand`: `normalized_json.norm.throw_hand` normalized to `RHT/LHT/UNK`
- `position`: `normalized_json.norm.position` normalized (`IF/OF/C/1B/P/MI/Utility` where possible)
- `web_type`: `normalized_json.norm.web` else `Unknown`
- `sport`: inferred from title/profile text (`softball` if detected else `baseball`)
- `condition`: `condition` else `Unknown`
- `price`: `price`
- `currency`: `currency` else `USD`
- `raw_specs`: `normalized_json.raw`
- `images`: `images_json` (if present)

### JustBallGloves (`JBG_Full_Catalog` + `JBG_Detail_Enrichment`)
- `source`: `JBG_Full_Catalog.source` fallback `JBG`
- `source_listing_id`: `JBG_Detail_Enrichment.product_id`
- `url`: `JBG_Detail_Enrichment.product_url` fallback `JBG_Full_Catalog.product_url`
- `title`: `JBG_Detail_Enrichment.title` fallback `JBG_Full_Catalog.catalog_title`
- `brand`: inferred from title; else `Unknown`
- `model_code`: `model_code` fallback title extraction
- `model`: `model_code` fallback title extraction; else `Unknown`
- `size_in`: inferred from `glove_profile_json` size-like keys, fallback title size parse
- `throw_hand`: inferred from throw/hand keys in `glove_profile_json`, normalized
- `position`: inferred from position-like keys in `glove_profile_json`, normalized
- `web_type`: inferred from web-like keys in `glove_profile_json`, else `Unknown`
- `sport`: inferred from title and glove profile text
- `condition`: safe default `New` for JBG catalog listings
- `price`: `JBG_Detail_Enrichment.price` fallback `JBG_Full_Catalog.catalog_price`
- `currency`: `USD`
- `created_at`: `catalog_scraped_at`
- `seen_at`: `detail_scraped_at`
- `raw_specs`: `{ glove_profile, spec_json }`
- `images`: `images_json`

## Ambiguities and safe defaults
- Workbook currently has no `SS_Detail_Enrichment` sheet; SS detail data is in `Catalog.normalized_json` only.
- Raw HTML is not persisted by current scrapers; importer sets `raw_html = null` and stores available raw text (`title` or `description_snippet`) in `raw_text`.
- Missing brand/model/spec fields are intentionally set to `Unknown` or `UNK` instead of guessed values.
- JBG image arrays include non-product assets (logos/icons/social images) because scraper currently captures all page images. Importer preserves them to avoid lossy assumptions.

## Media manifest key scheme
Generated manifest uses deterministic future B2 keys:
- `{prefix}/{source}/{listing_id}/{image_index:02d}_{sha1(image_url)[:10]}{ext}`
- `prefix` defaults to `B2_PREFIX` env var or `gloveiq`

This matches `b2_ingest_images.py` dry-run deterministic behavior and supports idempotent uploads later.
