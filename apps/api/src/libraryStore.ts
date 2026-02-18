import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type ListingRow = {
  listing_pk: string;
  glove_id?: string;
  record_type?: "variant" | "artifact";
  source: string;
  source_listing_id: string;
  url: string;
  title?: string | null;
  canonical_name?: string | null;
  brand?: string | null;
  model?: string | null;
  model_code?: string | null;
  size_in?: number | null;
  hand?: string | null;
  throw_hand?: string | null;
  player_position?: string | null;
  position?: string | null;
  web_type?: string | null;
  sport?: string | null;
  condition?: string | null;
  price?: number | null;
  currency?: string | null;
  created_at?: string | null;
  seen_at?: string | null;
  item_number?: string | null;
  pattern?: string | null;
  series?: string | null;
  level?: string | null;
  age_group?: string | null;
  market_origin?: string | null;
  raw_specs?: Record<string, unknown> | null;
  spec_fields_raw?: Record<string, string | null> | null;
  normalized_specs?: Record<string, string | null> | null;
  normalized_confidence?: Record<string, number> | null;
  raw_html?: string | null;
  raw_text?: string | null;
  images?: string[] | null;
};

type MediaManifestRow = {
  listing_pk: string;
  ordered_image_urls: string[];
  image_mappings: Array<{
    image_index: number;
    source_url: string;
    target_storage_key: string;
    content_type?: string;
    mapping_key?: string;
  }>;
};

