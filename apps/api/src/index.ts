import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Artifact, BrandConfig } from "@gloveiq/shared";
import { PrismaClient } from "@prisma/client";
import { configReadiness, buildRuntimeConfig } from "./lib/runtimeConfig.js";
import { loadLibraryStore } from "./libraryStore.js";
import { mountCollectionRoutes } from "./collectionRoutes.js";
import { downloadFromBackblazeByKey, uploadToBackblaze } from "./lib/backblaze.js";
import { EBAY_GLOBAL_IDS, fetchEbayMarketplaceRows, persistEbayRows as persistEbayListings } from "./lib/ebay.js";
import { recomputeGloveMarketSummaries } from "./lib/gloveMarketSummary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const runtimeConfig = buildRuntimeConfig({ projectRoot, defaultPort: 8787 });
const app = express();
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (runtimeConfig.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

const seedDir = path.join(projectRoot, "data", "seed");
const publicDir = path.join(projectRoot, "public");
const uploadsDir = path.join(publicDir, "uploads");
const runtimeDir = path.join(projectRoot, "data", "runtime");
const libraryExportDir = runtimeConfig.libraryExportDir;
const libraryListingsPath = path.join(libraryExportDir, "listings.normalized.jsonl");
const libraryManifestPath = path.join(libraryExportDir, "media_manifest.jsonl");
const resolvedPort = runtimeConfig.port;
const publicBaseUrl = runtimeConfig.publicBaseUrl;
const b2PublicBaseUrl = runtimeConfig.backblaze.publicBaseUrl;
const libraryApiBasePath = "/api/library";
const ebayVerificationToken = String(process.env.EBAY_VERIFICATION_TOKEN || "").trim();
const ebayNotificationPath = "/api/integrations/ebay/notifications";
const ebayNotificationEndpoint = `${publicBaseUrl.replace(/\/+$/, "")}${ebayNotificationPath}`;

function readOpenAiKey(): string {
  const raw = String(process.env.OPENAI_API_KEY || "").trim();
  if (!raw) return "";
  if (raw === "sk-REPLACE_ME" || raw === "REPLACE_ME") return "";
  return raw;
}

if (!readOpenAiKey()) {
  // Visible startup signal so local setup issues are caught before first upload call.
  console.warn("[startup] OPENAI_API_KEY is not configured. Appraisal endpoint will fall back to local heuristic.");
}
if (!runtimeConfig.databaseUrl) {
  console.warn("[startup] DATABASE_URL is not configured. Prisma-backed features will fail until a database connection string is set.");
}
if (!runtimeConfig.backblaze.keyId || !runtimeConfig.backblaze.applicationKey || !runtimeConfig.backblaze.bucketName) {
  console.warn("[startup] Backblaze B2 is not fully configured. Image upload workers are not ready yet.");
}

app.use("/seed-images", express.static(path.join(publicDir, "seed")));
app.use("/uploads", express.static(uploadsDir));

app.get(ebayNotificationPath, (req, res) => {
  const challengeCode = String(req.query.challenge_code || "").trim();
  if (!challengeCode) {
    return res.status(400).json({
      error: "Missing challenge_code",
      endpoint: ebayNotificationEndpoint,
    });
  }
  if (!ebayVerificationToken) {
    return res.status(500).json({
      error: "EBAY_VERIFICATION_TOKEN is not configured",
      endpoint: ebayNotificationEndpoint,
    });
  }
  return res.json({
    challengeResponse: buildEbayChallengeResponse(challengeCode, ebayVerificationToken, ebayNotificationEndpoint),
  });
});

app.post(ebayNotificationPath, (req, res) => {
  console.log("[ebay-notification]", JSON.stringify(req.body || {}));
  return res.status(202).json({ ok: true });
});

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
}

function extensionFromMimeOrName(mime: string | null | undefined, name: string | null | undefined) {
  const extFromName = path.extname(String(name || "")).toLowerCase();
  if (extFromName) return extFromName;
  const normalizedMime = String(mime || "").toLowerCase();
  if (normalizedMime === "image/png") return ".png";
  if (normalizedMime === "image/webp") return ".webp";
  if (normalizedMime === "image/gif") return ".gif";
  return ".jpg";
}

async function persistPhotoUpload(params: {
  file: Express.Multer.File;
  photoId: string;
}): Promise<{ url: string; storage: "local" | "b2"; b2Bucket: string | null; b2Key: string | null }> {
  const ext = extensionFromMimeOrName(params.file.mimetype, params.file.originalname);
  const key = `appraisal/photos/${params.photoId}${ext}`;

  if (runtimeConfig.backblaze.keyId && runtimeConfig.backblaze.applicationKey && runtimeConfig.backblaze.bucketName && runtimeConfig.backblaze.bucketId) {
    try {
      const upload = await uploadToBackblaze(runtimeConfig, {
        key,
        body: params.file.buffer,
        contentType: params.file.mimetype || "b2/x-auto",
      });
      return {
        url: `${publicBaseUrl}/media/key/${encodeURIComponent(upload.key)}`,
        storage: "b2",
        b2Bucket: upload.bucketName,
        b2Key: upload.key,
      };
    } catch (error) {
      console.warn(`[b2] falling back to local upload storage: ${String((error as Error)?.message || error)}`);
    }
  }

  const filename = `${params.photoId}${ext}`;
  const abs = path.join(uploadsDir, filename);
  if (!fs.existsSync(abs)) fs.writeFileSync(abs, params.file.buffer);
  return {
    url: `${publicBaseUrl}/uploads/${filename}`,
    storage: "local",
    b2Bucket: null,
    b2Key: null,
  };
}

