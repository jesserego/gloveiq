import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

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
  condition?: string | null;
  price?: number | null;
  currency?: string | null;
  created_at?: string | null;
  seen_at?: string | null;
  item_number?: string | null;
  pattern?: string | null;
  series?: string | null;
  level?: string | null;
  sport?: string | null;
  age_group?: string | null;
  market_origin?: string | null;
  spec_fields_raw?: Record<string, string | null> | null;
  normalized_confidence?: Record<string, number> | null;
  raw_html?: string | null;
  raw_text?: string | null;
};

type MediaManifestRow = {
  listing_pk: string;
  image_mappings: Array<{
    image_index: number;
    source_url: string;
    target_storage_key: string;
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

type FileStore = {
  stats: { listings: number; gloves: number };
  search: (q: string) => LibrarySearchResult[];
  gloveDetail: (id: string) => LibraryGloveDetail | null;
  listingDetail: (id: string) => LibraryListingDetail | null;
};

export type LibraryStore = {
  stats: () => Promise<{ listings: number; gloves: number }>;
  search: (q: string) => Promise<LibrarySearchResult[]>;
  gloveDetail: (id: string) => Promise<LibraryGloveDetail | null>;
  listingDetail: (id: string) => Promise<LibraryListingDetail | null>;
};

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as T];
      } catch {
        return [];
      }
    });
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
  if (!key) return sourceUrl || null;
  if (!signerBase) return sourceUrl || null;
  if (!secret) return `${signerBase}/media/key/${encodeURIComponent(key)}`;
  const exp = String(Math.floor(Date.now() / 1000) + 15 * 60);
  const sig = crypto.createHmac("sha256", secret).update(`${key}.${exp}`).digest("hex");
  return `${signerBase}/media/key/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
}

function buildFileStore(params: { exportDir: string; env: NodeJS.ProcessEnv }): FileStore {
  const normalizedPath = path.join(params.exportDir, "listings.normalized.jsonl");
  const manifestPath = path.join(params.exportDir, "media_manifest.jsonl");
  const listingRows = readJsonl<ListingRow>(normalizedPath);
  const manifestRows = readJsonl<MediaManifestRow>(manifestPath);
  const mediaByListing = new Map(manifestRows.map((m) => [m.listing_pk, m]));
  const byListingId = new Map<string, ListingRow>();
  const byGlove = new Map<string, {
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
  }>();

  for (const row of listingRows) {
    byListingId.set(row.listing_pk, row);
    const gloveId = stableGloveId(row);
    const existing = byGlove.get(gloveId);
    if (!existing) {
      byGlove.set(gloveId, {
        id: gloveId,
        record_type: (row.record_type || "artifact") as "variant" | "artifact",
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
        normalized_specs: { ...(row.spec_fields_raw || {}) },
        confidence: { ...(row.normalized_confidence || {}) },
        listing_ids: [row.listing_pk],
      });
    } else {
      existing.listing_ids.push(row.listing_pk);
    }
  }

  const gloves = [...byGlove.values()].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
  const glovesById = new Map(gloves.map((row) => [row.id, row]));

  return {
    stats: { listings: listingRows.length, gloves: gloves.length },
    search(qRaw) {
      const q = qRaw.trim().toLowerCase();
      const rows = !q ? gloves : gloves.filter((g) =>
        [g.canonical_name, g.brand, g.item_number, g.pattern, g.series, g.level, g.sport, g.age_group, g.throwing_hand]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
      return rows.map((g) => {
        const listings = g.listing_ids.map((id) => byListingId.get(id)).filter((row): row is ListingRow => Boolean(row));
        const prices = listings.map((row) => (typeof row.price === "number" ? row.price : null)).filter((v): v is number => v != null);
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
            avg: prices.length ? Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100 : null,
            currency: listings.find((row) => row.currency)?.currency || null,
          },
          hero_image_url: hero ? signB2Key(hero.target_storage_key, hero.source_url, params.env) : null,
        };
      });
    },
    gloveDetail(id) {
      const glove = glovesById.get(id);
      if (!glove) return null;
      const listings = glove.listing_ids.map((lid) => byListingId.get(lid)).filter((row): row is ListingRow => Boolean(row));
      const prices = listings.map((row) => (typeof row.price === "number" ? row.price : null)).filter((v): v is number => v != null);
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
          price_avg: prices.length ? Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100 : null,
        },
        images,
        listings: listings.map((listing) => ({
          id: listing.listing_pk,
          title: listing.title || null,
          price: typeof listing.price === "number" ? listing.price : null,
          currency: listing.currency || null,
          url: listing.url || null,
          source: listing.source,
        })),
      };
    },
    listingDetail(id) {
      const listing = byListingId.get(id);
      if (!listing) return null;
      const media = mediaByListing.get(id);
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
        raw_specs: Object.entries(listing.spec_fields_raw || {}).map(([spec_key, spec_value]) => ({
          spec_key,
          spec_value: spec_value == null ? null : String(spec_value),
          source_label: "xlsx",
        })),
        raw: { html: listing.raw_html || null, text: listing.raw_text || null },
        images: (media?.image_mappings || []).map((image) => ({
          role: image.image_index === 1 ? "HERO" : image.image_index === 2 ? "PALM" : image.image_index === 3 ? "BACK" : "OTHER",
          b2_key: image.target_storage_key,
          source_url: image.source_url || null,
          signed_url: signB2Key(image.target_storage_key, image.source_url || null, params.env),
        })),
      };
    },
  };
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

type DbSearchRow = {
  id: string;
  record_type: "variant" | "artifact";
  canonical_name: string | null;
  brand: string | null;
  item_number: string | null;
  pattern: string | null;
  series: string | null;
  level: string | null;
  sport: string | null;
  age_group: string | null;
  size_in: number | null;
  throwing_hand: string | null;
  price_count: bigint | number | null;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  price_currency: string | null;
  hero_b2_key: string | null;
  hero_source_url: string | null;
};

type DbGloveCore = {
  id: string;
  record_type: "variant" | "artifact";
  canonical_name: string | null;
  item_number: string | null;
  pattern: string | null;
  series: string | null;
  level: string | null;
  sport: string | null;
  age_group: string | null;
  size_in: number | null;
  throwing_hand: string | null;
  market_origin: string | null;
  normalized_specs: Record<string, string | null> | null;
  confidence: Record<string, number> | null;
  listings_count: bigint | number | null;
  available_count: bigint | number | null;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
};

type DbGloveImageRow = {
  listing_id: string;
  role: string;
  b2_key: string | null;
  source_url: string | null;
};

type DbGloveListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  url: string | null;
  source: string | null;
};

type DbListingCore = {
  id: string;
  glove_id: string;
  record_type: "variant" | "artifact";
  source: string | null;
  source_listing_id: string | null;
  url: string | null;
  title: string | null;
  condition: string | null;
  price_amount: number | null;
  price_currency: string | null;
  available: boolean | null;
  created_at: Date | string | null;
  seen_at: Date | string | null;
};

type DbListingSpecRow = {
  spec_key: string;
  spec_value: string | null;
  source_label: string | null;
};

type DbListingImageRow = {
  role: string;
  b2_key: string | null;
  source_url: string | null;
};

async function canUseDb(prisma: PrismaClient) {
  try {
    await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM gloves`);
    return true;
  } catch {
    return false;
  }
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function loadLibraryStore(params: {
  exportDir: string;
  env: NodeJS.ProcessEnv;
  prisma: PrismaClient;
}): LibraryStore {
  const fileStore = buildFileStore({ exportDir: params.exportDir, env: params.env });
  let dbReadyPromise: Promise<boolean> | null = null;

  function dbReady() {
    if (!dbReadyPromise) dbReadyPromise = canUseDb(params.prisma);
    return dbReadyPromise;
  }

  function mergeSearchResults(primary: LibrarySearchResult[], fallback: LibrarySearchResult[]) {
    const merged = new Map<string, LibrarySearchResult>();
    for (const row of [...primary, ...fallback]) {
      if (!merged.has(row.id)) merged.set(row.id, row);
    }
    return [...merged.values()].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
  }

  return {
    async stats() {
      if (await dbReady()) {
        const counts = await params.prisma.$queryRawUnsafe<Array<{ listings: bigint | number; gloves: bigint | number }>>(`
          SELECT
            (SELECT COUNT(*) FROM listings) AS listings,
            (SELECT COUNT(*) FROM gloves) AS gloves
        `);
        const row = counts[0];
        return {
          listings: Math.max(Number(row?.listings || 0), fileStore.stats.listings),
          gloves: Math.max(Number(row?.gloves || 0), fileStore.stats.gloves),
        };
      }
      return fileStore.stats;
    },

    async search(q) {
      if (!(await dbReady())) return fileStore.search(q);
      const currentStats = await this.stats();
      if (currentStats.listings === 0 || currentStats.gloves === 0) return fileStore.search(q);
      const fallbackRows = fileStore.search(q);
      const rows = await params.prisma.$queryRawUnsafe<DbSearchRow[]>(`
        SELECT
          g.id::text AS id,
          g.record_type,
          g.canonical_name,
          b.name AS brand,
          g.item_number,
          g.pattern,
          g.series,
          g.level,
          g.sport,
          g.age_group,
          g.size_in::float8 AS size_in,
          g.throwing_hand,
          COUNT(l.id) AS price_count,
          MIN(l.price_amount)::float8 AS price_min,
          MAX(l.price_amount)::float8 AS price_max,
          AVG(l.price_amount)::float8 AS price_avg,
          MAX(l.price_currency) AS price_currency,
          MIN(CASE WHEN img.role IN ('HERO', 'hero', 'front', 'FRONT') THEN img.b2_key ELSE NULL END) AS hero_b2_key,
          MIN(CASE WHEN img.role IN ('HERO', 'hero', 'front', 'FRONT') THEN img.source_url ELSE NULL END) AS hero_source_url
        FROM gloves g
        LEFT JOIN brands b ON b.id = g.manufacturer_brand_id
        LEFT JOIN listing_glove_links lgl ON lgl.glove_id = g.id
        LEFT JOIN listings l ON l.id = lgl.listing_id
        LEFT JOIN images img ON img.glove_id = g.id
        WHERE $1 = '' OR (
          COALESCE(g.canonical_name, '') || ' ' ||
          COALESCE(b.name, '') || ' ' ||
          COALESCE(g.item_number, '') || ' ' ||
          COALESCE(g.pattern, '') || ' ' ||
          COALESCE(g.series, '') || ' ' ||
          COALESCE(g.level, '') || ' ' ||
          COALESCE(g.sport, '') || ' ' ||
          COALESCE(g.age_group, '') || ' ' ||
          COALESCE(g.throwing_hand, '')
        ) ILIKE '%' || $1 || '%'
        GROUP BY g.id, g.record_type, g.canonical_name, b.name, g.item_number, g.pattern, g.series, g.level, g.sport, g.age_group, g.size_in, g.throwing_hand
        ORDER BY g.canonical_name ASC
        LIMIT 100
      `, String(q || "").trim());

      const dbRows = rows.map((row) => ({
        id: row.id,
        record_type: row.record_type,
        canonical_name: row.canonical_name || "Unknown",
        brand: row.brand,
        item_number: row.item_number,
        pattern: row.pattern,
        series: row.series,
        level: row.level,
        sport: row.sport,
        age_group: row.age_group,
        size_in: asNullableNumber(row.size_in),
        throwing_hand: row.throwing_hand,
        price_summary: {
          count: Number(row.price_count || 0),
          min: asNullableNumber(row.price_min),
          max: asNullableNumber(row.price_max),
          avg: asNullableNumber(row.price_avg),
          currency: row.price_currency,
        },
        hero_image_url: row.hero_b2_key ? signB2Key(row.hero_b2_key, row.hero_source_url, params.env) : null,
      }));
      if (!dbRows.length) return fallbackRows;
      return mergeSearchResults(dbRows, fallbackRows);
    },

    async gloveDetail(id) {
      if (!(await dbReady())) return fileStore.gloveDetail(id);
      const currentStats = await this.stats();
      if (currentStats.listings === 0 || currentStats.gloves === 0) return fileStore.gloveDetail(id);

      const coreRows = await params.prisma.$queryRawUnsafe<DbGloveCore[]>(`
        SELECT
          g.id::text AS id,
          g.record_type,
          g.canonical_name,
          g.item_number,
          g.pattern,
          g.series,
          g.level,
          g.sport,
          g.age_group,
          g.size_in::float8 AS size_in,
          g.throwing_hand,
          g.market_origin,
          jsonb_build_object(
            'back', gsn.back,
            'color', gsn.color,
            'fit', gsn.fit,
            'leather', gsn.leather,
            'lining', gsn.lining,
            'padding', gsn.padding,
            'shell', gsn.shell,
            'special_feature', gsn.special_feature,
            'usage', gsn.usage,
            'used_by', gsn.used_by,
            'web', gsn.web,
            'wrist', gsn.wrist,
            'description', gsn.description
          ) AS normalized_specs,
          COALESCE(gsn.confidence, '{}'::jsonb) AS confidence,
          COUNT(l.id) AS listings_count,
          COUNT(*) FILTER (WHERE COALESCE(l.available, false) = true) AS available_count,
          MIN(l.price_amount)::float8 AS price_min,
          MAX(l.price_amount)::float8 AS price_max,
          AVG(l.price_amount)::float8 AS price_avg
        FROM gloves g
        LEFT JOIN glove_specs_normalized gsn ON gsn.glove_id = g.id
        LEFT JOIN listing_glove_links lgl ON lgl.glove_id = g.id
        LEFT JOIN listings l ON l.id = lgl.listing_id
        WHERE g.id::text = $1
        GROUP BY g.id, g.record_type, g.canonical_name, g.item_number, g.pattern, g.series, g.level, g.sport, g.age_group, g.size_in, g.throwing_hand, g.market_origin,
          gsn.back, gsn.color, gsn.fit, gsn.leather, gsn.lining, gsn.padding, gsn.shell, gsn.special_feature, gsn.usage, gsn.used_by, gsn.web, gsn.wrist, gsn.description, gsn.confidence
      `, id);

      const core = coreRows[0];
      if (!core) return fileStore.gloveDetail(id);

      const images = await params.prisma.$queryRawUnsafe<DbGloveImageRow[]>(`
        SELECT
          COALESCE(i.listing_id::text, '') AS listing_id,
          i.role,
          i.b2_key,
          i.source_url
        FROM images i
        WHERE i.glove_id::text = $1
        ORDER BY i.created_at ASC
      `, id);

      const listings = await params.prisma.$queryRawUnsafe<DbGloveListingRow[]>(`
        SELECT
          l.id::text AS id,
          l.title,
          l.price_amount::float8 AS price,
          l.price_currency AS currency,
          l.url,
          s.name AS source
        FROM listing_glove_links lgl
        JOIN listings l ON l.id = lgl.listing_id
        LEFT JOIN sources s ON s.id = l.source_id
        WHERE lgl.glove_id::text = $1
        ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
      `, id);

      return {
        id: core.id,
        record_type: core.record_type,
        canonical_name: core.canonical_name || "Unknown",
        item_number: core.item_number,
        pattern: core.pattern,
        series: core.series,
        level: core.level,
        sport: core.sport,
        age_group: core.age_group,
        size_in: asNullableNumber(core.size_in),
        throwing_hand: core.throwing_hand,
        market_origin: core.market_origin,
        normalized_specs: core.normalized_specs || {},
        confidence: core.confidence || {},
        metrics: {
          listings_count: Number(core.listings_count || 0),
          available_count: Number(core.available_count || 0),
          price_min: asNullableNumber(core.price_min),
          price_max: asNullableNumber(core.price_max),
          price_avg: asNullableNumber(core.price_avg),
        },
        images: images.map((image) => ({
          listing_id: image.listing_id,
          role: image.role,
          url: signB2Key(image.b2_key || "", image.source_url || null, params.env) || "",
        })),
        listings: listings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          price: asNullableNumber(listing.price),
          currency: listing.currency,
          url: listing.url,
          source: listing.source || "Unknown",
        })),
      };
    },

    async listingDetail(id) {
      if (!(await dbReady())) return fileStore.listingDetail(id);
      const currentStats = await this.stats();
      if (currentStats.listings === 0 || currentStats.gloves === 0) return fileStore.listingDetail(id);

      const coreRows = await params.prisma.$queryRawUnsafe<DbListingCore[]>(`
        SELECT
          l.id::text AS id,
          g.id::text AS glove_id,
          g.record_type,
          s.name AS source,
          l.external_listing_id AS source_listing_id,
          l.url,
          l.title,
          l.condition,
          l.price_amount::float8 AS price_amount,
          l.price_currency,
          l.available,
          l.created_at,
          l.updated_at AS seen_at
        FROM listings l
        LEFT JOIN listing_glove_links lgl ON lgl.listing_id = l.id
        LEFT JOIN gloves g ON g.id = lgl.glove_id
        LEFT JOIN sources s ON s.id = l.source_id
        WHERE l.id::text = $1
        LIMIT 1
      `, id);

      const core = coreRows[0];
      if (!core) return fileStore.listingDetail(id);

      const rawSpecs = await params.prisma.$queryRawUnsafe<DbListingSpecRow[]>(`
        SELECT spec_key, spec_value, source_label
        FROM listing_specs_raw
        WHERE listing_id::text = $1
        ORDER BY spec_key ASC
      `, id);

      const images = await params.prisma.$queryRawUnsafe<DbListingImageRow[]>(`
        SELECT role, b2_key, source_url
        FROM images
        WHERE listing_id::text = $1
        ORDER BY created_at ASC
      `, id);

      return {
        id: core.id,
        glove_id: core.glove_id,
        record_type: core.record_type,
        source: core.source || "Unknown",
        source_listing_id: core.source_listing_id || "",
        url: core.url,
        title: core.title,
        condition: core.condition,
        price_amount: asNullableNumber(core.price_amount),
        price_currency: core.price_currency,
        available: Boolean(core.available),
        created_at: toIsoString(core.created_at),
        seen_at: toIsoString(core.seen_at),
        raw_specs: rawSpecs.map((spec) => ({
          spec_key: spec.spec_key,
          spec_value: spec.spec_value,
          source_label: spec.source_label || "raw",
        })),
        raw: { html: null, text: null },
        images: images.map((image) => ({
          role: image.role,
          b2_key: image.b2_key || "",
          source_url: image.source_url,
          signed_url: signB2Key(image.b2_key || "", image.source_url || null, params.env),
        })),
      };
    },
  };
}
