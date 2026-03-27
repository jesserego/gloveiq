import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { recomputeGloveMarketSummaries } from "./gloveMarketSummary.js";

type BrandSeed = {
  brand_key: string;
  display_name: string;
};

export type EbaySyncMode = "active" | "sold";

export type EbayListingRow = {
  externalListingId: string;
  itemId: string;
  marketplaceId: string;
  title: string;
  listingUrl: string | null;
  imageUrls: string[];
  condition: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  available: boolean;
  sellerName: string | null;
  brandKey: string;
  fetchedAt: string;
  payload: Record<string, unknown>;
  source: string;
};

type EbayTokenCache = {
  token: string | null;
  expiresAt: number;
};

type CatalogGlove = {
  id: string;
  brandName: string | null;
  brandSlug: string | null;
  itemNumber: string | null;
  pattern: string | null;
  canonicalName: string | null;
  series: string | null;
  sizeIn: number | null;
  throwingHand: string | null;
};

export const EBAY_GLOBAL_IDS = ["EBAY-US", "EBAY-GB", "EBAY-DE", "EBAY-JP", "EBAY-AU", "EBAY-CA", "EBAY-FR", "EBAY-IT", "EBAY-ES"];

const EBAY_EXCLUDED_TITLE_TERMS = [
  "card",
  "cards",
  "trading card",
  "pokemon",
  "yugioh",
  "magic the gathering",
  "mtg",
  "poster",
  "photo",
  "photograph",
  "dvd",
  "blu ray",
  "vhs",
  "book",
  "magazine",
  "comic",
  "comic book",
  "sticker",
  "patch",
  "pin",
  "keychain",
  "wallet",
  "helmet",
  "bat",
  "ball only",
  "baseball ball",
  "golf glove",
  "batting glove",
  "batting gloves",
  "football glove",
  "football gloves",
  "hockey glove",
  "hockey gloves",
  "boxing glove",
  "boxing gloves",
  "mma glove",
  "mma gloves",
  "oven glove",
  "work glove",
  "lace kit",
  "lace repair",
  "glove lace",
  "glove laces",
  "repair kit",
  "display stand",
  "figurine",
  "toy",
  "plush",
];

const EBAY_REQUIRED_HINT_TERMS = [
  "glove",
  "mitt",
  "baseball",
  "softball",
  "infield",
  "outfield",
  "pitcher",
  "catcher",
  "first base",
];

