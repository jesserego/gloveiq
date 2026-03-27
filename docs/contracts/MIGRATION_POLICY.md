# GloveIQ Migration Policy

## Objective

Keep the database schema stable and predictable while scraper coverage expands.

## Required Workflow

1. Update schema definitions (Prisma or SQL source of truth).
2. Generate migration artifact.
3. Validate migration on local development DB.
4. Run contract checks and ingest fixtures.
5. Merge only when all checks pass.

## Safe Change Categories

- Add nullable columns
- Add new tables
- Add indexes
- Add optional payload fields

## Breaking Change Categories

- Remove or rename required columns
- Change type/meaning of existing required fields
- Remove compatibility with `scraper_payload.v1`

Breaking changes require:

1. New contract version (`v2`)
2. Backfill/transition plan
3. Explicit rollout sequencing

## Rollout Sequence

1. Deploy schema changes (backward compatible).
2. Deploy API that supports old + new payloads.
3. Switch scrapers to new payload/version.
4. Remove legacy compatibility in a later release window.

## Rollback Rule

Each migration PR must include rollback guidance for:

- schema
- ingestion behavior
- payload contract version fallback