function stableHash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function buildEbayChallengeResponse(challengeCode: string, verificationToken: string, endpoint: string) {
  return crypto
    .createHash("sha256")
    .update(challengeCode)
    .update(verificationToken)
    .update(endpoint)
    .digest("hex");
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

type LiveSaleRow = {
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

type HomeWindowKey = "1mo" | "3mo" | "6mo" | "1yr" | "ytd" | "all";

type HomeDashboardRow = {
  listing_id: string;
  title: string | null;
  price_amount: number | null;
  price_currency: string | null;
  available: boolean | null;
  listing_url: string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
  source_name: string | null;
  marketplace_id: string | null;
  canonical_name: string | null;
  brand_name: string | null;
};

const HOME_WINDOW_MS: Record<Exclude<HomeWindowKey, "ytd" | "all">, number> = {
  "1mo": 30 * 24 * 60 * 60 * 1000,
  "3mo": 90 * 24 * 60 * 60 * 1000,
  "6mo": 180 * 24 * 60 * 60 * 1000,
  "1yr": 365 * 24 * 60 * 60 * 1000,
};

const EBAY_COUNTRY_BY_MARKETPLACE: Record<string, string> = {
  "EBAY-US": "US",
  "EBAY-JP": "Japan",
  "EBAY-DE": "Germany",
  "EBAY-AU": "Australia",
  "EBAY-FR": "France",
  "EBAY-IT": "Italy",
  "EBAY-ES": "Spain",
  "EBAY-CA": "Canada",
  "EBAY-GB": "United Kingdom",
};

const HOME_ANALYTICS_MIN_PRICE = 10;
const HOME_ANALYTICS_MAX_PRICE = 2500;

function parseHomeWindowKey(value: string | null | undefined): HomeWindowKey {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "3mo" || normalized === "6mo" || normalized === "1yr" || normalized === "ytd" || normalized === "all") return normalized;
  return "1mo";
}

function normalizeCompact(value: string | null | undefined) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function homeWindowRange(windowKey: HomeWindowKey, anchor = new Date()) {
  const end = new Date(anchor);
  if (windowKey === "all") return { start: new Date(0), end };
  if (windowKey === "ytd") return { start: new Date(anchor.getFullYear(), 0, 1), end };
  return { start: new Date(anchor.getTime() - HOME_WINDOW_MS[windowKey]), end };
}

function previousHomeWindowRange(windowKey: HomeWindowKey, anchor = new Date()) {
  if (windowKey === "all") {
    const current = homeWindowRange("1yr", anchor);
    const span = current.end.getTime() - current.start.getTime();
    return {
      start: new Date(current.start.getTime() - span),
      end: current.start,
    };
  }
  if (windowKey === "ytd") {
    const start = new Date(anchor.getFullYear() - 1, 0, 1);
    const end = new Date(anchor.getFullYear(), 0, 1);
    return { start, end };
  }
  const current = homeWindowRange(windowKey, anchor);
  const span = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - span),
    end: current.start,
  };
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function numericValues(rows: Array<{ price_amount: number | null }>) {
  return rows
    .map((row) => Number(row.price_amount))
    .filter((value) => Number.isFinite(value) && value >= HOME_ANALYTICS_MIN_PRICE && value <= HOME_ANALYTICS_MAX_PRICE);
}

function median(values: number[]) {
  return percentileNumberSet(values, 0.5);
}

function percentileNumberSet(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  const weight = index - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
}

