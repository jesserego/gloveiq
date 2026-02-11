# RULES.md — ChatGPT Safe Editing Rules

## Goal
Keep the build working **at all times** (`npm run dev` from repo root).

## Hard rules
1) Don’t rename/move files unless asked.
2) Don’t change workspace scripts unless asked.
3) No refactors when fixing bugs—smallest change only.
4) Any new UI text must be added to i18n (EN + JA).
5) Preserve shared types in `packages/shared/src/types.ts`.

## AI cost rules
- Before calling any LLM/vision endpoint, compute a stable **photo hash** and reuse prior results.
- Cache expensive classification results by `(photo_hash + model_version + prompt_version)`.
- If confidence is not HIGH, return **Needs more input** rather than guessing.
