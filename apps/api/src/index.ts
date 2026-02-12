import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Artifact, BrandConfig } from "@gloveiq/shared";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const seedDir = path.join(projectRoot, "data", "seed");
const publicDir = path.join(projectRoot, "public");
const resolvedPort = Number(process.env.PORT || 8787);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${resolvedPort}`;

app.use("/seed-images", express.static(path.join(publicDir, "seed")));

type CacheEntry<T> = { value: T; expiresAt: number };
const requestCache = new Map<string, CacheEntry<any>>();
const photoHashCache = new Map<string, CacheEntry<{ photo_id: string }>>();

const now = () => Date.now();
function getCache<T>(m: Map<string, CacheEntry<T>>, key: string): T | null {
  const e = m.get(key);
  if (!e) return null;
  if (e.expiresAt < now()) { m.delete(key); return null; }
  return e.value;
}
function setCache<T>(m: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  m.set(key, { value, expiresAt: now() + ttlMs });
}

type SeedFamily = {
  family_id: string;
  brand_key: string;
  family_key: string;
  display_name: string;
  tier: string;
  default_country_hint: string | null;
};
type SeedPattern = {
  pattern_id: string;
  brand_key: string;
  family_id: string;
  pattern_system: string;
  pattern_code: string;
  canonical_position: string;
  canonical_size_in: number | null;
  canonical_web: string | null;
};
type SeedVariant = {
  variant_id: string;
  brand_key: string;
  family_id: string | null;
  pattern_id: string | null;
  variant_label: string;
  year: number;
  made_in: string | null;
  leather: string | null;
  web: string | null;
  model_code: string | null;
  display_name: string;
  msrp_usd: number | null;
};
type SeedArtifact = {
  artifact_id: string;
  object_type: "ARTIFACT";
  brand_key: string | null;
  family_id: string | null;
  pattern_id: string | null;
  variant_id: string | null;
  position: string | null;
  size_in: number | null;
  condition_score: number | null;
  verification_status: string | null;
  valuation: {
    estimate_usd: number | null;
    range_low_usd: number | null;
    range_high_usd: number | null;
  };
  photos: {
    hero: string | null;
    thumbs: string[];
  };
};
type SeedComp = {
  comp_set_id: string;
  artifact_id: string;
  method: string;
  sales_ids: string[];
  notes: string | null;
};
type SeedSale = {
  sale_id: string;
  variant_id: string;
  brand_key: string;
  sale_date: string;
  price_usd: number;
  condition_score_proxy: number | null;
  source: string;
  source_url: string | null;
  is_referral: boolean;
};

function loadSeedFile<T>(name: string): T[] {
  const p = path.join(seedDir, name);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as T[];
}

const brands = loadSeedFile<{
  brand_key: string;
  display_name: string;
  country_hint: string | null;
  ai_support: string;
}>("brands.json").map((row) => ({
  brand_key: row.brand_key as BrandConfig["brand_key"],
  display_name: row.display_name,
  country_hint: row.country_hint || undefined,
  supports_variant_ai: row.ai_support === "supported",
}));

const families = loadSeedFile<SeedFamily>("families.json");
const patterns = loadSeedFile<SeedPattern>("patterns.json");
const variants = loadSeedFile<SeedVariant>("variants.json");
const artifactsRaw = loadSeedFile<SeedArtifact>("artifacts.json");
const comps = loadSeedFile<SeedComp>("comps.json");
const sales = loadSeedFile<SeedSale>("sales.json");

const familyNameById = new Map(families.map((f) => [f.family_id, f.display_name]));
const variantById = new Map(variants.map((v) => [v.variant_id, v]));
const toSeedImageUrl = (p: string) => `${publicBaseUrl}/${p.replace(/^images\//, "seed-images/")}`;

const artifacts: Artifact[] = artifactsRaw.map((row) => {
  const variant = row.variant_id ? variantById.get(row.variant_id) : undefined;
  const familyName = row.family_id ? familyNameById.get(row.family_id) : undefined;
  const photoList = [row.photos.hero, ...(row.photos.thumbs || [])].filter(Boolean) as string[];
  const uniquePhotos = Array.from(new Set(photoList));
  return {
    id: row.artifact_id,
    object_type: row.object_type,
    brand_key: (row.brand_key || undefined) as Artifact["brand_key"],
    family: familyName || null,
    model_code: variant?.model_code || null,
    made_in: variant?.made_in || null,
    position: row.position || null,
    size_in: row.size_in ?? null,
    verification_status: (row.verification_status || "Unverified") as Artifact["verification_status"],
    condition_score: row.condition_score ?? null,
    valuation_estimate: row.valuation.estimate_usd ?? null,
    valuation_low: row.valuation.range_low_usd ?? null,
    valuation_high: row.valuation.range_high_usd ?? null,
    photos: uniquePhotos.map((url, idx) => ({
      id: `${row.artifact_id}_p${idx + 1}`,
      url: toSeedImageUrl(url),
      kind: idx === 0 ? "HERO" : idx === 1 ? "PALM" : idx === 2 ? "BACK" : idx === 3 ? "HEEL" : "LINER",
    })),
  };
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/brands", (_req, res) => res.json(brands));
app.get("/families", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = !q ? families : families.filter((f) => JSON.stringify(f).toLowerCase().includes(q));
  res.json(rows);
});
app.get("/patterns", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = !q ? patterns : patterns.filter((p) => JSON.stringify(p).toLowerCase().includes(q));
  res.json(rows);
});
app.get("/variants", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = !q ? variants : variants.filter((v) => JSON.stringify(v).toLowerCase().includes(q));
  res.json(rows);
});
app.get("/comps", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = !q ? comps : comps.filter((c) => JSON.stringify(c).toLowerCase().includes(q));
  res.json(rows);
});
app.get("/sales", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = !q ? sales : sales.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
  res.json(rows);
});

app.get("/artifacts", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = !q ? artifacts : artifacts.filter((a) => JSON.stringify(a).toLowerCase().includes(q));
  res.json(rows);
});

app.get("/artifact/:id", (req, res) => {
  const id = String(req.params.id);
  const cacheKey = `artifact:${id}`;
  const hit = getCache(requestCache, cacheKey);
  if (hit) return res.json({ ...hit, _cache: "hit" });

  const found = artifacts.find((a) => a.id === id);
  if (!found) return res.status(404).json({ error: "Not found" });

  setCache(requestCache, cacheKey, found, 60_000);
  res.json({ ...found, _cache: "miss" });
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.post("/photos/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const sha = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const hit = getCache(photoHashCache, sha);
  if (hit) return res.json({ photo_id: hit.photo_id, deduped: true });

  const photo_id = "ph_" + sha.slice(0, 10);
  setCache(photoHashCache, sha, { photo_id }, 24 * 60 * 60 * 1000);
  res.json({ photo_id, deduped: false });
});

const port = resolvedPort;
app.listen(port, () => console.log(`[api] http://localhost:${port}`));