function percentDelta(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function bucketCounts(rows: HomeDashboardRow[], params: { start: Date; end: Date; soldOnly?: boolean; availableOnly?: boolean; buckets?: number }) {
  const buckets = params.buckets || 24;
  const spanMs = Math.max(1, params.end.getTime() - params.start.getTime());
  const out = Array<number>(buckets).fill(0);
  for (const row of rows) {
    if (params.soldOnly && row.available !== false) continue;
    if (params.availableOnly && row.available !== true) continue;
    const seenAt = asDate(row.updated_at) || asDate(row.created_at);
    if (!seenAt) continue;
    const ts = seenAt.getTime();
    if (ts < params.start.getTime() || ts >= params.end.getTime()) continue;
    const rawIndex = Math.floor(((ts - params.start.getTime()) / spanMs) * buckets);
    const index = Math.max(0, Math.min(buckets - 1, rawIndex));
    out[index] += 1;
  }
  return out;
}

function countryFromMarketplace(value: string | null | undefined) {
  const key = String(value || "").trim().toUpperCase();
  return EBAY_COUNTRY_BY_MARKETPLACE[key] || key.replace(/^EBAY-/, "") || "Unknown";
}

function inferDashboardBrand(title: string | null | undefined, brandSeeds: BrandConfig[]) {
  const lower = String(title || "").toLowerCase();
  for (const brand of brandSeeds) {
    const key = String(brand.brand_key || "").toLowerCase().replace(/_/g, " ");
    const display = String(brand.display_name || "").toLowerCase();
    if ((display && lower.includes(display)) || (key && lower.includes(key))) {
      return brand.display_name || brand.brand_key;
    }
  }
  return "Unknown";
}

async function loadHomeDashboardRows(prisma: PrismaClient): Promise<HomeDashboardRow[]> {
  return prisma.$queryRawUnsafe<HomeDashboardRow[]>(`
    SELECT
      l.id::text AS listing_id,
      l.title,
      l.price_amount::float8 AS price_amount,
      l.price_currency,
      l.available,
      l.url AS listing_url,
      l.updated_at,
      l.created_at,
      s.name AS source_name,
      MAX(CASE WHEN lsr.spec_key = 'marketplace_id' THEN lsr.spec_value ELSE NULL END) AS marketplace_id,
      g.canonical_name,
      b.name AS brand_name
    FROM listings l
    INNER JOIN sources s ON s.id = l.source_id
    LEFT JOIN listing_specs_raw lsr ON lsr.listing_id = l.id
    LEFT JOIN listing_glove_links lgl ON lgl.listing_id = l.id
    LEFT JOIN gloves g ON g.id = lgl.glove_id
    LEFT JOIN brands b ON b.id = g.manufacturer_brand_id
    WHERE s.name ILIKE 'eBay %'
    GROUP BY l.id, s.name, g.canonical_name, b.name
  `);
}

function buildHomeDashboardPayload(rows: HomeDashboardRow[], params: {
  windowKey: HomeWindowKey;
  brandKey: string;
  countryKey: string;
}) {
  const nowTs = new Date();
  const currentRange = homeWindowRange(params.windowKey, nowTs);
  const previousRange = previousHomeWindowRange(params.windowKey, nowTs);
  const normalizedBrand = normalizeCompact(params.brandKey);
  const normalizedCountry = String(params.countryKey || "all").trim();

  const decorate = rows.map((row) => {
    const country = countryFromMarketplace(row.marketplace_id || row.source_name);
    const brand = row.brand_name || inferDashboardBrand(row.title, brands);
    const title = String(row.title || row.canonical_name || "");
    const model = String(row.canonical_name || row.title || "Unknown");
    return { ...row, country, brand, title, model };
  });

  const filtered = decorate.filter((row) => {
    if (normalizedBrand && normalizedBrand !== "all") {
      const haystack = normalizeCompact(`${row.brand} ${row.title} ${row.model}`);
      if (!haystack.includes(normalizedBrand)) return false;
    }
    if (normalizedCountry && normalizedCountry !== "all" && row.country !== normalizedCountry) return false;
    return true;
  });

  const inRange = (date: Date | null, range: { start: Date; end: Date }) => {
    if (!date) return false;
    const ts = date.getTime();
    return ts >= range.start.getTime() && ts < range.end.getTime();
  };

  const currentRows = filtered.filter((row) => inRange(asDate(row.updated_at) || asDate(row.created_at), currentRange));
  const previousRows = filtered.filter((row) => inRange(asDate(row.updated_at) || asDate(row.created_at), previousRange));
  const soldCurrent = currentRows.filter((row) => row.available === false);
  const soldPrevious = previousRows.filter((row) => row.available === false);
  const activeCurrent = currentRows.filter((row) => row.available === true);
  const activePrevious = previousRows.filter((row) => row.available === true);

  const soldPrices = numericValues(soldCurrent);
  const soldPrevPrices = numericValues(soldPrevious);
  const activePrices = numericValues(activeCurrent);
  const currentPrices = numericValues(currentRows);
  const previousPrices = numericValues(previousRows);
  const displayPrices = soldPrices.length ? soldPrices : currentPrices;
  const priceMedianWindow = median(displayPrices);
  const prevMedianWindow = median(soldPrevPrices.length ? soldPrevPrices : previousPrices);

  const countriesMap = new Map<string, { country: string; value: number; count: number; prevValue: number }>();
  for (const row of filtered) {
    const date = asDate(row.updated_at) || asDate(row.created_at);
    if (!date) continue;
    const price = Number(row.price_amount || 0);
    if (!Number.isFinite(price) || price < HOME_ANALYTICS_MIN_PRICE || price > HOME_ANALYTICS_MAX_PRICE) continue;
    const slot = countriesMap.get(row.country) || { country: row.country, value: 0, count: 0, prevValue: 0 };
    if (inRange(date, currentRange)) {
      slot.value += price;
      slot.count += 1;
    } else if (inRange(date, previousRange)) {
      slot.prevValue += price;
    }
    countriesMap.set(row.country, slot);
  }
  const countries = [...countriesMap.values()]
    .filter((row) => row.count > 0 || row.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((row) => ({
      country: row.country,
      value: Math.round(row.value),
      count: row.count,
      change_pct: round1(percentDelta(row.value, row.prevValue)),
    }));

  const insightsRows = soldCurrent.length ? soldCurrent : currentRows.filter((row) => {
    const price = Number(row.price_amount || 0);
    return Number.isFinite(price) && price >= HOME_ANALYTICS_MIN_PRICE && price <= HOME_ANALYTICS_MAX_PRICE;
  });

  const trendingByModel = new Map<string, { current: number; previous: number }>();
  const trendSourceCurrent = soldCurrent.length ? soldCurrent : insightsRows;
  const trendSourcePrevious = soldPrevious.length ? soldPrevious : previousRows.filter((row) => {
    const price = Number(row.price_amount || 0);
    return Number.isFinite(price) && price >= HOME_ANALYTICS_MIN_PRICE && price <= HOME_ANALYTICS_MAX_PRICE;
  });
  for (const row of [...trendSourceCurrent, ...trendSourcePrevious]) {
    const slot = trendingByModel.get(row.model) || { current: 0, previous: 0 };
    if (trendSourceCurrent.includes(row)) slot.current += 1;
    else slot.previous += 1;
    trendingByModel.set(row.model, slot);
  }

  const trendBuckets = params.windowKey === "1mo" ? 30 : 12;
  const trendSpanMs = Math.max(1, currentRange.end.getTime() - currentRange.start.getTime());
  const trendSeries = Array.from({ length: trendBuckets }).map((_, index) => {
    const bucketStart = new Date(currentRange.start.getTime() + ((trendSpanMs / trendBuckets) * index));
    const bucketEnd = new Date(currentRange.start.getTime() + ((trendSpanMs / trendBuckets) * (index + 1)));
    const bucketRows = soldCurrent.filter((row) => {
      const date = asDate(row.updated_at) || asDate(row.created_at);
      return date && date >= bucketStart && date < bucketEnd;
    });
    const prices = numericValues(bucketRows);
    return {
      label: bucketStart.toLocaleDateString("en-US", params.windowKey === "1mo" ? { month: "short", day: "numeric" } : { month: "short", day: "numeric" }),
      medianPrice: Math.round(median(prices)),
      salesCount: bucketRows.length,
      p10: Math.round(percentileNumberSet(prices, 0.1)),
      p90: Math.round(percentileNumberSet(prices, 0.9)),
    };
  });

  return {
    global: {
      totalValue: countries.reduce((sum, row) => sum + row.value, 0),
      totalCount: countries.reduce((sum, row) => sum + row.count, 0),
      countries,
    },
    marketSnapshot: {
      sold: {
        value: soldCurrent.length,
        deltaPct: round1(percentDelta(soldCurrent.length, soldPrevious.length)),
        spark: bucketCounts(filtered, { ...currentRange, soldOnly: true }),
      },
      active: {
        value: activeCurrent.length,
        deltaPct: round1(percentDelta(activeCurrent.length, activePrevious.length)),
        spark: bucketCounts(filtered, { ...currentRange, availableOnly: true }),
      },
      sellThrough: {
        value: Number(((soldCurrent.length / Math.max(activeCurrent.length, 1)) * 100).toFixed(1)),
        deltaPct: round1(percentDelta(
          (soldCurrent.length / Math.max(activeCurrent.length, 1)) * 100,
          (soldPrevious.length / Math.max(activePrevious.length, 1)) * 100,
        )),
        spark: bucketCounts(filtered, { ...currentRange, soldOnly: true }).map((count, index) => {
          const activeCount = bucketCounts(filtered, { ...currentRange, availableOnly: true })[index] || 0;
          return Number(((count / Math.max(activeCount, 1)) * 100).toFixed(1));
        }),
      },
    },
    priceOverview: {
      currentMedian: Math.round(median(activePrices.length ? activePrices : displayPrices)),
      medianWindow: Math.round(priceMedianWindow),
      p10: Math.round(percentileNumberSet(displayPrices, 0.1)),
      p90: Math.round(percentileNumberSet(displayPrices, 0.9)),
      deltaPct: round1(percentDelta(priceMedianWindow, prevMedianWindow)),
    },
    salesTrend: {
      series: trendSeries,
      windowMedian: Math.round(priceMedianWindow),
      windowSales: soldCurrent.length,
    },
    brandModelInsights: {
      brands: [...new Map(
        insightsRows.reduce<Array<[string, number]>>((acc, row) => {
          const key = String(row.brand || "Unknown");
          const prev = acc.find((entry) => entry[0] === key);
          if (prev) prev[1] += 1;
          else acc.push([key, 1]);
          return acc;
        }, []),
      )]
        .map(([brand, volume]) => ({ brand, volume }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5),
      trending: [...trendingByModel.entries()]
        .map(([model, counts]) => ({ model, trendPct: round1(percentDelta(counts.current, counts.previous)) }))
        .sort((a, b) => b.trendPct - a.trendPct)
        .slice(0, 4),
      fastest: trendSeries
        .filter((row) => row.salesCount > 0)
        .slice(0, 4)
        .map((row, index) => ({
          model: trendSourceCurrent[index]?.model || trendSourceCurrent[index]?.title || `Model ${index + 1}`,
          avgDaysToSell: Number((Math.max(1, 30 / Math.max(row.salesCount, 1))).toFixed(1)),
        })),
    },
    listings: filtered
      .filter((row) => {
        const price = Number(row.price_amount || 0);
        return Number.isFinite(price) && price >= HOME_ANALYTICS_MIN_PRICE && price <= HOME_ANALYTICS_MAX_PRICE;
      })
      .sort((a, b) => (asDate(b.updated_at)?.getTime() || 0) - (asDate(a.updated_at)?.getTime() || 0))
      .slice(0, 8)
      .map((row) => ({
        title: row.title || row.model || "Unknown listing",
        price: Math.round(Number(row.price_amount || 0)),
        source: row.source_name || "eBay",
        country: row.country,
        date: (asDate(row.updated_at) || asDate(row.created_at) || new Date()).toISOString().slice(0, 10),
        url: row.listing_url || "#",
      })),
  };
}

function conditionScoreFromText(condition: string | null): number | null {
  const text = String(condition || "").toLowerCase();
  if (!text) return null;
  if (text.includes("new")) return 1;
  if (text.includes("excellent")) return 0.88;
  if (text.includes("very good")) return 0.8;
  if (text.includes("good")) return 0.72;
  if (text.includes("fair")) return 0.58;
  if (text.includes("parts")) return 0.3;
  return 0.65;
}

function hasEbayLiveConfig() {
  const appId = String(process.env.EBAY_APP_ID || "").trim();
  const clientId = String(process.env.EBAY_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.EBAY_CLIENT_SECRET || "").trim();
  return Boolean(appId || (clientId && clientSecret));
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

type ExportListing = {
  listing_pk: string;
  source: string;
  source_listing_id: string;
  url: string;
  title: string | null;
  brand: string | null;
  model: string | null;
  model_code: string | null;
  size_in: number | null;
  hand: string | null;
  throw_hand: string | null;
  player_position: string | null;
  position: string | null;
  web_type: string | null;
  sport: string | null;
  condition: string | null;
  price: number | null;
  currency: string | null;
  created_at: string | null;
  seen_at: string | null;
  raw_specs: Record<string, unknown> | null;
  images: string[] | null;
};

type ExportMediaMapping = {
  image_index: number;
  source_url: string;
  target_storage_key: string;
  content_type: string;
  mapping_key: string;
};

type ExportMediaManifest = {
  listing_pk: string;
  source: string;
  source_listing_id: string;
  ordered_image_urls: string[];
  image_mappings: ExportMediaMapping[];
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
  const apiKey = readOpenAiKey();
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

function loadJsonlFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const out: T[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      // Skip malformed row; import_report.json carries integrity counts.
    }
  }
  return out;
}

function loadCategoryStore(): {
  brand_variant: Array<{ brand_variant_id: string; display_name?: string; market?: string | null }>;
  model_family: Array<{ model_family_id: string; brand_variant_id: string; display_name?: string; type?: string | null; notes?: string | null }>;
  variant: Array<{ variant_id: string; brand_variant_id: string; model_family_id?: string | null; mold_family_id?: string | null; canonical_title?: string | null }>;
  mold_family: Array<{ mold_family_id: string; canonical_name?: string | null; position?: string | null; role?: string | null; size_bucket?: string | null; web?: string | null; typical_sizes?: string[] }>;
} | null {
  const p = path.join(runtimeDir, "category-store.json");
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as any;
    return {
      brand_variant: Array.isArray(parsed?.brand_variant) ? parsed.brand_variant : [],
      model_family: Array.isArray(parsed?.model_family) ? parsed.model_family : [],
      variant: Array.isArray(parsed?.variant) ? parsed.variant : [],
      mold_family: Array.isArray(parsed?.mold_family) ? parsed.mold_family : [],
    };
  } catch {
    return null;
  }
}

function runtimeIdToBrandKey(id: string): string {
  return String(id || "").trim().toUpperCase();
}

function marketToCountryHint(market: string | null | undefined): string | undefined {
  const key = String(market || "").trim().toUpperCase();
  if (!key) return undefined;
  if (key === "US") return "USA";
  if (key === "JP") return "Japan";
  return key;
}

function parseSizeBucketToInches(sizeBucket: string | null | undefined): number | null {
  const raw = String(sizeBucket || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/_/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const seedBrands = loadSeedFile<{
  brand_key: string;
  display_name: string;
  country_hint: string | null;
  ai_support: string;
}>("brands.json").map((row) => ({
  brand_key: row.brand_key as BrandConfig["brand_key"],
  display_name: row.display_name,
  country_hint: row.country_hint || undefined,
  supports_variant_ai: row.ai_support !== "NONE",
}));

const categoryStore = loadCategoryStore();
const runtimeBrands: BrandConfig[] = (categoryStore?.brand_variant || []).map((row) => ({
  brand_key: runtimeIdToBrandKey(row.brand_variant_id) as BrandConfig["brand_key"],
  display_name: String(row.display_name || row.brand_variant_id || "").trim() || "Unknown",
  country_hint: marketToCountryHint(row.market),
  supports_variant_ai: true,
}));

const brandsByKey = new Map<string, BrandConfig>();
for (const row of [...seedBrands, ...runtimeBrands]) {
  if (!row.brand_key) continue;
  brandsByKey.set(row.brand_key, row);
}
const brands = Array.from(brandsByKey.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));

const seedFamilies = loadSeedFile<SeedFamily>("families.json");
const runtimeFamilies: SeedFamily[] = (categoryStore?.model_family || []).map((row) => ({
  family_id: row.model_family_id,
  brand_key: runtimeIdToBrandKey(row.brand_variant_id),
  family_key: String(row.type || "runtime_family").toUpperCase(),
  display_name: String(row.display_name || row.model_family_id),
  tier: "RUNTIME",
  default_country_hint: null,
}));
const familiesById = new Map<string, SeedFamily>();
for (const row of [...seedFamilies, ...runtimeFamilies]) {
  if (!row.family_id) continue;
  familiesById.set(row.family_id, row);
}
const families = Array.from(familiesById.values());

const seedPatterns = loadSeedFile<SeedPattern>("patterns.json");
const moldById = new Map((categoryStore?.mold_family || []).map((row) => [row.mold_family_id, row]));
const runtimePatterns: SeedPattern[] = (categoryStore?.variant || [])
  .filter((row) => row.model_family_id)
  .map((row) => {
    const mold = row.mold_family_id ? moldById.get(row.mold_family_id) : undefined;
    const patternCode = String(mold?.web || mold?.canonical_name || row.mold_family_id || "UNKNOWN");
    const canonicalPosition = String(mold?.position || mold?.role || "Unknown");
    const sizeIn = parseSizeBucketToInches(mold?.size_bucket || mold?.typical_sizes?.[0]);
    return {
      pattern_id: `runtime_${row.variant_id}`,
      brand_key: runtimeIdToBrandKey(row.brand_variant_id),
      family_id: String(row.model_family_id),
      pattern_system: String(row.canonical_title || mold?.canonical_name || "Runtime catalog"),
      pattern_code: patternCode,
      canonical_position: canonicalPosition,
      canonical_size_in: sizeIn,
      canonical_web: mold?.web || null,
    };
  });
const patternsById = new Map<string, SeedPattern>();
for (const row of [...seedPatterns, ...runtimePatterns]) {
  if (!row.pattern_id) continue;
  patternsById.set(row.pattern_id, row);
}
const patterns = Array.from(patternsById.values());

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
const brandKeyByNormalized = new Map<string, BrandConfig["brand_key"]>();
for (const b of brands) {
  brandKeyByNormalized.set(b.brand_key.toLowerCase(), b.brand_key);
  brandKeyByNormalized.set(b.display_name.toLowerCase(), b.brand_key);
}
brandKeyByNormalized.set("44 pro", "FORTY_FOUR");
brandKeyByNormalized.set("louisville slugger", "LOUISVILLE_SLUGGER");
brandKeyByNormalized.set("nokona", "NAKONA");
brandKeyByNormalized.set("ip select", "IP_SELECT");
brandKeyByNormalized.set("kubota slugger", "KUBOTA_SLUGGER");

function normalizeBrandKey(input: string | null | undefined): Artifact["brand_key"] {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;
  return brandKeyByNormalized.get(raw) || null;
}

function inferConditionScore(condition: string | null | undefined): number | null {
  const c = String(condition || "").toLowerCase();
  if (!c) return null;
  if (c.includes("new")) return 0.95;
  if (c.includes("excellent")) return 0.88;
  if (c.includes("very good")) return 0.8;
  if (c.includes("good")) return 0.72;
  if (c.includes("fair")) return 0.58;
  if (c.includes("used")) return 0.68;
  return null;
}

function mapPhotoKind(index: number): "HERO" | "PALM" | "BACK" | "HEEL" | "LINER" {
  if (index === 0) return "HERO";
  if (index === 1) return "PALM";
  if (index === 2) return "BACK";
  if (index === 3) return "HEEL";
  return "LINER";
}

function mediaUrlForMapping(mapping: ExportMediaMapping): string {
  if (b2PublicBaseUrl) return `${b2PublicBaseUrl}/${mapping.target_storage_key}`;
  // Media resolver endpoint keeps the URL contract stable while B2 access is configured.
  return `${publicBaseUrl}/media/key/${mapping.target_storage_key}?source_url=${encodeURIComponent(mapping.source_url)}`;
}

const seedArtifacts: Artifact[] = artifactsRaw.map((row) => {
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
    listing_url: null,
    source: null,
    photos: uniquePhotos.map((url, idx) => ({
      id: `${row.artifact_id}_p${idx + 1}`,
      url: toSeedImageUrl(url),
      kind: idx === 0 ? "HERO" : idx === 1 ? "PALM" : idx === 2 ? "BACK" : idx === 3 ? "HEEL" : "LINER",
    })),
  };
});

const manifestRows = loadJsonlFile<ExportMediaManifest>(libraryManifestPath);
const mediaByListingPk = new Map<string, ExportMediaManifest>();
for (const row of manifestRows) {
  if (row?.listing_pk) mediaByListingPk.set(row.listing_pk, row);
}

const exportListings = loadJsonlFile<ExportListing>(libraryListingsPath);
const exportArtifacts: Artifact[] = exportListings
  .map((row) => {
    if (!row?.listing_pk || !row?.source_listing_id) return null;
    const media = mediaByListingPk.get(row.listing_pk);
    const mappings = [...(media?.image_mappings || [])].sort((a, b) => a.image_index - b.image_index);
    const photos = mappings.length
      ? mappings.map((m, idx) => ({
          id: `${row.listing_pk}_p${idx + 1}`,
          url: mediaUrlForMapping(m),
          kind: mapPhotoKind(idx),
        }))
      : (row.images || []).map((url, idx) => ({
          id: `${row.listing_pk}_p${idx + 1}`,
          url,
          kind: mapPhotoKind(idx),
        }));

    const estimate = typeof row.price === "number" ? row.price : null;
    const low = estimate != null ? Math.round(estimate * 0.85) : null;
    const high = estimate != null ? Math.round(estimate * 1.15) : null;

    return {
      id: row.listing_pk,
      object_type: "ARTIFACT",
      brand_key: normalizeBrandKey(row.brand),
      family: null,
      model_code: row.model_code || row.model || null,
      made_in: null,
      position: row.position || row.player_position || null,
      size_in: typeof row.size_in === "number" ? row.size_in : null,
      verification_status: "Unverified",
      condition_score: inferConditionScore(row.condition),
      valuation_estimate: estimate,
      valuation_low: low,
      valuation_high: high,
      listing_url: row.url || null,
      source: row.source || null,
      photos,
    } as Artifact;
  })
  .filter((row): row is Artifact => Boolean(row));

const artifacts: Artifact[] = exportArtifacts.length ? exportArtifacts : seedArtifacts;
const prisma = new PrismaClient();
async function findAppraisalImageBySha(sha256: string) {
  return prisma.appraisalImage.findUnique({ where: { sha256 } });
}

async function findAppraisalImageByPhotoId(photoId: string) {
  return prisma.appraisalImage.findUnique({ where: { imageId: photoId } });
}

async function upsertAppraisalImageRecord(params: {
  photoId: string;
  sha256: string;
  name: string;
  mime: string;
  bytes: number;
  url: string;
  storage: "local" | "b2";
  b2Bucket: string | null;
  b2Key: string | null;
}) {
  return prisma.appraisalImage.upsert({
    where: { imageId: params.photoId },
    update: {
      sha256: params.sha256,
      name: params.name,
      mime: params.mime,
      bytes: params.bytes,
      url: params.url,
      storage: params.storage.toUpperCase() as any,
      b2Bucket: params.b2Bucket,
      b2Key: params.b2Key,
    },
    create: {
      imageId: params.photoId,
      sha256: params.sha256,
      name: params.name,
      mime: params.mime,
      bytes: params.bytes,
      url: params.url,
      storage: params.storage.toUpperCase() as any,
      b2Bucket: params.b2Bucket,
      b2Key: params.b2Key,
    },
  });
}

async function recordAppraisalArtifactImages(params: {
  artifactId: string;
  bundleHash: string;
  uploads: Array<{ photoId: string }>;
  roles: Array<{ role: string; usable: boolean }>;
}) {
  for (let i = 0; i < params.uploads.length; i += 1) {
    const image = await findAppraisalImageByPhotoId(params.uploads[i].photoId);
    if (!image) continue;
    await prisma.appraisalArtifactImage.create({
      data: {
        artifactId: params.artifactId,
        imageId: image.id,
        role: params.roles[i].role,
        usable: params.roles[i].usable,
        bundleHash: params.bundleHash,
      },
    });
  }
}

async function recordAppraisalRuns(params: {
  artifactId: string;
  bundleHash: string;
  identifyInputHash: string;
  identifyStage: any;
  evidenceStage: any;
  valuationStage: any;
  recommendationStage: any;
  nowIso: string;
  compsCount: number;
  routeMode: string;
  routeReason: string;
}) {
  await prisma.appraisalAiRun.create({
    data: {
      runId: `run_${stableHash(`${params.artifactId}_${params.nowIso}_identify`).slice(0, 12)}`,
      artifactId: params.artifactId,
      bundleHash: params.bundleHash,
      stage: "identify",
      model: process.env.OPENAI_APPRAISAL_MODEL || "gpt-4.1",
      inputHash: params.identifyInputHash,
      output: params.identifyStage,
    },
  });
  await prisma.appraisalAiRun.create({
    data: {
      runId: `run_${stableHash(`${params.artifactId}_${params.nowIso}_evidence`).slice(0, 12)}`,
      artifactId: params.artifactId,
      bundleHash: params.bundleHash,
      stage: "evidence",
      model: "rules+vision",
      inputHash: stableHash(`evidence|${params.bundleHash}`),
      output: params.evidenceStage,
    },
  });
  await prisma.appraisalValuationRun.create({
    data: {
      runId: `vrun_${stableHash(`${params.artifactId}_${params.nowIso}`).slice(0, 12)}`,
      artifactId: params.artifactId,
      bundleHash: params.bundleHash,
      mode: params.routeMode,
      compsUsed: params.compsCount,
      output: { valuationStage: params.valuationStage, recommendationStage: params.recommendationStage },
    },
  });
  await prisma.appraisalVerificationEvent.create({
    data: {
      eventId: `vev_${stableHash(`${params.artifactId}_${params.nowIso}_${params.routeMode}`).slice(0, 12)}`,
      artifactId: params.artifactId,
      fromState: "unverified",
      toState: params.routeMode,
      reason: params.routeReason,
    },
  });
}

const libraryStore = loadLibraryStore({ exportDir: libraryExportDir, env: process.env, prisma });

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/system/config", (_req, res) => res.json({
  ok: true,
  publicBaseUrl: runtimeConfig.publicBaseUrl,
  webAppUrl: runtimeConfig.webAppUrl,
  allowedOrigins: runtimeConfig.allowedOrigins,
  readiness: configReadiness(runtimeConfig),
}));
app.get(`${libraryApiBasePath}/health`, async (_req, res) => res.json({ ok: true, stats: await libraryStore.stats() }));
app.get(`${libraryApiBasePath}/search`, async (req, res) => {
  const q = String(req.query.q || "");
  return res.json({ results: await libraryStore.search(q) });
});
app.get(`${libraryApiBasePath}/gloves/:id`, async (req, res) => {
  const detail = await libraryStore.gloveDetail(String(req.params.id || ""));
  if (!detail) return res.status(404).json({ error: "Glove not found" });
  return res.json(detail);
});
app.post(`${libraryApiBasePath}/gloves/:id/refresh-market`, async (req, res) => {
  try {
    const gloveId = String(req.params.id || "");
    if (!gloveId) return res.status(400).json({ error: "Glove id is required" });

    const gloveRows = await prisma.$queryRawUnsafe<Array<{
      id: string;
      canonical_name: string | null;
      item_number: string | null;
      pattern: string | null;
      series: string | null;
      size_in: number | null;
      brand: string | null;
    }>>(
      `
        SELECT
          g.id::text AS id,
          g.canonical_name,
          g.item_number,
          g.pattern,
          g.series,
          g.size_in::float8 AS size_in,
          b.name AS brand
        FROM gloves g
        LEFT JOIN brands b ON b.id = g.manufacturer_brand_id
        WHERE g.id::text = $1
        LIMIT 1
      `,
      gloveId,
    );
    const glove = gloveRows[0];
    if (!glove) return res.status(404).json({ error: "Glove not found" });

    const query = [
      glove.brand,
      glove.item_number && glove.item_number !== "Unknown" ? glove.item_number : null,
      glove.series,
      glove.pattern,
      glove.canonical_name,
      glove.size_in ? `${String(glove.size_in).replace(/\.0$/, "")}"` : null,
      "baseball glove",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const globalIds = String(process.env.EBAY_SYNC_GLOBAL_IDS || EBAY_GLOBAL_IDS.join(","))
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    const activeRows = await fetchEbayMarketplaceRows({
      env: process.env,
      brands,
      query,
      perMarket: Math.min(25, Math.max(10, Number(process.env.EBAY_SYNC_PER_MARKET || 20))),
      pages: 1,
      globalIds: globalIds.length ? globalIds : EBAY_GLOBAL_IDS,
      mode: "active",
    });

    let soldRows: Awaited<ReturnType<typeof fetchEbayMarketplaceRows>> = [];
    try {
      soldRows = await fetchEbayMarketplaceRows({
        env: process.env,
        brands,
        query,
        perMarket: 10,
        pages: 1,
        globalIds: globalIds.length ? globalIds : EBAY_GLOBAL_IDS,
        mode: "sold",
      });
    } catch (error) {
      console.warn("[library-refresh] sold sync skipped", error);
    }

    const persisted = await persistEbayListings({
      prisma,
      env: process.env,
      brands,
      rows: [...activeRows, ...soldRows],
      query,
      mode: soldRows.length ? "sold" : "active",
    });
    await recomputeGloveMarketSummaries(prisma, [gloveId, ...(persisted.gloveIds || [])]);

    const detail = await libraryStore.gloveDetail(gloveId);
    if (!detail) return res.status(404).json({ error: "Glove not found after refresh" });
    return res.json(detail);
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});
app.get(`${libraryApiBasePath}/listings/:id`, async (req, res) => {
  const detail = await libraryStore.listingDetail(String(req.params.id || ""));
  if (!detail) return res.status(404).json({ error: "Listing not found" });
  return res.json(detail);
});
app.get("/media/key/:encoded(*)", (req, res) => {
  const key = String(req.params.encoded || "").replace(/^\/+/, "");
  const sourceUrl = String(req.query.source_url || "");
  const exp = String(req.query.exp || "");
  const sig = String(req.query.sig || "");
  const signingSecret = runtimeConfig.backblaze.signingSecret;
  if (!key) return res.status(400).json({ error: "Missing media key" });
  if (signingSecret) {
    const expInt = Number(exp);
    if (!Number.isFinite(expInt) || expInt < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: "Expired media signature" });
    }
    const expected = crypto.createHmac("sha256", signingSecret).update(`${key}.${exp}`).digest("hex");
    if (!sig || sig !== expected) return res.status(401).json({ error: "Invalid media signature" });
  }
  if (b2PublicBaseUrl) return res.redirect(302, `${b2PublicBaseUrl}/${key}`);
  if (runtimeConfig.backblaze.bucketName && runtimeConfig.backblaze.bucketId && runtimeConfig.backblaze.keyId && runtimeConfig.backblaze.applicationKey) {
    downloadFromBackblazeByKey(runtimeConfig, key)
      .then((file) => {
        res.setHeader("Content-Type", file.contentType);
        if (file.contentLength) res.setHeader("Content-Length", file.contentLength);
        if (file.etag) res.setHeader("ETag", file.etag);
        if (file.cacheControl) res.setHeader("Cache-Control", file.cacheControl);
        return res.status(200).send(file.body);
      })
      .catch(() => {
        if (/^https?:\/\//i.test(sourceUrl)) return res.redirect(302, sourceUrl);
        return res.status(404).json({ error: "Media not found in Backblaze." });
      });
    return;
  }
  if (/^https?:\/\//i.test(sourceUrl)) return res.redirect(302, sourceUrl);
  return res.status(404).json({ error: "Media not resolvable. Set B2_PUBLIC_BASE_URL or provide source fallback." });
});
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
  const limit = Number(req.query.limit || 0);
  const offset = Math.max(0, Number(req.query.offset || 0));
  const rows = !q ? variants : variants.filter((v) => JSON.stringify(v).toLowerCase().includes(q));
  const paged = limit > 0 ? rows.slice(offset, offset + limit) : rows;
  res.setHeader("x-total-count", String(rows.length));
  res.json(paged);
});
app.get("/comps", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const limit = Number(req.query.limit || 0);
  const offset = Math.max(0, Number(req.query.offset || 0));
  const rows = !q ? comps : comps.filter((c) => JSON.stringify(c).toLowerCase().includes(q));
  const paged = limit > 0 ? rows.slice(offset, offset + limit) : rows;
  res.setHeader("x-total-count", String(rows.length));
  res.json(paged);
});
app.get("/sales", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const limit = Number(req.query.limit || 0);
  const offset = Math.max(0, Number(req.query.offset || 0));
  const live = ["1", "true", "yes"].includes(String(req.query.live || "").toLowerCase());
  const liveOnly = ["1", "true", "yes"].includes(String(req.query.live_only || "").toLowerCase());
  const perMarket = Math.min(100, Math.max(5, Number(req.query.per_market || 25)));
  const queryText = String(req.query.query || req.query.keywords || "baseball glove");
  const globalIds = String(req.query.global_ids || "")
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const marketIds = globalIds.length ? globalIds : EBAY_GLOBAL_IDS;

  let liveRows: LiveSaleRow[] = [];
  if (live) {
    if (!hasEbayLiveConfig()) {
      res.setHeader("x-live-source", "unavailable");
      res.setHeader("x-live-count", "0");
    } else {
      try {
        const ebayRows = await fetchEbayMarketplaceRows({
          env: process.env,
          brands,
          query: queryText,
          perMarket,
          globalIds: marketIds,
          pages: 1,
          mode: "active",
        });
        liveRows = ebayRows.map((row) => ({
          sale_id: `ebay_${row.marketplaceId}_${row.externalListingId}`,
          variant_id: "unknown_variant",
          brand_key: row.brandKey,
          sale_date: row.fetchedAt,
          price_usd: Number(row.priceAmount || 0),
          condition_score_proxy: conditionScoreFromText(row.condition),
          source: row.source,
          source_url: row.listingUrl,
          is_referral: false,
        }));
        res.setHeader("x-live-source", "ebay");
        res.setHeader("x-live-count", String(liveRows.length));
      } catch {
        res.setHeader("x-live-source", "error");
      }
    }
  }

  const baseRows = liveOnly ? [] : sales;
  const merged = [...liveRows, ...baseRows];
  const rows = !q ? merged : merged.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
  const paged = limit > 0 ? rows.slice(offset, offset + limit) : rows;
  res.setHeader("x-total-count", String(rows.length));
  res.json(paged);
});

