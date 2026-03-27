# GloveIQ Ownership Boundaries

## Scope Owners

- `apps/api/**`
  - Owner: API/Data team
  - Responsibility: REST endpoints, ingest logic, contract enforcement, DB writes

- `scrapers/**`
  - Owner: Scraper team
  - Responsibility: source extraction, deterministic row output, B2 image metadata

- `docs/contracts/**`
  - Owner: API/Data team + Scraper team (joint approval)
  - Responsibility: versioned payload contracts and compatibility policy

- `apps/api/db/**` and Prisma migrations
  - Owner: API/Data team
  - Responsibility: schema evolution and migration safety

- `docs/**` (outside contracts)
  - Owner: feature owner for the relevant subsystem

## Change Control Rules

1. Scraper output changes that affect payload shape must update `docs/contracts/*`.
2. Contract changes require fixture updates and passing CI contract checks.
3. DB schema changes must include migration artifacts and rollout notes.
4. Cross-boundary changes (scraper + ingest + schema) should be merged in one PR when possible.

## Review Expectations

- Scraper PRs: include a sample payload diff.
- API ingest PRs: include fixture updates and contract validation output.
- Schema PRs: include migration plan and downgrade/rollback notes.
