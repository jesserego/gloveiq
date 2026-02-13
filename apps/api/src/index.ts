import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Artifact, BrandConfig } from "@gloveiq/shared";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
loadEnvFile(path.resolve(projectRoot, "..", "..", ".env"));
loadEnvFile(path.resolve(projectRoot, ".env"));
const seedDir = path.join(projectRoot, "data", "seed");
const publicDir = path.join(projectRoot, "public");
const uploadsDir = path.join(publicDir, "uploads");
const runtimeDir = path.join(projectRoot, "data", "runtime");
const runtimeDbPath = path.join(runtimeDir, "appraisal-db.json");
const resolvedPort = Number(process.env.PORT || 8787);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${resolvedPort}`;

app.use("/seed-images", express.static(path.join(publicDir, "seed")));
app.use("/uploads", express.static(uploadsDir));

type CacheEntry<T> = { value: T; expiresAt: number };
const requestCache = new Map<string, CacheEntry<any>>();
const photoHashCache = new Map<string, CacheEntry<{ photo_id: string }>>();
const bundleHashCache = new Map<string, CacheEntry<any>>();
const artifactStateCache = new Map<string, CacheEntry<any>>();

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

function ensureRuntimeStorage() {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(runtimeDbPath)) {
    const empty: RuntimeDb = {
      images: [],
      artifact_images: [],
      ai_runs: [],
      labels_truth: [],
      valuation_runs: [],
      corrections: [],
      verification_events: [],
    };
    fs.writeFileSync(runtimeDbPath, JSON.stringify(empty, null, 2));
  }
}

function loadRuntimeDb(): RuntimeDb {
  ensureRuntimeStorage();
  try {
    const raw = fs.readFileSync(runtimeDbPath, "utf-8");
    return JSON.parse(raw) as RuntimeDb;
  } catch {
    return {
      images: [],
      artifact_images: [],
      ai_runs: [],
      labels_truth: [],
      valuation_runs: [],
      corrections: [],
      verification_events: [],
    };
  }
}

function saveRuntimeDb(db: RuntimeDb) {
  ensureRuntimeStorage();
  fs.writeFileSync(runtimeDbPath, JSON.stringify(db, null, 2));
}

function stableHash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((v) => v.trim())
    .filter((v) => v.length >= 2);
}

function buildEmbedding(text: string, dims = 128) {
  const vec = Array<number>(dims).fill(0);
  for (const token of tokenize(text)) {
    const h = parseInt(stableHash(token).slice(0, 8), 16);
    const i = h % dims;
    vec[i] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function cosine(a: number[], b: number[]) {
  let s = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) s += a[i] * b[i];
  return s;
}

function pct(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((x, y) => x - y);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
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

type RuntimeDb = {
  images: Array<{ image_id: string; sha256: string; name: string; mime: string; bytes: number; url: string; created_at: string }>;
  artifact_images: Array<{ artifact_id: string; image_id: string; role: string; usable: boolean; bundle_hash: string; created_at: string }>;
  ai_runs: Array<{ run_id: string; artifact_id: string; bundle_hash: string; stage: string; model: string; input_hash: string; output: any; created_at: string }>;
  labels_truth: Array<{ artifact_id: string; source: string; payload: any; created_at: string }>;
  valuation_runs: Array<{ run_id: string; artifact_id: string; bundle_hash: string; mode: string; comps_used: number; output: any; created_at: string }>;
  corrections: Array<{ correction_id: string; artifact_id: string; note: string; payload: any; created_at: string }>;
  verification_events: Array<{ event_id: string; artifact_id: string; from: string; to: string; reason: string; created_at: string }>;
};

type AppraisalMode = "MODE_DISABLED" | "MODE_RANGE_ONLY" | "MODE_ESTIMATE_AND_RANGE" | "DEFER_TO_HUMAN";

function determineAppraisalMode(input: {
  idConfidence: number;
  variantConfirmed: boolean;
  conditionConfidence: number;
  compsCount: number;
  requiredPhotosPresent: boolean;
  conflictingBrandSignals: boolean;
}): { mode: AppraisalMode; reason: string } {
  if (input.idConfidence < 0.5) return { mode: "DEFER_TO_HUMAN", reason: "Low ID confidence (<0.50)." };
  if (input.conflictingBrandSignals) return { mode: "MODE_DISABLED", reason: "Conflicting brand signals detected in evidence." };
  if (!input.requiredPhotosPresent || input.compsCount < 5) return { mode: "MODE_DISABLED", reason: "Insufficient evidence (P0 photos) or comps (<5)." };
  if (input.idConfidence >= 0.85 && input.variantConfirmed && input.compsCount >= 12 && input.conditionConfidence >= 0.75) {
    return { mode: "MODE_ESTIMATE_AND_RANGE", reason: "High confidence with strong comps and condition confidence." };
  }
  return { mode: "MODE_RANGE_ONLY", reason: "Moderate confidence or limited comps depth." };
}

function confidenceLabelFromScore(score: number): "Low" | "Medium" | "High" {
  if (score >= 0.78) return "High";
  if (score >= 0.52) return "Medium";
  return "Low";
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function normalizeModelJsonText(raw: string) {
  const t = raw.trim();
  if (t.startsWith("```")) return t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return t;
}