function normalizeToken(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeBrandKey(value: string | null | undefined) {
  return normalizeToken(String(value || "").replace(/_(us|jp|dtc|vintage)$/i, ""));
}

function tokenize(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function extractSizeCandidates(value: string | null | undefined) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const out = new Set<string>();
  for (const match of text.matchAll(/(\d{1,2})\s*[\.,]\s*(\d)/g)) {
    out.add(`${match[1]}.${match[2]}`);
  }
  for (const match of text.matchAll(/(\d{1,2})\s+1\/2/g)) {
    out.add(`${match[1]}.5`);
  }
  for (const match of text.matchAll(/(\d{1,2}(?:\.\d)?)\s*(?:\"|inch|inches|in\b|pulgadas?|cm\b)/g)) {
    const numeric = Number(match[1].replace(",", "."));
    if (Number.isFinite(numeric) && numeric >= 8 && numeric <= 35) {
      out.add(numeric.toFixed(1).replace(/\.0$/, ""));
    }
  }
  return out;
}

function normalizeHandToken(value: string | null | undefined) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (
    text.includes("rht") ||
    text.includes("right") ||
    text.includes("right hand throw") ||
    text.includes("mano derecha") ||
    text.includes("derecha") ||
    text.includes("diestro")
  ) return "rh";
  if (
    text.includes("lht") ||
    text.includes("left") ||
    text.includes("left hand throw") ||
    text.includes("mano izquierda") ||
    text.includes("izquierda") ||
    text.includes("zurdo")
  ) return "lh";
  return "";
}

function modelCodeCandidates(value: string | null | undefined) {
  const matches = String(value || "")
    .toUpperCase()
    .match(/[A-Z0-9-]{3,}/g) || [];
  return [...new Set(
    matches
      .map((token) => token.replace(/[^A-Z0-9]/g, ""))
      .filter((token) => /[A-Z]/.test(token) && /\d/.test(token) && token.length >= 3),
  )];
}

function inferBrandKeyFromTitle(title: string, brands: BrandSeed[]): string {
  const lower = String(title || "").toLowerCase();
  for (const brand of brands) {
    const key = String(brand.brand_key || "").toLowerCase().replace(/_/g, " ");
    const display = String(brand.display_name || "").toLowerCase();
    if ((display && lower.includes(display)) || (key && lower.includes(key))) return brand.brand_key;
  }
  return "UNKNOWN";
}

function looksLikeGloveListing(title: string, brands: BrandSeed[]) {
  const lower = String(title || "").toLowerCase();
  if (!lower.trim()) return false;
  if (EBAY_EXCLUDED_TITLE_TERMS.some((term) => lower.includes(term))) return false;
  if (EBAY_REQUIRED_HINT_TERMS.some((term) => lower.includes(term))) return true;

  const inferredBrand = inferBrandKeyFromTitle(title, brands);
  if (inferredBrand !== "UNKNOWN") {
    const tokens = tokenize(title);
    const titleCodes = modelCodeCandidates(title);
    if (tokens.length >= 3) return true;
    if (titleCodes.length > 0) return true;
  }
  return false;
}

function buildQueryVariants(query: string, mode: EbaySyncMode) {
  const base = String(query || "baseball glove").trim() || "baseball glove";
  const variants = new Set<string>([base]);
  if (mode === "sold") {
    variants.add("baseball glove");
    variants.add("baseball mitt");
    variants.add("softball glove");
    variants.add("rawlings glove");
    variants.add("wilson glove");
    variants.add("mizuno glove");
  }
  return [...variants];
}

function marketplaceSuffix(globalId: string) {
  return String(globalId || "").replace(/^EBAY-/, "").trim().toUpperCase() || "US";
}

function ebayEnv(env: NodeJS.ProcessEnv) {
  const explicit = String(env.EBAY_ENV || "").trim().toLowerCase();
  const clientId = String(env.EBAY_CLIENT_ID || "").trim();
  const sandbox = explicit === "sandbox" || (!explicit && clientId.includes("-SBX-"));
  return {
    sandbox,
    apiBaseUrl: sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com",
    findingBaseUrl: sandbox ? "https://svcs.sandbox.ebay.com" : "https://svcs.ebay.com",
  };
}

async function getEbayAccessToken(env: NodeJS.ProcessEnv, cache: EbayTokenCache): Promise<string | null> {
  const nowTs = Date.now();
  if (cache.token && cache.expiresAt > nowTs + 60_000) return cache.token;

  const clientId = String(env.EBAY_CLIENT_ID || "").trim();
  const clientSecret = String(env.EBAY_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return null;

  const { apiBaseUrl } = ebayEnv(env);
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const rsp = await fetch(`${apiBaseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!rsp.ok) return null;

  const json = await rsp.json() as { access_token?: string; expires_in?: number };
  const token = String(json.access_token || "").trim();
  const expiresIn = Number(json.expires_in || 0);
  if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) return null;

  cache.token = token;
  cache.expiresAt = nowTs + (expiresIn * 1000);
  return token;
}

async function fetchBrowseRowsPerMarket(params: {
  env: NodeJS.ProcessEnv;
  token: string;
  globalId: string;
  query: string;
  pageSize: number;
  offset: number;
  brands: BrandSeed[];
}): Promise<EbayListingRow[]> {
  const { env, token, globalId, query, pageSize, offset, brands } = params;
  const { apiBaseUrl } = ebayEnv(env);
  const source = `ebay_${marketplaceSuffix(globalId).toLowerCase()}`;

  const url = new URL(`${apiBaseUrl}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("sort", "newlyListed");

  const rsp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": globalId,
      "Content-Type": "application/json",
    },
  });
  if (!rsp.ok) return [];

  const data = await rsp.json() as { itemSummaries?: any[] };
  const items = Array.isArray(data.itemSummaries) ? data.itemSummaries : [];

  return items.map((item): EbayListingRow => {
    const itemId = String(item?.itemId || "");
    const title = String(item?.title || "");
    const imageUrls = [
      String(item?.image?.imageUrl || ""),
      ...Array.isArray(item?.thumbnailImages) ? item.thumbnailImages.map((image: any) => String(image?.imageUrl || "")) : [],
    ].filter(Boolean);

    return {
      externalListingId: itemId,
      itemId,
      marketplaceId: globalId,
      title,
      listingUrl: String(item?.itemWebUrl || "") || null,
      imageUrls: [...new Set(imageUrls)],
      condition: item?.condition ? String(item.condition) : null,
      priceAmount: item?.price?.value == null ? null : Number(item.price.value),
      priceCurrency: item?.price?.currency || null,
      available: true,
      sellerName: item?.seller?.username ? String(item.seller.username) : null,
      brandKey: inferBrandKeyFromTitle(title, brands),
      fetchedAt: new Date().toISOString(),
      payload: item,
      source,
    };
  }).filter((row: EbayListingRow) => looksLikeGloveListing(row.title, brands));
}

async function fetchFindingSoldRowsPerMarket(params: {
  env: NodeJS.ProcessEnv;
  appId: string;
  globalId: string;
  query: string;
  pageSize: number;
  pageNumber: number;
  brands: BrandSeed[];
}): Promise<EbayListingRow[]> {
  const { env, appId, globalId, query, pageSize, pageNumber, brands } = params;
  const { findingBaseUrl } = ebayEnv(env);
  const source = `ebay_${marketplaceSuffix(globalId).toLowerCase()}`;

  const url = new URL(`${findingBaseUrl}/services/search/FindingService/v1`);
  url.searchParams.set("OPERATION-NAME", "findCompletedItems");
  url.searchParams.set("SERVICE-VERSION", "1.13.0");
  url.searchParams.set("SECURITY-APPNAME", appId);
  url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  url.searchParams.set("REST-PAYLOAD", "true");
  url.searchParams.set("GLOBAL-ID", globalId);
  url.searchParams.set("keywords", query);
  url.searchParams.set("paginationInput.entriesPerPage", String(pageSize));
  url.searchParams.set("paginationInput.pageNumber", String(pageNumber));
  url.searchParams.set("itemFilter(0).name", "SoldItemsOnly");
  url.searchParams.set("itemFilter(0).value", "true");
  url.searchParams.set("itemFilter(1).name", "HideDuplicateItems");
  url.searchParams.set("itemFilter(1).value", "true");

  const rsp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!rsp.ok) return [];

  const data = await rsp.json() as any;
  const errors = data?.errorMessage?.[0]?.error || [];
  if (Array.isArray(errors) && errors.length) {
    const rateLimited = errors.some((error: any) => String(error?.errorId?.[0] || "") === "10001");
    if (rateLimited) {
      console.warn(`[ebay:sold] rate limited for ${globalId} query="${query}"`);
    }
    return [];
  }
  const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

  const rows: EbayListingRow[] = items.map((item: any): EbayListingRow => {
    const itemId = String(item?.itemId?.[0] || "");
    const title = String(item?.title?.[0] || "");
    const primaryImage = String(item?.galleryURL?.[0] || "");
    return {
      externalListingId: itemId,
      itemId,
      marketplaceId: globalId,
      title,
      listingUrl: String(item?.viewItemURL?.[0] || "") || null,
      imageUrls: primaryImage ? [primaryImage] : [],
      condition: item?.condition?.[0]?.conditionDisplayName?.[0] ? String(item.condition[0].conditionDisplayName[0]) : null,
      priceAmount: Number(item?.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.__value__ || item?.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
      priceCurrency: "USD",
      available: false,
      sellerName: item?.sellerInfo?.[0]?.sellerUserName?.[0] ? String(item.sellerInfo[0].sellerUserName[0]) : null,
      brandKey: inferBrandKeyFromTitle(title, brands),
      fetchedAt: String(item?.listingInfo?.[0]?.endTime?.[0] || new Date().toISOString()),
      payload: item,
      source,
    };
  });

  return rows.filter((row) => looksLikeGloveListing(row.title, brands));
}

export async function fetchEbayMarketplaceRows(params: {
  env: NodeJS.ProcessEnv;
  brands: BrandSeed[];
  query: string;
  perMarket: number;
  globalIds: string[];
  pages?: number;
  mode?: EbaySyncMode;
  tokenCache?: EbayTokenCache;
}): Promise<EbayListingRow[]> {
  const appId = String(params.env.EBAY_APP_ID || "").trim();
  const mode = params.mode || "active";
  const tokenCache = params.tokenCache || { token: null, expiresAt: 0 };
  const token = mode === "active" ? await getEbayAccessToken(params.env, tokenCache) : null;
  const pages = Math.max(1, Math.min(10, Number(params.pages || 1)));

  if (mode === "active" && !token) return [];
  if (mode === "sold" && !appId) return [];

  const allRows: EbayListingRow[] = [];
  const queryVariants = buildQueryVariants(params.query, mode);
  for (const globalId of params.globalIds) {
    for (const queryVariant of queryVariants) {
      for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
        const rows = mode === "sold"
          ? await fetchFindingSoldRowsPerMarket({
              env: params.env,
              appId,
              globalId,
              query: queryVariant,
              pageSize: params.perMarket,
              pageNumber: pageIndex + 1,
              brands: params.brands,
            })
          : await fetchBrowseRowsPerMarket({
              env: params.env,
              token: token!,
              globalId,
              query: queryVariant,
              pageSize: params.perMarket,
              offset: pageIndex * params.perMarket,
              brands: params.brands,
            });
        allRows.push(...rows);
        if (rows.length < params.perMarket) break;
      }
    }
  }

  const dedup = new Map<string, EbayListingRow>();
  for (const row of allRows) dedup.set(`${row.marketplaceId}:${row.externalListingId}`, row);
  return [...dedup.values()].filter((row) => (row.priceAmount || 0) > 0);
}

