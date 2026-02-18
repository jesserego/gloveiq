import type { Artifact, BrandConfig } from "@gloveiq/shared";
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

export const api = {
  brands: () => json<BrandConfig[]>(`${API_BASE}/brands`),
  families: (q?: string) => json<FamilyRecord[]>(`${API_BASE}/families${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  patterns: (q?: string) => json<PatternRecord[]>(`${API_BASE}/patterns${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  variants: (q?: string) => json<VariantRecord[]>(`${API_BASE}/variants${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  comps: (q?: string) => json<CompRecord[]>(`${API_BASE}/comps${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  sales: (q?: string) => json<SaleRecord[]>(`${API_BASE}/sales${q ? `?q=${encodeURIComponent(q)}` : ""}`),
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
};
