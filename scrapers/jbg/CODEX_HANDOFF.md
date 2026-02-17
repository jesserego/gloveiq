# Codex handoff: Build GloveIQ Library from XLSX

You are Codex. Build the **GloveIQ Library** ingestion + UI layer using the completed XLSX produced by the scrapers.

## Input
A single XLSX workbook with these sheets:
- SS_Catalog
- SS_Detail_Enrichment
- JBG_Full_Catalog
- JBG_Detail_Enrichment

## Required behavior
1) Parse each Detail sheet row by row.
2) Treat `source` + `source_listing_id` as the unique listing key.
3) Read `glove_profile_json` as the normalized GloveIQ-ready object. If missing, derive best-effort from `spec_json` + `title` + `description` BUT mark fields as unknown if not provable.
4) Store images using `b2_images_json`:
   - Each entry includes `b2_key` for a PRIVATE Backblaze object.
   - Do NOT assume images are public.
5) Build a Library view with:
   - Search, filters, and detail view
   - Show primary image (first b2 key) and gallery
   - Show structured fields from glove_profile_json
   - Keep raw `spec_json` accessible in an “Evidence” tab

## Data mapping (minimum fields expected in glove_profile_json)
- brand
- model_line
- model_code
- sport
- glove_type
- throw_hand (RHT/LHT if present)
- size_in
- position (IF/OF/1B/C/P/Utility)
- web_type
- series_tier (e.g. A2000 / A2K / HOH / Pro Preferred)
- condition_text
- price_usd
- currency
- source
- source_listing_id
- listing_url

If fields are missing from the JSON, show them as Unknown in UI, not empty strings.

## Output
- A working Library section in GloveIQ that can ingest this XLSX repeatedly (idempotent updates).
- Image rendering pipeline that requests images by b2 key (server signs or proxies; bucket remains private).