function looksLikeBrandConflict(brand: string, hint: string) {
  const b = (brand || "").toLowerCase();
  const h = (hint || "").toLowerCase();
  if (!b || !h) return false;
  const mentioned = brands.filter((x) => h.includes(x.display_name.toLowerCase()) || h.includes(x.brand_key.toLowerCase()));
  return mentioned.length > 1 || (mentioned.length === 1 && mentioned[0].display_name.toLowerCase() !== b);
}

function classifyRoleByName(name: string) {
  const n = name.toLowerCase();
  if (/\bpalm|pocket\b/.test(n)) return "PALM";
  if (/\bback|backhand\b/.test(n)) return "BACK";
  if (/\bliner|inside|interior\b/.test(n)) return "LINER";
  if (/\bwrist|patch\b/.test(n)) return "WRIST_PATCH";
  if (/\bstamp|emboss|serial|logo\b/.test(n)) return "STAMPS";
  if (/\bheel\b/.test(n)) return "HEEL";
  if (/\bthumb\b/.test(n)) return "THUMB_SIDE";
  if (/\bpinky\b/.test(n)) return "PINKY_LOOP";
  return "OTHER";
}

function qualityScoresForFile(file: Express.Multer.File) {
  const score = parseInt(stableHash(`${file.originalname}_${file.size}`).slice(0, 8), 16);
  const blurScore = (score % 100) / 100;
  const glareScore = (Math.floor(score / 11) % 100) / 100;
  const cropScore = (Math.floor(score / 73) % 100) / 100;
  const issues: string[] = [];
  if (blurScore > 0.65) issues.push("blur");
  if (glareScore > 0.7) issues.push("glare");
  if (cropScore > 0.7) issues.push("crop");
  return { blurScore, glareScore, cropScore, usable: issues.length === 0, issues };
}

