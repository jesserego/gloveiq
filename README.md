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