async function ensureSourceRecord(prisma: PrismaClient, params: { name: string; sourceType: string; baseUrl?: string }) {
  const existingRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id::text AS id FROM sources WHERE name = $1 ORDER BY created_at ASC LIMIT 1`,
    params.name,
  );
  if (existingRows[0]?.id) return existingRows[0].id;

  await prisma.$executeRawUnsafe(
    `INSERT INTO sources (brand_id, source_type, name, base_url) VALUES (NULL, $1, $2, $3)`,
    params.sourceType,
    params.name,
    params.baseUrl || null,
  );

  const createdRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id::text AS id FROM sources WHERE name = $1 ORDER BY created_at ASC LIMIT 1`,
    params.name,
  );
  return createdRows[0]?.id || null;
}

async function loadCatalogGloves(prisma: PrismaClient): Promise<CatalogGlove[]> {
  return prisma.$queryRawUnsafe<CatalogGlove[]>(`
    SELECT
      g.id::text AS id,
      b.name AS "brandName",
      b.slug AS "brandSlug",
      g.item_number AS "itemNumber",
      g.pattern,
      g.canonical_name AS "canonicalName",
      g.series,
      g.size_in::float8 AS "sizeIn",
      g.throwing_hand AS "throwingHand"
    FROM gloves g
    LEFT JOIN brands b ON b.id = g.manufacturer_brand_id
  `);
}

