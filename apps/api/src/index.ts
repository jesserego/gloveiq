import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import type { Artifact, BrandConfig } from "@gloveiq/shared";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

const brands: BrandConfig[] = [
  { brand_key: "RAWLINGS", display_name: "Rawlings", country_hint: "USA/JP", supports_variant_ai: true },
  { brand_key: "WILSON", display_name: "Wilson", country_hint: "USA/JP", supports_variant_ai: false },
  { brand_key: "MIZUNO", display_name: "Mizuno", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "ZETT", display_name: "Zett", country_hint: "Japan", supports_variant_ai: false },
  { brand_key: "DONAIYA", display_name: "Donaiya", country_hint: "Japan", supports_variant_ai: false },
  { brand_key: "IP_SELECT", display_name: "IP Select", country_hint: "Japan", supports_variant_ai: false },
  { brand_key: "KUBOTA_SLUGGER", display_name: "Kubota Slugger", country_hint: "Japan", supports_variant_ai: false },
];

const artifacts: Artifact[] = [
  {
    id: "GQ-MODEL-PRO1000",
    object_type: "CATALOGED_MODEL",
    brand_key: "RAWLINGS",
    family: "Heart of the Hide",
    model_code: "PRO1000",
    made_in: "Japan",
    position: "INFIELD",
    size_in: 11.5,
    verification_status: "Community Verified",
    condition_score: 84,
    valuation_estimate: 620,
    valuation_low: 470,
    valuation_high: 780,
    photos: [
      { id: "p1", url: "https://placehold.co/1200x800/png?text=Rawlings+PRO1000", kind: "HERO" },
      { id: "p2", url: "https://placehold.co/600x600/png?text=Palm", kind: "PALM" },
      { id: "p3", url: "https://placehold.co/600x600/png?text=Back", kind: "BACK" },
      { id: "p4", url: "https://placehold.co/600x600/png?text=Heel", kind: "HEEL" },
      { id: "p5", url: "https://placehold.co/600x600/png?text=Liner", kind: "LINER" },
    ],
  },
  {
    id: "GQ-MODEL-A2000",
    object_type: "CATALOGED_MODEL",
    brand_key: "WILSON",
    family: "A2000",
    model_code: null,
    made_in: "Japan",
    position: "INFIELD",
    size_in: 11.5,
    verification_status: "Unverified",
    condition_score: 82,
    valuation_estimate: null,
    valuation_low: 470,
    valuation_high: 780,
  },
  {
    id: "GQ-ART-000184",
    object_type: "ARTIFACT",
    brand_key: null,
    family: null,
    model_code: null,
    made_in: null,
    position: "UTILITY",
    size_in: 11.75,
    verification_status: "Unverified",
    condition_score: 76,
    valuation_estimate: null,
    valuation_low: 350,
    valuation_high: 650,
  },
];

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/brands", (_req, res) => res.json(brands));

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

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`[api] http://localhost:${port}`));
