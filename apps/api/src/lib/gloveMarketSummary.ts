import type { PrismaClient } from "@prisma/client";

export type MarketListingInput = {
  gloveId: string;
  title?: string | null;
  price: number | null;
  available?: boolean | null;
  seenAt?: string | null;
  source?: string | null;
  url?: string | null;
};

export type MarketSummarySourceMix = { source: string; count: number };
export type MarketSummaryRegionMix = { region: string; count: number };
export type MarketSummaryAffiliateOffer = { source: string; label: string; url: string; count: number };

export type GloveMarketSummary = {
  listings_count: number;
  available_count: number;
  sold_count: number;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  current_median: number | null;
  p10: number | null;
  p90: number | null;
  last_sale_price: number | null;
  last_sale_date: string | null;
  ma7: number | null;
  ma30: number | null;
  ma90: number | null;
  source_mix: MarketSummarySourceMix[];
  region_mix: MarketSummaryRegionMix[];
  affiliate_offers: MarketSummaryAffiliateOffer[];
  computed_at: string;
};

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function regionFromSource(source: string | null | undefined) {
  const text = String(source || "").trim();
  const ebayMatch = text.match(/^eBay\s+(.+)$/i);
  if (ebayMatch?.[1]) return ebayMatch[1];
  return text || "Unknown";
}

function affiliateLabelFromSource(source: string | null | undefined) {
  const text = String(source || "").trim();
  if (!text) return "Marketplace";
  return text;
}