function buildMatcher(gloves: CatalogGlove[], brands: BrandSeed[]) {
  return (row: EbayListingRow) => {
    const titleNorm = normalizeToken(row.title);
    const titleTokens = new Set(tokenize(row.title));
    const inferredBrand = row.brandKey !== "UNKNOWN" ? row.brandKey : inferBrandKeyFromTitle(row.title, brands);
    const inferredBrandNorm = normalizeBrandKey(inferredBrand);
    const titleModelCodes = new Set(modelCodeCandidates(row.title));
    const titleSizes = extractSizeCandidates(row.title);
    const titleHand = normalizeHandToken(row.title);

    const scored = gloves
      .map((glove) => {
        let score = 0;
        const gloveBrandNorm = normalizeBrandKey(glove.brandName || glove.brandSlug || "");
        const itemNumberNorm = normalizeToken(glove.itemNumber);
        const patternNorm = normalizeToken(glove.pattern);
        const seriesNorm = normalizeToken(glove.series);
        const canonicalTokens = tokenize(glove.canonicalName).filter((token) => !["baseball", "glove", "series", "model"].includes(token));
        const seriesTokens = tokenize(glove.series);
        const itemNumberTokens = tokenize(String(glove.itemNumber || "").replace(/-/g, " "));
        const canonicalModelCodes = modelCodeCandidates(glove.canonicalName);
        const sizeToken = glove.sizeIn ? String(glove.sizeIn).replace(/\.0$/, "") : "";
        const handToken = normalizeHandToken(glove.throwingHand);

        if (inferredBrandNorm && gloveBrandNorm && inferredBrandNorm === gloveBrandNorm) {
          score += 6;
        } else if (inferredBrandNorm && gloveBrandNorm && inferredBrandNorm !== gloveBrandNorm) {
          score -= 4;
        }

        if (itemNumberNorm && titleNorm.includes(itemNumberNorm)) score += 10;
        if (patternNorm && titleNorm.includes(patternNorm)) score += 4;
        if (seriesNorm && titleNorm.includes(seriesNorm)) score += 4;
        if (sizeToken && titleSizes.has(sizeToken)) score += 2;
        if (handToken && titleHand && handToken === titleHand) score += 2;
        if (handToken && titleHand && handToken !== titleHand) score -= 1;

        let codeOverlap = 0;
        for (const code of canonicalModelCodes) {
          if (titleModelCodes.has(code)) codeOverlap += 1;
        }
        if (codeOverlap > 0) score += 12 + Math.min(4, codeOverlap);

        let tokenOverlap = 0;
        for (const token of [...canonicalTokens, ...seriesTokens, ...itemNumberTokens]) {
          if (titleTokens.has(token)) tokenOverlap += 1;
        }
        score += Math.min(6, tokenOverlap);

        if (!itemNumberNorm && !patternNorm && !seriesNorm && codeOverlap === 0 && tokenOverlap < 2) {
          score -= 2;
        }

        return {
          gloveId: glove.id,
          score,
          basis: codeOverlap > 0
            ? "model_code"
            : itemNumberNorm && titleNorm.includes(itemNumberNorm)
            ? "item_number"
            : seriesNorm && titleNorm.includes(seriesNorm)
              ? "series"
            : patternNorm && titleNorm.includes(patternNorm)
              ? "pattern"
              : tokenOverlap > 0
                ? "name_tokens"
                : null,
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];
    if (!top || top.score < 6) return null;
    if (second && second.score >= top.score - 1 && top.score < 10) return null;
    return top;
  };
}

function imageRole(index: number) {
  if (index === 0) return "HERO";
  if (index === 1) return "ALT";
  return "OTHER";
}

export async function persistEbayRows(params: {
  prisma: PrismaClient;
  env: NodeJS.ProcessEnv;
  brands: BrandSeed[];
  rows: EbayListingRow[];
  query: string;
  mode?: EbaySyncMode;
}) {
  const matcher = buildMatcher(await loadCatalogGloves(params.prisma), params.brands);
  let persisted = 0;
  let matched = 0;
  const touchedGloveIds = new Set<string>();

  for (const row of params.rows) {
    const sourceName = `eBay ${marketplaceSuffix(row.marketplaceId)}`;
    const sourceId = await ensureSourceRecord(params.prisma, {
      name: sourceName,
      sourceType: "marketplace",
      baseUrl: row.listingUrl || "https://www.ebay.com",
    });
    if (!sourceId) throw new Error(`Unable to resolve source record for ${sourceName}`);

    const payloadSha = crypto.createHash("sha256").update(JSON.stringify(row.payload)).digest("hex");
    const matchedGlove = matcher(row);

    await params.prisma.$executeRawUnsafe(`
      INSERT INTO raw_listing_payloads (
        source_id,
        external_listing_id,
        discovered_at,
        fetched_at,
        first_seen_at,
        last_seen_at,
        state,
        dedupe_key,
        payload_sha256,
        listing_url,
        title,
        condition,
        price_amount,
        price_currency,
        available,
        payload,
        normalization,
        canonical_glove_id
      )
      VALUES (
        $1::uuid,
        $2,
        now(),
        $3::timestamptz,
        $3::timestamptz,
        $3::timestamptz,
        'FETCHED',
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12::jsonb,
        $13::jsonb,
        $14::uuid
      )
      ON CONFLICT (source_id, external_listing_id) DO UPDATE SET
        fetched_at = EXCLUDED.fetched_at,
        last_seen_at = EXCLUDED.last_seen_at,
        state = EXCLUDED.state,
        listing_url = EXCLUDED.listing_url,
        title = EXCLUDED.title,
        condition = EXCLUDED.condition,
        price_amount = EXCLUDED.price_amount,
        price_currency = EXCLUDED.price_currency,
        available = EXCLUDED.available,
        payload = EXCLUDED.payload,
        normalization = EXCLUDED.normalization,
        canonical_glove_id = EXCLUDED.canonical_glove_id,
        updated_at = now()
    `,
    sourceId,
    row.externalListingId,
    row.fetchedAt,
    `${row.marketplaceId}:${row.externalListingId}`,
    payloadSha,
    row.listingUrl,
    row.title,
    row.condition,
    row.priceAmount,
    row.priceCurrency || "USD",
    row.available,
    JSON.stringify(row.payload),
    JSON.stringify({
      query: params.query,
      mode: params.mode || "active",
      source: row.source,
      brand_key: row.brandKey,
      matched_glove_id: matchedGlove?.gloveId || null,
      match_score: matchedGlove?.score || null,
      match_basis: matchedGlove?.basis || null,
      image_count: row.imageUrls.length,
    }),
    matchedGlove?.gloveId || null,
    );

    await params.prisma.$executeRawUnsafe(`
      INSERT INTO listings (
        source_id,
        external_listing_id,
        url,
        title,
        seller_name,
        condition,
        price_amount,
        price_currency,
        available
      )
      VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9
      )
      ON CONFLICT (source_id, external_listing_id) DO UPDATE SET
        url = EXCLUDED.url,
        title = EXCLUDED.title,
        seller_name = EXCLUDED.seller_name,
        condition = EXCLUDED.condition,
        price_amount = EXCLUDED.price_amount,
        price_currency = EXCLUDED.price_currency,
        available = EXCLUDED.available,
        updated_at = now()
    `,
    sourceId,
    row.externalListingId,
    row.listingUrl,
    row.title,
    row.sellerName,
    row.condition,
    row.priceAmount,
    row.priceCurrency || "USD",
    row.available,
    );

    const listingRows = await params.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM listings WHERE source_id = $1::uuid AND external_listing_id = $2 LIMIT 1`,
      sourceId,
      row.externalListingId,
    );
    const listingId = listingRows[0]?.id || null;
    if (!listingId) continue;

    await params.prisma.$executeRawUnsafe(`DELETE FROM listing_specs_raw WHERE listing_id = $1::uuid`, listingId);
    await params.prisma.$executeRawUnsafe(
      `INSERT INTO listing_specs_raw (listing_id, spec_key, spec_value, source_label) VALUES ($1::uuid, 'marketplace_id', $2, 'ebay')`,
      listingId,
      row.marketplaceId,
    );
    await params.prisma.$executeRawUnsafe(
      `INSERT INTO listing_specs_raw (listing_id, spec_key, spec_value, source_label) VALUES ($1::uuid, 'brand_key_inferred', $2, 'ebay')`,
      listingId,
      row.brandKey,
    );

    if (matchedGlove?.gloveId) {
      await params.prisma.$executeRawUnsafe(`
        INSERT INTO listing_glove_links (listing_id, glove_id)
        VALUES ($1::uuid, $2::uuid)
        ON CONFLICT (listing_id) DO UPDATE SET glove_id = EXCLUDED.glove_id
      `, listingId, matchedGlove.gloveId);
      matched += 1;
      touchedGloveIds.add(matchedGlove.gloveId);
    }

    await params.prisma.$executeRawUnsafe(`DELETE FROM images WHERE listing_id = $1::uuid AND b2_key IS NULL`, listingId);
    for (const [index, imageUrl] of row.imageUrls.entries()) {
      await params.prisma.$executeRawUnsafe(`
        INSERT INTO images (listing_id, glove_id, role, source_url, b2_bucket, b2_key, sha256)
        VALUES ($1::uuid, $2::uuid, $3, $4, NULL, NULL, NULL)
      `, listingId, matchedGlove?.gloveId || null, imageRole(index), imageUrl);
    }

    const rawRows = await params.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text AS id FROM raw_listing_payloads WHERE source_id = $1::uuid AND external_listing_id = $2 LIMIT 1`,
      sourceId,
      row.externalListingId,
    );
    const rawListingId = rawRows[0]?.id || null;
    if (rawListingId) {
      await params.prisma.$executeRawUnsafe(`DELETE FROM raw_listing_images WHERE raw_listing_id = $1::uuid`, rawListingId);
      for (const [index, imageUrl] of row.imageUrls.entries()) {
        await params.prisma.$executeRawUnsafe(`
          INSERT INTO raw_listing_images (
            raw_listing_id,
            ordinal,
            source_url,
            fetch_status,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            'PENDING',
            $4::jsonb
          )
          ON CONFLICT (raw_listing_id, ordinal) DO UPDATE SET
            source_url = EXCLUDED.source_url,
            metadata = EXCLUDED.metadata,
            updated_at = now()
        `, rawListingId, index, imageUrl, JSON.stringify({ source: "ebay", marketplace_id: row.marketplaceId }));
      }
    }

    persisted += 1;
  }

  if (touchedGloveIds.size) {
    await recomputeGloveMarketSummaries(params.prisma, [...touchedGloveIds]);
  }

  return { persisted, matched, gloveIds: [...touchedGloveIds] };
}
