import { Tier, canAccess } from "@gloveiq/shared";

export type HomeMetricKey =
  | "TOTAL_GLOVES_SOLD_30D"
  | "ACTIVE_LISTINGS_COUNT"
  | "SELL_THROUGH_RATE"
  | "SALES_COUNT_30D"
  | "MEDIAN_SALE_PRICE_30D"
  | "CURRENT_MEDIAN_PRICE"
  | "P10_P90_RANGE"
  | "BASIC_PRICE_CHART_30D"
  | "TOP_BRANDS_BY_VOLUME"
  | "TRENDING_MODELS_30D_PCT"
  | "FASTEST_SELLING_MODELS_AVG_DAYS"
  | "REGIONAL_MEDIAN_US_JP_EU"
  | "PUBLIC_LISTING_VIEW";

export type HomeVizType = "kpiRow" | "rangeBar" | "lineBand" | "barH" | "table" | "barGrouped";

export type HomeDashboardContainerDef = {
  id: "market_snapshot" | "price_overview" | "price_trend" | "brand_market_share" | "model_momentum" | "regional_market" | "public_listings";
  title: string;
  tierMin: Tier;
  timeframeLabel: string;
  helpText: string;
  metrics: HomeMetricKey[];
  vizType: HomeVizType;
  dataQueryKey: string;
};

export type HomeDashboardData = {
  kpis: {
    totalSold30d: { value: number; deltaPct: number; spark: number[] };
    activeListings: { value: number; deltaPct: number; spark: number[] };
    sellThroughRate: { valuePct: number; deltaPct: number; spark: number[] };
    salesCount30d: { value: number; deltaPct: number; spark: number[] };
  };
  price: {
    median30d: number;
    currentMedian: number;
    p10: number;
    p90: number;
    series30d: Array<{ label: string; value: number }>;
    medianSeries30d: Array<{ label: string; value: number }>;
    p10Series30d: Array<{ label: string; value: number }>;
    p90Series30d: Array<{ label: string; value: number }>;
  };
  brands: Array<{ brand: string; volume: number }>;
  models: Array<{ model: string; trendPct30d: number; avgDaysToSell: number }>;
  regions: Array<{ region: "US" | "JP" | "EU"; medianPrice: number }>;
  listings: Array<{ title: string; price: number; source: string; condition: string; date: string; url: string }>;
};

export const HOME_DASHBOARD_CONTAINERS: HomeDashboardContainerDef[] = [
  {
    id: "market_snapshot",
    title: "Market Snapshot",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Core market KPIs with short-term trend context.",
    metrics: ["TOTAL_GLOVES_SOLD_30D", "ACTIVE_LISTINGS_COUNT", "SELL_THROUGH_RATE", "SALES_COUNT_30D"],
    vizType: "kpiRow",
    dataQueryKey: "home.free.marketSnapshot",
  },
  {
    id: "price_overview",
    title: "Price Overview",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Median price snapshot with percentile range.",
    metrics: ["MEDIAN_SALE_PRICE_30D", "CURRENT_MEDIAN_PRICE", "P10_P90_RANGE"],
    vizType: "rangeBar",
    dataQueryKey: "home.free.priceOverview",
  },
  {
    id: "price_trend",
    title: "Price Trend",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Daily price trend with p10-p90 percentile band and median overlay.",
    metrics: ["BASIC_PRICE_CHART_30D", "P10_P90_RANGE", "MEDIAN_SALE_PRICE_30D"],
    vizType: "lineBand",
    dataQueryKey: "home.free.priceTrend",
  },
  {
    id: "brand_market_share",
    title: "Brand Market Share",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Top brands ranked by sold unit volume.",
    metrics: ["TOP_BRANDS_BY_VOLUME"],
    vizType: "barH",
    dataQueryKey: "home.free.brandMarketShare",
  },
  {
    id: "model_momentum",
    title: "Model Momentum",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Trending model growth and average days-to-sell in one ranked view.",
    metrics: ["TRENDING_MODELS_30D_PCT", "FASTEST_SELLING_MODELS_AVG_DAYS"],
    vizType: "table",
    dataQueryKey: "home.free.modelMomentum",
  },
  {
    id: "regional_market",
    title: "Regional Market",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Median sale price comparison by region.",
    metrics: ["REGIONAL_MEDIAN_US_JP_EU"],
    vizType: "barGrouped",
    dataQueryKey: "home.free.regionalMarket",
  },
  {
    id: "public_listings",
    title: "Public Listings",
    tierMin: Tier.FREE,
    timeframeLabel: "Last 30 days",
    helpText: "Raw listing evidence without condition normalization.",
    metrics: ["PUBLIC_LISTING_VIEW"],
    vizType: "table",
    dataQueryKey: "home.free.publicListings",
  },
];

export function getHomeContainersForTier(tier: Tier): HomeDashboardContainerDef[] {
  return HOME_DASHBOARD_CONTAINERS.filter((container) => canAccess(container.tierMin, tier));
}