async function runVisionIdentify(files: Express.Multer.File[], hint: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on API server.");
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      brand: { type: "string" },
      family: { type: "string" },
      model: { type: "string" },
      pattern: { type: "string" },
      size: { type: "string" },
      throwSide: { type: "string" },
      web: { type: "string" },
      leather: { type: "string" },
      madeIn: { type: "string" },
      variantId: { type: "string" },
      idConfidence: { type: "number" },
      variantConfirmed: { type: "boolean" },
      conditionConfidence: { type: "number" },
      stamp_text: { type: "string" },
      country_stamp: { type: "string" },
    },
    required: [
      "brand", "family", "model", "pattern", "size", "throwSide", "web", "leather", "madeIn",
      "variantId", "idConfidence", "variantConfirmed", "conditionConfidence", "stamp_text", "country_stamp",
    ],
  };
  const rsp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_APPRAISAL_MODEL || "gpt-4.1",
      temperature: 0.1,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are GloveIQ glove identification model. Be conservative and avoid hallucination.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Hint: ${hint || "(none)"}\n` +
                "Infer brand/family/model/pattern/variant from all images. Extract stamp text and country stamp when visible. Unknown when uncertain.",
            },
            ...files.map((file) => ({
              type: "input_image",
              image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "glove_identification",
          schema,
          strict: true,
        },
      },
    }),
  });
  if (!rsp.ok) {
    const msg = await rsp.text().catch(() => "");
    throw new Error(`OpenAI identify failed: ${msg || rsp.status}`);
  }
  const parsed = await rsp.json();
  const modelText = String(parsed?.output_text || parsed?.output?.[0]?.content?.[0]?.text || "");
  const obj = JSON.parse(normalizeModelJsonText(modelText || "{}"));
  return obj;
}

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
const variantEmbeddingById = new Map(
  variants.map((v) => [
    v.variant_id,
    buildEmbedding(
      [
        v.variant_id,
        v.brand_key,
        v.display_name,
        v.model_code || "",
        v.pattern_id || "",
        v.family_id || "",
        v.web || "",
        v.leather || "",
        v.made_in || "",
        String(v.year || ""),
      ].join(" "),
    ),
  ]),
);
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
const uploadMany = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 10 } });

app.post("/photos/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const sha = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const hit = getCache(photoHashCache, sha);
  if (hit) return res.json({ photo_id: hit.photo_id, deduped: true });

  const photo_id = "ph_" + sha.slice(0, 10);
  setCache(photoHashCache, sha, { photo_id }, 24 * 60 * 60 * 1000);
  res.json({ photo_id, deduped: false });
});

app.post("/appraisal/analyze", uploadMany.array("files", 10), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ error: "Missing files" });
    const hint = String(req.body?.hint || "");
    const artifactId = String(req.body?.artifact_id || `art_live_${stableHash(`${hint}_${Date.now()}`).slice(0, 10)}`);
    const nowIso = new Date().toISOString();
    const db = loadRuntimeDb();

    const uploads = files.map((file) => {
      const sha = crypto.createHash("sha256").update(file.buffer).digest("hex");
      const hit = getCache(photoHashCache, sha);
      if (hit) {
        const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
        const filename = `${hit.photo_id}${ext}`;
        const abs = path.join(uploadsDir, filename);
        if (!fs.existsSync(abs)) fs.writeFileSync(abs, file.buffer);
        const url = `${publicBaseUrl}/uploads/${filename}`;
        if (!db.images.find((x) => x.image_id === hit.photo_id)) {
          db.images.push({ image_id: hit.photo_id, sha256: sha, name: file.originalname, mime: file.mimetype, bytes: file.size, url, created_at: nowIso });
        }
        return { name: file.originalname, photoId: hit.photo_id, deduped: true, sha256: sha, url };
      }
      const photo_id = "ph_" + sha.slice(0, 10);
      setCache(photoHashCache, sha, { photo_id }, 24 * 60 * 60 * 1000);
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      const filename = `${photo_id}${ext}`;
      const abs = path.join(uploadsDir, filename);
      fs.writeFileSync(abs, file.buffer);
      const url = `${publicBaseUrl}/uploads/${filename}`;
      db.images.push({ image_id: photo_id, sha256: sha, name: file.originalname, mime: file.mimetype, bytes: file.size, url, created_at: nowIso });
      return { name: file.originalname, photoId: photo_id, deduped: false, sha256: sha, url };
    });
    const roles = uploads.map((u, idx) => {
      const q = qualityScoresForFile(files[idx]);
      return { name: u.name, role: classifyRoleByName(u.name), usable: q.usable, quality: q };
    });
    const presentUsable = new Set(roles.filter((r) => r.usable).map((r) => r.role));
    const missingP0 = ["BACK", "PALM"].filter((r) => !presentUsable.has(r));
    const missingP1 = ["LINER", "WRIST_PATCH", "STAMPS"].filter((r) => !presentUsable.has(r));
    const requestedRoles = missingP0.length ? missingP0 : missingP1;
    const needsMoreInputMessage = missingP0.length
      ? `Please add: ${missingP0.join(", ")} to unlock appraisal.`
      : missingP1.length
        ? `Recommended: ${missingP1.join(", ")} for tighter confidence.`
        : "All recommended photo roles provided.";
    const requiredPhotosPresent = missingP0.length === 0;
    const qualityIssues = roles.flatMap((r) => r.quality.issues.map((issue) => `${r.name}:${issue}`));

    const bundleHash = stableHash(
      uploads
        .map((u, i) => `${u.sha256}:${roles[i]?.role}:${roles[i]?.usable ? 1 : 0}`)
        .sort()
        .join("|"),
    );
    const artifactStateHash = stableHash(`${artifactId}|${bundleHash}|${hint}`);

    const cached = getCache(artifactStateCache, artifactStateHash);
    if (cached) return res.json({ ...cached, cache: "artifact_state_hit" });

    const identifyInputHash = stableHash(`identify|${bundleHash}|${hint}`);
    const identifyHit = getCache(bundleHashCache, identifyInputHash);
    const identifyStage = identifyHit || await runVisionIdentify(files, hint);
    setCache(bundleHashCache, identifyInputHash, identifyStage, 10 * 60_000);

    const brandKey = String(identifyStage.brand || "").toUpperCase().replace(/\s+/g, "_");
    const conflictingBrandSignals = looksLikeBrandConflict(String(identifyStage.brand || ""), hint);
    const evidenceText = [
      identifyStage.brand, identifyStage.family, identifyStage.model, identifyStage.pattern,
      identifyStage.variantId, identifyStage.web, identifyStage.leather, identifyStage.madeIn, hint,
      uploads.map((u) => u.name).join(" "),
    ].join(" ");
    const evidenceEmbedding = buildEmbedding(evidenceText);
    const topVariantNeighbors = variants
      .map((v) => ({
        variant_id: v.variant_id,
        score: cosine(evidenceEmbedding, variantEmbeddingById.get(v.variant_id) || []),
        model_code: v.model_code,
        brand_key: v.brand_key,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const chosenVariantId = String(identifyStage.variantId || topVariantNeighbors[0]?.variant_id || "");
    const chosenVariant = chosenVariantId ? variantById.get(chosenVariantId) : undefined;
    const directSales = sales.filter((s) => s.variant_id === chosenVariantId);
    const fallbackVariantIds = topVariantNeighbors.slice(0, 5).map((x) => x.variant_id);
    const neighborSales = sales.filter((s) => fallbackVariantIds.includes(s.variant_id));
    const brandSales = sales.filter((s) => s.brand_key === brandKey);
    const compCandidates = directSales.length >= 3 ? directSales : neighborSales.length >= 5 ? neighborSales : brandSales;
    const compsCount = compCandidates.length;
    const salesSource = directSales.length >= 3 ? "variant" : neighborSales.length >= 5 ? "vector_neighbors" : brandSales.length >= 4 ? "brand_fallback" : "insufficient";

    const idConfidence = Number(identifyStage.idConfidence || 0);
    const variantConfirmed = Boolean(identifyStage.variantConfirmed) || (topVariantNeighbors[0]?.score || 0) > 0.88;
    const conditionConfidence = Math.max(0.4, Math.min(0.95, Number(identifyStage.conditionConfidence || 0.6)));
    const route = determineAppraisalMode({
      idConfidence,
      variantConfirmed,
      conditionConfidence,
      compsCount,
      requiredPhotosPresent,
      conflictingBrandSignals,
    });
    const prices = compCandidates.map((s) => s.price_usd);
    const medianPrice = prices.length ? Math.round(pct(prices, 0.5)) : null;
    const p25 = prices.length ? Math.round(pct(prices, 0.25)) : null;
    const p75 = prices.length ? Math.round(pct(prices, 0.75)) : null;
    const priceStd = prices.length > 1 ? Math.sqrt(prices.map((p) => (p - (medianPrice || 0)) ** 2).reduce((a, b) => a + b, 0) / prices.length) : 0;
    const recencyBoost = compCandidates.filter((c) => Date.parse(c.sale_date) >= Date.now() - 1000 * 60 * 60 * 24 * 120).length;
    const liquidityScore = Math.max(0, Math.min(100, Math.round((Math.min(1, compsCount / 12) * 60) + (Math.min(1, recencyBoost / 8) * 30) + (priceStd < 80 ? 10 : 0))));
    const suggestedPrice = route.mode === "MODE_ESTIMATE_AND_RANGE" && medianPrice != null
      ? Math.round((medianPrice * 0.55) + ((p75 || medianPrice) * 0.45))
      : route.mode === "MODE_RANGE_ONLY" && p75 != null
        ? Math.round((p75 * 0.5) + ((medianPrice || p75) * 0.5))
        : null;

    const evidenceStage = {
      photoRoles: roles.map((r) => ({ name: r.name, role: r.role, usable: r.usable })),
      qualityIssues,
      requiredPhotosPresent,
      requestedRoles,
      needsMoreInputMessage,
      structuredSignals: {
        stamp_text: String(identifyStage.stamp_text || ""),
        country_stamp: String(identifyStage.country_stamp || ""),
        web_type: String(identifyStage.web || ""),
        patch_type: roles.find((r) => r.role === "WRIST_PATCH") ? "present" : "not_visible",
        relaced: "Unknown",
      },
    };
    const valuationStage = {
      mode: route.mode,
      reason: route.reason,
      confidenceLabel: confidenceLabelFromScore(idConfidence),
      confidenceScore: idConfidence,
      valuation: {
        point: route.mode === "MODE_ESTIMATE_AND_RANGE" ? medianPrice : null,
        low: route.mode === "MODE_RANGE_ONLY" || route.mode === "MODE_ESTIMATE_AND_RANGE" ? p25 : null,
        high: route.mode === "MODE_RANGE_ONLY" || route.mode === "MODE_ESTIMATE_AND_RANGE" ? p75 : null,
      },
      compsUsed: compsCount,
      salesSource,
      conditionConfidence,
    };
    const recommendationStage = {
      suggestedListPrice: suggestedPrice,
      liquidityScore,
      compareAgainst: compCandidates.slice(0, 8).map((c) => ({
        sale_id: c.sale_id,
        variant_id: c.variant_id,
        price_usd: c.price_usd,
        sale_date: c.sale_date,
        source: c.source,
      })),
      vectorNeighbors: topVariantNeighbors.slice(0, 6),
    };

    for (let i = 0; i < uploads.length; i += 1) {
      db.artifact_images.push({
        artifact_id: artifactId,
        image_id: uploads[i].photoId,
        role: roles[i].role,
        usable: roles[i].usable,
        bundle_hash: bundleHash,
        created_at: nowIso,
      });
    }
    db.ai_runs.push({
      run_id: `run_${stableHash(`${artifactId}_${nowIso}_identify`).slice(0, 12)}`,
      artifact_id: artifactId,
      bundle_hash: bundleHash,
      stage: "identify",
      model: process.env.OPENAI_APPRAISAL_MODEL || "gpt-4.1",
      input_hash: identifyInputHash,
      output: identifyStage,
      created_at: nowIso,
    });
    db.ai_runs.push({
      run_id: `run_${stableHash(`${artifactId}_${nowIso}_evidence`).slice(0, 12)}`,
      artifact_id: artifactId,
      bundle_hash: bundleHash,
      stage: "evidence",
      model: "rules+vision",
      input_hash: stableHash(`evidence|${bundleHash}`),
      output: evidenceStage,
      created_at: nowIso,
    });
    db.valuation_runs.push({
      run_id: `vrun_${stableHash(`${artifactId}_${nowIso}`).slice(0, 12)}`,
      artifact_id: artifactId,
      bundle_hash: bundleHash,
      mode: route.mode,
      comps_used: compsCount,
      output: { valuationStage, recommendationStage },
      created_at: nowIso,
    });
    db.verification_events.push({
      event_id: `vev_${stableHash(`${artifactId}_${nowIso}_${route.mode}`).slice(0, 12)}`,
      artifact_id: artifactId,
      from: "unverified",
      to: route.mode,
      reason: route.reason,
      created_at: nowIso,
    });
    saveRuntimeDb(db);

    const appraisal = {
      mode: valuationStage.mode,
      reason: valuationStage.reason,
      confidenceLabel: valuationStage.confidenceLabel,
      confidenceScore: valuationStage.confidenceScore,
      brand: String(identifyStage.brand || chosenVariant?.brand_key || "Unknown"),
      family: String(identifyStage.family || (chosenVariant?.family_id ? familyNameById.get(chosenVariant.family_id) : "") || "Unknown"),
      model: String(identifyStage.model || chosenVariant?.model_code || "Unknown"),
      pattern: String(identifyStage.pattern || chosenVariant?.pattern_id || "Unknown"),
      size: String(identifyStage.size || "Unknown"),
      throwSide: String(identifyStage.throwSide || "Unknown"),
      web: String(identifyStage.web || chosenVariant?.web || "Unknown"),
      leather: String(identifyStage.leather || chosenVariant?.leather || "Unknown"),
      madeIn: String(identifyStage.madeIn || chosenVariant?.made_in || "Unknown"),
      valuation: valuationStage.valuation,
      compsUsed: valuationStage.compsUsed,
      salesSource: valuationStage.salesSource,
      requiredPhotosPresent: evidenceStage.requiredPhotosPresent,
      p1PhotoCount: 3 - missingP1.length,
      requestedRoles: evidenceStage.requestedRoles,
      needsMoreInputMessage: evidenceStage.needsMoreInputMessage,
      qualityIssues: evidenceStage.qualityIssues,
      photoRoles: evidenceStage.photoRoles,
      recommendation: recommendationStage,
    };

    const responseBody = {
      artifactId,
      uploads: uploads.map((u) => ({ name: u.name, photoId: u.photoId, deduped: u.deduped })),
      stages: {
        identify: identifyStage,
        evidence: evidenceStage,
        valuation: valuationStage,
        recommendation: recommendationStage,
      },
      appraisal,
      cache: "artifact_state_miss",
    };
    setCache(artifactStateCache, artifactStateHash, responseBody, 20 * 60_000);
    return res.json(responseBody);
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/appraisal/runs", (_req, res) => {
  const db = loadRuntimeDb();
  res.json({
    images: db.images.length,
    artifact_images: db.artifact_images.length,
    ai_runs: db.ai_runs.length,
    valuation_runs: db.valuation_runs.length,
    verification_events: db.verification_events.length,
    latest_ai_runs: db.ai_runs.slice(-10),
    latest_valuation_runs: db.valuation_runs.slice(-10),
  });
});

const port = resolvedPort;
ensureRuntimeStorage();
app.listen(port, () => console.log(`[api] http://localhost:${port}`));