export type LibrarySearchResult = {
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

export type LibraryGloveDetail = {
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

export type LibraryListingDetail = {
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

type GloveAggregate = {
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
  market_origin: string | null;
  normalized_specs: Record<string, string | null>;
  confidence: Record<string, number>;
  listing_ids: string[];
};

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  const out: T[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      // ignore malformed line
    }
  }
  return out;
}

function hashHex(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function stableGloveId(row: ListingRow): string {
  if (row.glove_id) return row.glove_id;
  if ((row.record_type || "artifact") === "variant") {
    return `variant:${hashHex([row.brand || "", row.model_code || row.model || "", String(row.size_in || ""), row.throw_hand || ""].join("|"))}`;
  }
  return `artifact:${row.source}:${row.source_listing_id}`;
}

function signB2Key(key: string, sourceUrl: string | null, env: NodeJS.ProcessEnv): string | null {
  const signerBase = String(env.B2_SIGNING_BASE_URL || "").trim().replace(/\/+$/, "");
  const secret = String(env.B2_SIGNING_SECRET || "").trim();
  if (!key) return null;
  if (!signerBase) return sourceUrl || null;
  if (!secret) return `${signerBase}/media/key/${encodeURIComponent(key)}`;
  const exp = String(Math.floor(Date.now() / 1000) + 15 * 60);
  const sig = crypto.createHmac("sha256", secret).update(`${key}.${exp}`).digest("hex");
  return `${signerBase}/media/key/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
}

export function loadLibraryStore(params: {
  exportDir: string;
  env: NodeJS.ProcessEnv;
}) {
  const normalizedPath = path.join(params.exportDir, "listings.normalized.jsonl");
  const manifestPath = path.join(params.exportDir, "media_manifest.jsonl");
  const listingRows = readJsonl<ListingRow>(normalizedPath);
  const manifestRows = readJsonl<MediaManifestRow>(manifestPath);
  const mediaByListing = new Map(manifestRows.map((m) => [m.listing_pk, m]));

  const byListingId = new Map<string, ListingRow>();
  for (const row of listingRows) byListingId.set(row.listing_pk, row);

  const byGlove = new Map<string, GloveAggregate>();
  for (const row of listingRows) {
    const gloveId = stableGloveId(row);
    const recordType = (row.record_type || "artifact") as "variant" | "artifact";
    const specFields = row.spec_fields_raw || {};
    const confidence = row.normalized_confidence || {};
    const existing = byGlove.get(gloveId);
    if (!existing) {
      byGlove.set(gloveId, {
        id: gloveId,
        record_type: recordType,
        canonical_name: row.canonical_name || row.title || "Unknown",
        brand: row.brand || null,
        item_number: row.item_number || row.model_code || null,
        pattern: row.pattern || null,
        series: row.series || null,
        level: row.level || null,
        sport: row.sport || null,
        age_group: row.age_group || null,
        size_in: typeof row.size_in === "number" ? row.size_in : null,
        throwing_hand: row.throw_hand || row.hand || null,
        market_origin: row.market_origin || null,
        normalized_specs: { ...specFields },
        confidence: { ...confidence },
        listing_ids: [row.listing_pk],
      });
    } else {
      existing.listing_ids.push(row.listing_pk);
      for (const [k, v] of Object.entries(specFields)) {
        if (!existing.normalized_specs[k] && v) existing.normalized_specs[k] = v;
      }
      for (const [k, v] of Object.entries(confidence)) {
        existing.confidence[k] = Math.max(Number(existing.confidence[k] || 0), Number(v || 0));
      }
    }
  }

  const gloves = [...byGlove.values()].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
  const glovesById = new Map(gloves.map((g) => [g.id, g]));

  function search(qRaw: string) {
    const q = qRaw.trim().toLowerCase();
    const rows = !q
      ? gloves
      : gloves.filter((g) =>
          [
            g.canonical_name,
            g.brand,
            g.item_number,
            g.pattern,
            g.series,
            g.level,
            g.sport,
            g.age_group,
            g.throwing_hand,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        );

    return rows.map((g): LibrarySearchResult => {
      const listings = g.listing_ids.map((id) => byListingId.get(id)).filter((r): r is ListingRow => Boolean(r));
      const prices = listings.map((r) => (typeof r.price === "number" ? r.price : null)).filter((v): v is number => v != null);
      const hero = listings[0] ? mediaByListing.get(listings[0].listing_pk)?.image_mappings?.[0] : null;
      return {
        id: g.id,
        record_type: g.record_type,
        canonical_name: g.canonical_name,
        brand: g.brand,
        item_number: g.item_number,
        pattern: g.pattern,
        series: g.series,
        level: g.level,
        sport: g.sport,
        age_group: g.age_group,
        size_in: g.size_in,
        throwing_hand: g.throwing_hand,
        price_summary: {
          count: prices.length,
          min: prices.length ? Math.min(...prices) : null,
          max: prices.length ? Math.max(...prices) : null,
          avg: prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null,
          currency: listings.find((r) => r.currency)?.currency || null,
        },
        hero_image_url: hero ? signB2Key(hero.target_storage_key, hero.source_url, params.env) : null,
      };
    });
  }

  function listingDetail(id: string): LibraryListingDetail | null {
    const listing = byListingId.get(id);
    if (!listing) return null;
    const media = mediaByListing.get(id);
    const specRows = Object.entries(listing.spec_fields_raw || {}).map(([k, v]) => ({
      spec_key: k,
      spec_value: v == null ? null : String(v),
      source_label: "xlsx",
    }));
    const images = (media?.image_mappings || []).map((m) => ({
      role: m.image_index === 1 ? "HERO" : m.image_index === 2 ? "PALM" : m.image_index === 3 ? "BACK" : "OTHER",
      b2_key: m.target_storage_key,
      source_url: m.source_url || null,
      signed_url: signB2Key(m.target_storage_key, m.source_url || null, params.env),
    }));
    return {
      id: listing.listing_pk,
      glove_id: stableGloveId(listing),
      record_type: (listing.record_type || "artifact") as "variant" | "artifact",
      source: listing.source,
      source_listing_id: listing.source_listing_id,
      url: listing.url || null,
      title: listing.title || null,
      condition: listing.condition || null,
      price_amount: typeof listing.price === "number" ? listing.price : null,
      price_currency: listing.currency || null,
      available: true,
      created_at: listing.created_at || null,
      seen_at: listing.seen_at || null,
      raw_specs: specRows,
      raw: { html: listing.raw_html || null, text: listing.raw_text || null },
      images,
    };
  }

  function gloveDetail(id: string): LibraryGloveDetail | null {
    const glove = glovesById.get(id);
    if (!glove) return null;
    const listings = glove.listing_ids.map((lid) => byListingId.get(lid)).filter((v): v is ListingRow => Boolean(v));
    const prices = listings.map((r) => (typeof r.price === "number" ? r.price : null)).filter((v): v is number => v != null);
    const images: Array<{ listing_id: string; role: string; url: string }> = [];
    for (const listing of listings) {
      const media = mediaByListing.get(listing.listing_pk);
      for (const mapping of media?.image_mappings || []) {
        images.push({
          listing_id: listing.listing_pk,
          role: mapping.image_index === 1 ? "HERO" : mapping.image_index === 2 ? "PALM" : mapping.image_index === 3 ? "BACK" : "OTHER",
          url: signB2Key(mapping.target_storage_key, mapping.source_url || null, params.env) || "",
        });
      }
    }
    return {
      id: glove.id,
      record_type: glove.record_type,
      canonical_name: glove.canonical_name,
      item_number: glove.item_number,
      pattern: glove.pattern,
      series: glove.series,
      level: glove.level,
      sport: glove.sport,
      age_group: glove.age_group,
      size_in: glove.size_in,
      throwing_hand: glove.throwing_hand,
      market_origin: glove.market_origin,
      normalized_specs: glove.normalized_specs,
      confidence: glove.confidence,
      metrics: {
        listings_count: listings.length,
        available_count: listings.length,
        price_min: prices.length ? Math.min(...prices) : null,
        price_max: prices.length ? Math.max(...prices) : null,
        price_avg: prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null,
      },
      images,
      listings: listings.map((l) => ({
        id: l.listing_pk,
        title: l.title || null,
        price: typeof l.price === "number" ? l.price : null,
        currency: l.currency || null,
        url: l.url || null,
        source: l.source,
      })),
    };
  }

  return {
    stats: { listings: listingRows.length, gloves: gloves.length },
    search,
    gloveDetail,
    listingDetail,
  };
}