export function computeGloveMarketSummary(listings: MarketListingInput[]): GloveMarketSummary {
  const now = Date.now();
  const priced = listings
    .map((listing) => ({ ...listing, price: asNullableNumber(listing.price) }))
    .filter((listing) => listing.price != null && listing.price > 0);
  const active = priced.filter((listing) => listing.available === true);
  const sold = priced.filter((listing) => listing.available === false);
  const activePrices = active.map((listing) => Number(listing.price));
  const allPrices = priced.map((listing) => Number(listing.price));
  const soldWithDates = sold
    .map((listing) => ({
      ...listing,
      seenAt: listing.seenAt ? new Date(listing.seenAt) : null,
    }))
    .filter((listing) => listing.seenAt && !Number.isNaN(listing.seenAt.getTime()))
    .sort((a, b) => b.seenAt!.getTime() - a.seenAt!.getTime());
  const sold7 = soldWithDates
    .filter((listing) => now - listing.seenAt!.getTime() <= 7 * 24 * 60 * 60 * 1000)
    .map((listing) => Number(listing.price));
  const sold30 = soldWithDates
    .filter((listing) => now - listing.seenAt!.getTime() <= 30 * 24 * 60 * 60 * 1000)
    .map((listing) => Number(listing.price));
  const sold90 = soldWithDates
    .filter((listing) => now - listing.seenAt!.getTime() <= 90 * 24 * 60 * 60 * 1000)
    .map((listing) => Number(listing.price));

  const sourceMixMap = new Map<string, number>();
  const regionMixMap = new Map<string, number>();
  const affiliateBySource = new Map<string, MarketSummaryAffiliateOffer>();
  for (const listing of listings) {
    const source = affiliateLabelFromSource(listing.source);
    sourceMixMap.set(source, (sourceMixMap.get(source) || 0) + 1);

    const region = regionFromSource(listing.source);
    regionMixMap.set(region, (regionMixMap.get(region) || 0) + 1);

    if (listing.available === true && listing.url) {
      const existing = affiliateBySource.get(source);
      if (!existing) {
        affiliateBySource.set(source, {
          source,
          label: `Shop ${source}`,
          url: listing.url,
          count: 1,
        });
      } else {
        existing.count += 1;
      }
    }
  }

  return {
    listings_count: listings.length,
    available_count: listings.filter((listing) => listing.available === true).length,
    sold_count: listings.filter((listing) => listing.available === false).length,
    price_min: allPrices.length ? Math.min(...allPrices) : null,
    price_max: allPrices.length ? Math.max(...allPrices) : null,
    price_avg: allPrices.length ? average(allPrices) : null,
    current_median: percentile(activePrices.length ? activePrices : allPrices, 0.5),
    p10: percentile(activePrices.length ? activePrices : allPrices, 0.1),
    p90: percentile(activePrices.length ? activePrices : allPrices, 0.9),
    last_sale_price: soldWithDates[0]?.price ?? null,
    last_sale_date: soldWithDates[0]?.seenAt?.toISOString() ?? null,
    ma7: average(sold7),
    ma30: average(sold30),
    ma90: average(sold90),
    source_mix: [...sourceMixMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    region_mix: [...regionMixMap.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
    affiliate_offers: [...affiliateBySource.values()].sort((a, b) => b.count - a.count),
    computed_at: new Date().toISOString(),
  };
}

export async function recomputeGloveMarketSummaries(prisma: PrismaClient, gloveIds?: string[]) {
  const targetGloveIds = gloveIds?.length
    ? [...new Set(gloveIds.filter(Boolean))]
    : [];

  const gloves = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      SELECT id::text AS id
      FROM gloves
      WHERE $1::text[] IS NULL OR id::text = ANY($1::text[])
      ORDER BY id ASC
    `,
    targetGloveIds.length ? targetGloveIds : null,
  );

  if (!gloves.length) return { gloves: 0 };

  const listingRows = await prisma.$queryRawUnsafe<Array<{
    glove_id: string;
    title: string | null;
    price: number | null;
    available: boolean | null;
    seen_at: Date | string | null;
    source: string | null;
    url: string | null;
  }>>(
    `
      SELECT
        lgl.glove_id::text AS glove_id,
        l.title,
        l.price_amount::float8 AS price,
        l.available,
        l.updated_at AS seen_at,
        s.name AS source,
        l.url
      FROM listing_glove_links lgl
      JOIN listings l ON l.id = lgl.listing_id
      LEFT JOIN sources s ON s.id = l.source_id
      WHERE $1::text[] IS NULL OR lgl.glove_id::text = ANY($1::text[])
      ORDER BY lgl.glove_id ASC, l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
    `,
    targetGloveIds.length ? targetGloveIds : null,
  );

  const byGlove = new Map<string, MarketListingInput[]>();
  for (const row of listingRows) {
    const current = byGlove.get(row.glove_id) || [];
    current.push({
      gloveId: row.glove_id,
      title: row.title,
      price: asNullableNumber(row.price),
      available: row.available,
      seenAt: toIsoString(row.seen_at),
      source: row.source,
      url: row.url,
    });
    byGlove.set(row.glove_id, current);
  }

  for (const glove of gloves) {
    const summary = computeGloveMarketSummary(byGlove.get(glove.id) || []);
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO glove_market_summaries (
          glove_id,
          listings_count,
          available_count,
          sold_count,
          price_min,
          price_max,
          price_avg,
          current_median,
          p10,
          p90,
          last_sale_price,
          last_sale_date,
          ma7,
          ma30,
          ma90,
          source_mix,
          region_mix,
          affiliate_offers,
          computed_at,
          updated_at
        )
        VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12::timestamptz,
          $13,
          $14,
          $15,
          $16::jsonb,
          $17::jsonb,
          $18::jsonb,
          $19::timestamptz,
          now()
        )
        ON CONFLICT (glove_id) DO UPDATE SET
          listings_count = EXCLUDED.listings_count,
          available_count = EXCLUDED.available_count,
          sold_count = EXCLUDED.sold_count,
          price_min = EXCLUDED.price_min,
          price_max = EXCLUDED.price_max,
          price_avg = EXCLUDED.price_avg,
          current_median = EXCLUDED.current_median,
          p10 = EXCLUDED.p10,
          p90 = EXCLUDED.p90,
          last_sale_price = EXCLUDED.last_sale_price,
          last_sale_date = EXCLUDED.last_sale_date,
          ma7 = EXCLUDED.ma7,
          ma30 = EXCLUDED.ma30,
          ma90 = EXCLUDED.ma90,
          source_mix = EXCLUDED.source_mix,
          region_mix = EXCLUDED.region_mix,
          affiliate_offers = EXCLUDED.affiliate_offers,
          computed_at = EXCLUDED.computed_at,
          updated_at = now()
      `,
      glove.id,
      summary.listings_count,
      summary.available_count,
      summary.sold_count,
      summary.price_min,
      summary.price_max,
      summary.price_avg,
      summary.current_median,
      summary.p10,
      summary.p90,
      summary.last_sale_price,
      summary.last_sale_date,
      summary.ma7,
      summary.ma30,
      summary.ma90,
      JSON.stringify(summary.source_mix),
      JSON.stringify(summary.region_mix),
      JSON.stringify(summary.affiliate_offers),
      summary.computed_at,
    );
  }

  return { gloves: gloves.length };
}
