import type { Artifact, BrandConfig } from "@gloveiq/shared";
import type { Tier } from "@gloveiq/shared";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";
async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  return (await res.json()) as T;
}

export type FamilyRecord = {
  family_id: string;
  brand_key: string;
  family_key: string;
  display_name: string;
  tier: string;
  default_country_hint: string | null;
};

export type PatternRecord = {
  pattern_id: string;
  brand_key: string;
  family_id: string;
  pattern_system: string;
  pattern_code: string;
  canonical_position: string;
  canonical_size_in: number | null;
  canonical_web: string | null;
};

export type VariantRecord = {
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

export type CompRecord = {
  comp_set_id: string;
  artifact_id: string;
  method: string;
  sales_ids: string[];
  notes: string | null;
};

export type SaleRecord = {
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

type SalesOptions = {
  live?: boolean;
  liveOnly?: boolean;
  query?: string;
  perMarket?: number;
  globalIds?: string[];
};

export type HomeDashboardData = {
  global: {
    totalValue: number;
    totalCount: number;
    countries: Array<{
      country: string;
      value: number;
      count: number;
      change_pct: number;
    }>;
  };
  marketSnapshot: {
    sold: { value: number; deltaPct: number; spark: number[] };
    active: { value: number; deltaPct: number; spark: number[] };
    sellThrough: { value: number; deltaPct: number; spark: number[] };
  };
  priceOverview: {
    currentMedian: number;
    medianWindow: number;
    p10: number;
    p90: number;
    deltaPct: number;
  };
  salesTrend: {
    series: Array<{
      label: string;
      medianPrice: number;
      salesCount: number;
      p10: number;
      p90: number;
    }>;
    windowMedian: number;
    windowSales: number;
  };
  brandModelInsights: {
    brands: Array<{ brand: string; volume: number }>;
    trending: Array<{ model: string; trendPct: number }>;
    fastest: Array<{ model: string; avgDaysToSell: number }>;
  };
  listings: Array<{
    title: string;
    price: number;
    source: string;
    country: string;
    date: string;
    url: string;
  }>;
};

export type AppraisalAnalyzeResponse = {
  artifactId?: string;
  uploads: Array<{ name: string; photoId: string; deduped: boolean }>;
  stages?: {
    identify?: any;
    evidence?: any;
    valuation?: any;
    recommendation?: any;
  };
  appraisal: any;
  cache?: string;
};

export type LibrarySearchRow = {
  id: string;
  record_type: "variant" | "artifact";
  canonical_name: string;
  brand: string | null;
  item_number: string | null;
  pattern: string | null;
  series: string | null;
  level: string | null;
  sport: string | null;
  age_group: string | null;
  size_in: number | null;
  throwing_hand: string | null;
  price_summary: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    currency: string | null;
  };
  hero_image_url: string | null;
};

export type LibraryGlove = {
  id: string;
  record_type: "variant" | "artifact";
  canonical_name: string;
  item_number: string | null;
  pattern: string | null;
  series: string | null;
  level: string | null;
  sport: string | null;
  age_group: string | null;
  size_in: number | null;
  throwing_hand: string | null;
  market_origin: string | null;
  normalized_specs: Record<string, string | null>;
  confidence: Record<string, number>;
  metrics: {
    listings_count: number;
    available_count: number;
    price_min: number | null;
    price_max: number | null;
    price_avg: number | null;
  };
  images: Array<{ listing_id: string; role: string; url: string }>;
  listings: Array<{ id: string; title: string | null; price: number | null; currency: string | null; url: string | null; source: string }>;
};

export type LibraryListing = {
  id: string;
  glove_id: string;
  record_type: "variant" | "artifact";
  source: string;
  source_listing_id: string;
  url: string | null;
  title: string | null;
  condition: string | null;
  price_amount: number | null;
  price_currency: string | null;
  available: boolean;
  created_at: string | null;
  seen_at: string | null;
  raw_specs: Array<{ spec_key: string; spec_value: string | null; source_label: string }>;
  raw: { html: string | null; text: string | null };
  images: Array<{ role: string; b2_key: string; source_url: string | null; signed_url: string | null }>;
};

export type CollectionStatus = "OWNED" | "WANT";

export type CollectionVariantSummary = {
  variantId: string;
  brand: string;
  model: string | null;
  pattern: string | null;
  sizeIn: number | null;
  throwHand: string;
  title: string;
  year: number;
  web: string | null;
} | null;

export type CollectionMarketMetrics = {
  currentMedianCents: number | null;
  ma7Cents: number | null;
  ma30Cents: number | null;
  ma90Cents: number | null;
  p10Cents: number | null;
  p90Cents: number | null;
  salesCount30d: number;
  activeListingsCount: number;
  positionValueCents: number | null;
  pnlCents: number | null;
  lastUpdatedAt: string;
};

export type CollectionInspectionFactorScore = {
  factorName: string;
  factorScore: number | null;
  weight: number | null;
  weightedPoints: number | null;
  observations: string | null;
};

export type CollectionInspectionPhoto = {
  id: string;
  photoUrl: string;
  photoType: string | null;
  createdAt: string;
};

export type CollectionInspectionSummary = {
  id: string;
  inspectorType: string;
  inspectionSource: string | null;
  notes?: string | null;
  rawScore: number | null;
  conditionScore: number | null;
  conditionLabel: string | null;
  confidenceScore: number | null;
  restorationNeeded: boolean;
  rarityPreservationFlag: boolean;
  factorScores: CollectionInspectionFactorScore[];
  photos: CollectionInspectionPhoto[];
  createdAt: string;
  updatedAt: string;
};

export type CollectionItem = {
  id: string;
  status: CollectionStatus;
  quantity: number;
  condition: string | null;
  normalizedCondition: string | null;
  acquisitionPriceCents: number | null;
  acquisitionDate: string | null;
  targetPriceCents: number | null;
  notes: string | null;
  sku: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  variant: CollectionVariantSummary;
  inspection: CollectionInspectionSummary | null;
  market: CollectionMarketMetrics;
};

export type CollectionImportRow = {
  id: string;
  jobId: string;
  rawRowJson: Record<string, unknown>;
  matchedVariantId: string | null;
  errorsJson: unknown;
  createdAt: string;
};

export type CollectionImportJob = {
  id: string;
  userId: string;
  status: "PENDING" | "PREVIEW_READY" | "IMPORTED" | "FAILED";
  fileName: string | null;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  errorRows: number;
  createdAt: string;
  updatedAt: string;
  rows: CollectionImportRow[];
};

function authHeaders(tier?: Tier): HeadersInit {
  return {
    "x-user-id": "dev-user",
    "x-user-tier": String(tier || "FREE"),
  };
}

export const api = {
  brands: () => json<BrandConfig[]>(`${API_BASE}/brands`),
  families: (q?: string) => json<FamilyRecord[]>(`${API_BASE}/families${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  patterns: (q?: string) => json<PatternRecord[]>(`${API_BASE}/patterns${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  variants: (q?: string) => json<VariantRecord[]>(`${API_BASE}/variants${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  comps: (q?: string) => json<CompRecord[]>(`${API_BASE}/comps${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  sales: (q?: string, opts?: SalesOptions) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (opts?.live) params.set("live", "1");
    if (opts?.liveOnly) params.set("live_only", "1");
    if (opts?.query) params.set("query", opts.query);
    if (typeof opts?.perMarket === "number") params.set("per_market", String(opts.perMarket));
    if (opts?.globalIds?.length) params.set("global_ids", opts.globalIds.join(","));
    const suffix = params.toString();
    return json<SaleRecord[]>(`${API_BASE}/sales${suffix ? `?${suffix}` : ""}`);
  },
  homeDashboard: (opts?: { window?: string; brand?: string; country?: string }) => {
    const params = new URLSearchParams();
    if (opts?.window) params.set("window", opts.window);
    if (opts?.brand) params.set("brand", opts.brand);
    if (opts?.country) params.set("country", opts.country);
    const suffix = params.toString();
    return json<HomeDashboardData>(`${API_BASE}/api/home/dashboard${suffix ? `?${suffix}` : ""}`);
  },
  artifacts: (
    q?: string,
    opts?: { photoMode?: "none" | "hero" | "full"; limit?: number; offset?: number },
  ) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (opts?.photoMode) params.set("photo_mode", opts.photoMode);
    if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
    if (typeof opts?.offset === "number") params.set("offset", String(opts.offset));
    const suffix = params.toString();
    return json<Artifact[]>(`${API_BASE}/artifacts${suffix ? `?${suffix}` : ""}`);
  },
  artifact: (id: string) => json<Artifact>(`${API_BASE}/artifact/${encodeURIComponent(id)}`),
  uploadPhoto: async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return json<{ photo_id: string; deduped: boolean }>(`${API_BASE}/photos/upload`, { method: "POST", body: fd });
  },
  appraisalAnalyze: async (files: File[], hint?: string) => {
    const fd = new FormData();
    for (const file of files) fd.append("files", file);
    if (hint && hint.trim()) fd.append("hint", hint.trim());
    return json<AppraisalAnalyzeResponse>(`${API_BASE}/appraisal/analyze`, { method: "POST", body: fd });
  },
  librarySearch: async (q: string) => {
    const out = await json<{ results: LibrarySearchRow[] }>(`${API_BASE}/api/library/search?q=${encodeURIComponent(q || "")}`);
    return out.results || [];
  },
  libraryGlove: (id: string) => json<LibraryGlove>(`${API_BASE}/api/library/gloves/${encodeURIComponent(id)}`),
  libraryListing: (id: string) => json<LibraryListing>(`${API_BASE}/api/library/listings/${encodeURIComponent(id)}`),
  meCollection: (status: CollectionStatus, tier?: Tier) => {
    return json<{ items: CollectionItem[] }>(`${API_BASE}/api/me/collection?status=${status}`, { headers: authHeaders(tier) });
  },
  addCollectionItem: (payload: Record<string, unknown>, tier?: Tier) => {
    return json<CollectionItem>(`${API_BASE}/api/me/collection`, {
      method: "POST",
      headers: { ...authHeaders(tier), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  patchCollectionItem: (id: string, payload: Record<string, unknown>, tier?: Tier) => {
    return json<CollectionItem>(`${API_BASE}/api/me/collection/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...authHeaders(tier), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  deleteCollectionItem: (id: string, tier?: Tier) => {
    return json<{ ok: true }>(`${API_BASE}/api/me/collection/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(tier),
    });
  },
  getCollectionInspections: (id: string, tier?: Tier) => {
    return json<{ gloveId: string; inspections: CollectionInspectionSummary[] }>(
      `${API_BASE}/api/me/collection/${encodeURIComponent(id)}/inspections`,
      { headers: authHeaders(tier) },
    );
  },
  createCollectionInspection: (id: string, payload: Record<string, unknown>, tier?: Tier) => {
    return json<CollectionInspectionSummary>(`${API_BASE}/api/me/collection/${encodeURIComponent(id)}/inspections`, {
      method: "POST",
      headers: { ...authHeaders(tier), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  updateCollectionInspection: (id: string, inspectionId: string, payload: Record<string, unknown>, tier?: Tier) => {
    return json<CollectionInspectionSummary>(
      `${API_BASE}/api/me/collection/${encodeURIComponent(id)}/inspections/${encodeURIComponent(inspectionId)}`,
      {
        method: "PATCH",
        headers: { ...authHeaders(tier), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },
  deleteCollectionInspection: (id: string, inspectionId: string, tier?: Tier) => {
    return json<{ ok: true }>(
      `${API_BASE}/api/me/collection/${encodeURIComponent(id)}/inspections/${encodeURIComponent(inspectionId)}`,
      {
        method: "DELETE",
        headers: authHeaders(tier),
      },
    );
  },
  uploadInventoryCsv: async (file: File, tier?: Tier) => {
    const fd = new FormData();
    fd.append("file", file);
    return json<{ jobId: string; status: string; rows: CollectionImportRow[] }>(`${API_BASE}/api/me/inventory/import`, {
      method: "POST",
      headers: authHeaders(tier),
      body: fd,
    });
  },
  getInventoryImportJob: (jobId: string, tier?: Tier) => {
    return json<CollectionImportJob>(`${API_BASE}/api/me/inventory/import/${encodeURIComponent(jobId)}`, { headers: authHeaders(tier) });
  },
  resolveInventoryImportRow: (jobId: string, rowId: string, variantId: string, tier?: Tier) => {
    return json<{ row: CollectionImportRow; matchedRows: number; unmatchedRows: number; errorRows: number }>(
      `${API_BASE}/api/me/inventory/import/${encodeURIComponent(jobId)}/resolve`,
      {
        method: "POST",
        headers: { ...authHeaders(tier), "Content-Type": "application/json" },
        body: JSON.stringify({ rowId, variantId }),
      },
    );
  },
  confirmInventoryImport: (jobId: string, tier?: Tier) => {
    return json<{ ok: boolean; imported: number }>(`${API_BASE}/api/me/inventory/import/${encodeURIComponent(jobId)}/confirm`, {
      method: "POST",
      headers: authHeaders(tier),
    });
  },
};