app.get("/api/home/dashboard", async (req, res) => {
  try {
    const windowKey = parseHomeWindowKey(String(req.query.window || req.query.window_key || "1mo"));
    const brandKey = String(req.query.brand || "all");
    const countryKey = String(req.query.country || "all");
    const rows = await loadHomeDashboardRows(prisma);
    return res.json(buildHomeDashboardPayload(rows, { windowKey, brandKey, countryKey }));
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});

app.post("/api/ops/sync/ebay", async (req, res) => {
  try {
    const query = String(req.body?.query || req.query.query || "baseball glove");
    const perMarket = Math.min(100, Math.max(5, Number(req.body?.perMarket || req.query.per_market || 25)));
    const pages = Math.max(1, Math.min(10, Number(req.body?.pages || req.query.pages || 1)));
    const mode = String(req.body?.mode || req.query.mode || "active").toLowerCase() === "sold" ? "sold" : "active";
    const globalIds = String(req.body?.globalIds || req.query.global_ids || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    const rows = await fetchEbayMarketplaceRows({
      env: process.env,
      brands,
      query,
      perMarket,
      pages,
      globalIds: globalIds.length ? globalIds : EBAY_GLOBAL_IDS,
      mode,
    });
    const persisted = await persistEbayListings({ prisma, env: process.env, brands, rows, query, mode });
    return res.json({
      ok: true,
      query,
      mode,
      fetched: rows.length,
      persisted: persisted.persisted,
      matched: persisted.matched,
    });
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});

app.get("/api/ops/ingest/overview", async (_req, res) => {
  try {
    const [latestRuns, imageStatuses, recentErrors] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ id: string; run_type: string; status: string; started_at: string | null; completed_at: string | null; metrics: unknown; error_summary: string | null }>>(
        `SELECT id::text AS id, run_type, status::text AS status, started_at, completed_at, metrics, error_summary FROM ingest_runs ORDER BY created_at DESC LIMIT 10`,
      ),
      prisma.$queryRawUnsafe<Array<{ fetch_status: string; count: number }>>(
        `SELECT fetch_status::text AS fetch_status, COUNT(*)::int AS count FROM raw_listing_images GROUP BY fetch_status ORDER BY fetch_status`,
      ),
      prisma.$queryRawUnsafe<Array<{ created_at: string; phase: string; severity: string; code: string | null; message: string }>>(
        `SELECT created_at, phase, severity, code, message FROM ingest_errors ORDER BY created_at DESC LIMIT 20`,
      ),
    ]);
    return res.json({ runs: latestRuns, imageStatuses, recentErrors });
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});

app.get("/api/ops/market/unmatched", async (req, res) => {
  try {
    const limit = Math.max(10, Math.min(200, Number(req.query.limit || 50)));
    const source = String(req.query.source || "").trim();
    const rows = await prisma.$queryRawUnsafe<Array<{
      listing_id: string;
      title: string | null;
      price_amount: number | null;
      price_currency: string | null;
      listing_url: string | null;
      available: boolean | null;
      source_name: string | null;
      marketplace_id: string | null;
      updated_at: string | null;
      external_listing_id: string | null;
      raw_payload_json: unknown;
    }>>(
      `
        SELECT
          l.id::text AS listing_id,
          l.title,
          l.price_amount,
          l.price_currency,
          l.listing_url,
          l.available,
          s.name AS source_name,
          s.marketplace_id,
          l.updated_at::text,
          l.external_listing_id,
          rlp.raw_payload_json
        FROM listings l
        LEFT JOIN sources s ON s.id = l.source_id
        LEFT JOIN raw_listing_payloads rlp
          ON rlp.source_id = l.source_id
         AND rlp.external_listing_id = l.external_listing_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM listing_glove_links lgl
          WHERE lgl.listing_id = l.id
        )
        ${source ? "AND COALESCE(s.name, '') = $2" : ""}
        ORDER BY l.updated_at DESC NULLS LAST
        LIMIT $1
      `,
      ...(source ? [limit, source] : [limit]),
    );
    return res.json({ items: rows });
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});

app.post("/api/ops/ingest/runs/:runId/retry-failed-images", async (req, res) => {
  try {
    const runId = String(req.params.runId || "");
    if (!runId) return res.status(400).json({ error: "runId is required" });
    const result = await prisma.$executeRawUnsafe(`
      UPDATE raw_listing_images
      SET fetch_status = 'PENDING',
          last_error = NULL,
          updated_at = now()
      WHERE raw_listing_id IN (
        SELECT rlp.id
        FROM raw_listing_payloads rlp
        WHERE rlp.ingest_run_id = $1::uuid
      )
      AND fetch_status = 'FAILED'
    `, runId);
    return res.json({ ok: true, resetRows: Number(result || 0) });
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});

app.get("/artifacts", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const photoMode = String(req.query.photo_mode || "full").toLowerCase();
  const limit = Number(req.query.limit || 0);
  const offset = Math.max(0, Number(req.query.offset || 0));
  const rows = !q ? artifacts : artifacts.filter((a) => JSON.stringify(a).toLowerCase().includes(q));

  const rowsWithPhotoMode = rows.map((a) => {
    if (photoMode === "none") return { ...a, photos: [] };
    if (photoMode === "hero") return { ...a, photos: (a.photos || []).slice(0, 1) };
    return a;
  });
  const paged = limit > 0 ? rowsWithPhotoMode.slice(offset, offset + limit) : rowsWithPhotoMode;
  res.setHeader("x-total-count", String(rows.length));
  res.json(paged);
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

app.post("/photos/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const sha = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const hit = getCache(photoHashCache, sha);
  if (hit) return res.json({ photo_id: hit.photo_id, deduped: true });

  const existing = await findAppraisalImageBySha(sha);
  if (existing) {
    setCache(photoHashCache, sha, { photo_id: existing.imageId }, 24 * 60 * 60 * 1000);
    return res.json({ photo_id: existing.imageId, deduped: true });
  }

  const photo_id = "ph_" + sha.slice(0, 10);
  setCache(photoHashCache, sha, { photo_id }, 24 * 60 * 60 * 1000);
  try {
    const persisted = await persistPhotoUpload({ file: req.file, photoId: photo_id });
    await upsertAppraisalImageRecord({
      photoId: photo_id,
      sha256: sha,
      name: req.file.originalname,
      mime: req.file.mimetype,
      bytes: req.file.size,
      url: persisted.url,
      storage: persisted.storage,
      b2Bucket: persisted.b2Bucket,
      b2Key: persisted.b2Key,
    });
    return res.json({ photo_id, deduped: false });
  } catch (error) {
    return res.status(500).json({ error: String((error as Error).message || error) });
  }
});

app.post("/appraisal/analyze", uploadMany.array("files", 10), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ error: "Missing files" });
    const hint = String(req.body?.hint || "");
    const artifactId = String(req.body?.artifact_id || `art_live_${stableHash(`${hint}_${Date.now()}`).slice(0, 10)}`);
    const nowIso = new Date().toISOString();

    const uploads = await Promise.all(files.map(async (file) => {
      const sha = crypto.createHash("sha256").update(file.buffer).digest("hex");
      const hit = getCache(photoHashCache, sha);
      if (hit) {
        const existing = await findAppraisalImageByPhotoId(hit.photo_id);
        if (existing) {
          return {
            name: file.originalname,
            photoId: hit.photo_id,
            deduped: true,
            sha256: sha,
            url: existing.url,
          };
        }
        const persisted = await persistPhotoUpload({ file, photoId: hit.photo_id });
        await upsertAppraisalImageRecord({
          photoId: hit.photo_id,
          sha256: sha,
          name: file.originalname,
          mime: file.mimetype,
          bytes: file.size,
          url: persisted.url,
          storage: persisted.storage,
          b2Bucket: persisted.b2Bucket,
          b2Key: persisted.b2Key,
        });
        return {
          name: file.originalname,
          photoId: hit.photo_id,
          deduped: true,
          sha256: sha,
          url: persisted.url,
        };
      }
      const photo_id = "ph_" + sha.slice(0, 10);
      setCache(photoHashCache, sha, { photo_id }, 24 * 60 * 60 * 1000);
      const persisted = await persistPhotoUpload({ file, photoId: photo_id });
      await upsertAppraisalImageRecord({
        photoId: photo_id,
        sha256: sha,
        name: file.originalname,
        mime: file.mimetype,
        bytes: file.size,
        url: persisted.url,
        storage: persisted.storage,
        b2Bucket: persisted.b2Bucket,
        b2Key: persisted.b2Key,
      });
      return {
        name: file.originalname,
        photoId: photo_id,
        deduped: false,
        sha256: sha,
        url: persisted.url,
      };
    }));
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

    await recordAppraisalArtifactImages({ artifactId, bundleHash, uploads, roles });
    await recordAppraisalRuns({
      artifactId,
      bundleHash,
      identifyInputHash,
      identifyStage,
      evidenceStage,
      valuationStage,
      recommendationStage,
      nowIso,
      compsCount,
      routeMode: route.mode,
      routeReason: route.reason,
    });

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

app.get("/appraisal/runs", async (_req, res) => {
  const [
    images,
    artifactImages,
    aiRuns,
    valuationRuns,
    verificationEvents,
    latestAiRuns,
    latestValuationRuns,
  ] = await Promise.all([
    prisma.appraisalImage.count(),
    prisma.appraisalArtifactImage.count(),
    prisma.appraisalAiRun.count(),
    prisma.appraisalValuationRun.count(),
    prisma.appraisalVerificationEvent.count(),
    prisma.appraisalAiRun.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.appraisalValuationRun.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  res.json({
    images,
    artifact_images: artifactImages,
    ai_runs: aiRuns,
    valuation_runs: valuationRuns,
    verification_events: verificationEvents,
    latest_ai_runs: latestAiRuns,
    latest_valuation_runs: latestValuationRuns,
  });
});

mountCollectionRoutes(app, {
  prisma,
  variants,
  patterns,
  sales,
  artifacts: artifacts.map((item) => ({
    model_code: item.model_code || null,
    listing_url: item.listing_url || null,
  })),
});

const port = resolvedPort;
ensureRuntimeStorage();
app.listen(port, () => console.log(`[api] http://localhost:${port}`));
