export type TimePoint = { label: string; value: number };

export type KpiMetric = {
  title: string;
  value: string;
  deltaPct: number;
  timeframe: string;
  helpText: string;
  spark: TimePoint[];
};

export type RangeMetric = {
  title: string;
  p10: number;
  median: number;
  p90: number;
  timeframe: string;
  helpText: string;
};

export type SellThroughMetric = {
  title: string;
  ratePct: number;
  deltaPct: number;
  timeframe: string;
  helpText: string;
};

export type RankedRow = {
  label: string;
  value: number;
  unit?: string;
  deltaPct?: number;
  spark?: TimePoint[];
};

export type ListingRow = {
  id: string;
  title: string;
  source: string;
  price: number;
  date: string;
  url: string;
};

export type FreeTierMetricsData = {
  totalSold: KpiMetric;
  medianSalePrice: KpiMetric;
  activeListings: KpiMetric;
  pRange: RangeMetric;
  sellThrough: SellThroughMetric;
  topBrands: { title: string; timeframe: string; helpText: string; data: RankedRow[] };
  trendingModels: { title: string; timeframe: string; helpText: string; rows: RankedRow[] };
  fastestModels: { title: string; timeframe: string; helpText: string; rows: RankedRow[] };
  regionalMedian: { title: string; timeframe: string; helpText: string; data: RankedRow[] };
  currentMedianPrice: { title: string; value: string; timeframe: string; helpText: string };
  salesEvents30d: KpiMetric;
  basicPriceChart: { title: string; timeframe: string; helpText: string; data: TimePoint[] };
  publicListings: { title: string; timeframe: string; helpText: string; rows: ListingRow[] };
};

const spark30 = (base: number, spread: number): TimePoint[] =>
  Array.from({ length: 12 }).map((_, i) => ({
    label: `D${i + 1}`,
    value: Math.max(0, Math.round(base + Math.sin(i / 2) * spread + (i % 3) * (spread / 4))),
  }));

const dateSeq = [
  "Apr 01", "Apr 05", "Apr 09", "Apr 13", "Apr 17", "Apr 21", "Apr 25", "Apr 29", "May 03", "May 07", "May 11", "May 15",
  "May 19", "May 23", "May 27", "May 31", "Jun 04", "Jun 08", "Jun 12", "Jun 16", "Jun 20", "Jun 24", "Jun 28", "Jul 02",
  "Jul 06", "Jul 10", "Jul 14", "Jul 18", "Jul 22", "Jul 26",
];

export const freeTierMetricsMock: FreeTierMetricsData = {
  totalSold: {
    title: "Total gloves sold",
    value: "1,842",
    deltaPct: 8.4,
    timeframe: "Last 30 days",
    helpText: "Total sold units in the selected time window.",
    spark: spark30(138, 24),
  },
  medianSalePrice: {
    title: "Median sale price",
    value: "$226",
    deltaPct: 4.1,
    timeframe: "Last 30 days",
    helpText: "Median transaction price across all completed sales.",
    spark: spark30(226, 14),
  },
  activeListings: {
    title: "Active listings count",
    value: "3,917",
    deltaPct: -1.9,
    timeframe: "Last 30 days",
    helpText: "Number of currently active marketplace listings.",
    spark: spark30(3920, 180),
  },
  pRange: {
    title: "p10 / p90 range",
    p10: 88,
    median: 226,
    p90: 468,
    timeframe: "Last 30 days",
    helpText: "Price interval showing lower (p10), center (median), and upper (p90) market range.",
  },
  sellThrough: {
    title: "Sell-through rate",
    ratePct: 46.8,
    deltaPct: 2.6,
    timeframe: "Last 30 days",
    helpText: "Percent of listed inventory that converted to sales in-period.",
  },
  topBrands: {
    title: "Top brands by volume",
    timeframe: "Last 30 days",
    helpText: "Ranked by units sold.",
    data: [
      { label: "Rawlings", value: 362 },
      { label: "Wilson", value: 341 },
      { label: "Mizuno", value: 216 },
      { label: "44 Pro", value: 144 },
      { label: "Zett", value: 119 },
    ],
  },
  trendingModels: {
    title: "Trending models (30-day % change)",
    timeframe: "Last 30 days",
    helpText: "Top model momentum by percentage growth.",
    rows: [
      { label: "A2000 1786", value: 12.4, unit: "%", deltaPct: 12.4, spark: spark30(7, 4) },
      { label: "HOH PRO204", value: 9.7, unit: "%", deltaPct: 9.7, spark: spark30(6, 3) },
      { label: "Mizuno Pro Haga IF", value: 7.9, unit: "%", deltaPct: 7.9, spark: spark30(5, 2.7) },
      { label: "44 Pro C2", value: 6.3, unit: "%", deltaPct: 6.3, spark: spark30(4, 2.1) },
      { label: "Pro Preferred PROS205", value: 5.1, unit: "%", deltaPct: 5.1, spark: spark30(4, 1.7) },
    ],
  },
  fastestModels: {
    title: "Fastest selling models (avg days to sell)",
    timeframe: "Last 30 days",
    helpText: "Lower values indicate quicker sell-through.",
    rows: [
      { label: "A2K 1787", value: 4.1, unit: "days" },
      { label: "Pro Preferred PROS205", value: 5.3, unit: "days" },
      { label: "Mizuno Pro Classic", value: 5.9, unit: "days" },
      { label: "Zett ProStatus", value: 6.2, unit: "days" },
      { label: "A2000 1786", value: 6.8, unit: "days" },
    ],
  },
  regionalMedian: {
    title: "Regional median (US / JP / EU)",
    timeframe: "Last 30 days",
    helpText: "Median sale price by region.",
    data: [
      { label: "US", value: 238 },
      { label: "JP", value: 274 },
      { label: "EU", value: 211 },
    ],
  },
  currentMedianPrice: {
    title: "Current median price",
    value: "$248",
    timeframe: "Last 30 days",
    helpText: "Latest rolling median sale price snapshot.",
  },
  salesEvents30d: {
    title: "30-day sales count",
    value: "1,206",
    deltaPct: 5.3,
    timeframe: "Last 30 days",
    helpText: "Count of completed transactions in period.",
    spark: spark30(95, 18),
  },
  basicPriceChart: {
    title: "Basic price chart (30-day)",
    timeframe: "Last 30 days",
    helpText: "Daily median price trend.",
    data: dateSeq.map((label, idx) => ({ label, value: 198 + (idx % 7) * 4 + Math.round(Math.sin(idx / 3) * 12) })),
  },
  publicListings: {
    title: "Public listing view",
    timeframe: "Last 30 days",
    helpText: "Raw marketplace records. Prices are not condition-normalized.",
    rows: [
      { id: "ls_1001", title: "Rawlings HOH PRO204 11.5\"", source: "eBay", price: 229, date: "2026-03-01", url: "#" },
      { id: "ls_1002", title: "Wilson A2000 1786 11.5\"", source: "SidelineSwap", price: 185, date: "2026-03-02", url: "#" },
      { id: "ls_1003", title: "Mizuno Pro Haga Infield 11.75\"", source: "eBay", price: 312, date: "2026-03-02", url: "#" },
      { id: "ls_1004", title: "44 Pro C2 Custom 11.5\"", source: "JBG", price: 169, date: "2026-03-03", url: "#" },
      { id: "ls_1005", title: "Zett ProStatus Infield 11.6\"", source: "eBay", price: 278, date: "2026-03-03", url: "#" },
    ],
  },
};
