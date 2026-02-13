# AI Appraisal Data Model Integration

This folder ingests the user-provided database attachments for GloveIQ appraisal:

- `docs/ai-appraisal/dbdiagram.dbml`
- `docs/ai-appraisal/erDiagram.mmd`

## Purpose

These diagrams are the canonical target data model for AI appraisal features:

- identification (`brand/family/pattern/variant`)
- evidence ingestion (`artifact_photo`, `photo_role`, `artifact_doc`)
- condition scoring (`condition_assessment`, `condition_subscore`)
- valuation/comps (`appraisal`, `appraisal_evidence`, `comp_sale`)
- recommendations/listings (`market_listing`, `referral_out`)
- localization and policy (`i18n_text`, `brand_config`)

## Current Runtime Mapping

The current implementation in `apps/api/src/index.ts` writes runtime appraisal traces to:

- `images`
- `artifact_images`
- `ai_runs`
- `valuation_runs`
- `verification_events`

These map directly to the diagram’s core audit-trail entities and are used for live UI testing.

## Next Migration Step

To fully align runtime data with the attached schema, implement SQL migrations for:

1. Core taxonomy tables: `brand`, `family`, `pattern`, `variant`, `attribute_def`, `variant_attribute`
2. Artifact/evidence tables: `artifact`, `photo_role`, `artifact_photo`, `artifact_doc`
3. AI & verification tables: `condition_assessment`, `condition_dim`, `condition_subscore`, `verification_event`
4. Valuation/recommendation tables: `appraisal`, `evidence_source`, `comp_sale`, `appraisal_evidence`, `market_listing`, `referral_out`
5. Localization table: `i18n_text`

This keeps the current staged appraisal pipeline compatible while moving to a production relational model.
