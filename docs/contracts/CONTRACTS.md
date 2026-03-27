# GloveIQ Data Contracts

This folder defines the canonical interface between scraper outputs and API ingestion.

## Active Contract

- Contract ID: `scraper_payload.v1`
- Schema file: `docs/contracts/scraper_payload.schema.v1.json`
- Validator implementation: `apps/api/src/lib/contracts/scraperContract.ts`
- CI command: `npm --workspace apps/api run contract:check`

## Compatibility Rules

1. Existing required fields cannot be removed in `v1`.
2. Field meaning cannot be repurposed in `v1`.
3. New optional fields are allowed in `v1`.
4. Any required field addition requires a new version (`v2`).
5. Any breaking type change requires a new version (`v2`).

## Brand/Market Separation Requirement

Every row must include:

- `manufacturer`
- `brand`
- `market`

Ingest and matching logic must preserve this separation, e.g.:

- `Wilson` + `Wilson` + `US`
- `Wilson` + `Wilson Staff` + `JP`

These are not interchangeable keys.

## Validation Scope

Contract validation currently covers:

- fixture data in `apps/api/tests/contracts/fixtures/*.json`
- any explicit payload passed via:
  - `npm --workspace apps/api run contract:check -- --input <file>`

Supported file formats:

- `.json` (object or array)
- `.jsonl` (one JSON object per line)
