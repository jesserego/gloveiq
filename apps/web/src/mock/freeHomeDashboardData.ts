import { useEffect, useMemo, useState } from "react";
import { HOME_WINDOW_OPTIONS, type HomeWindowKey, percentChange } from "../lib/homeMarketUtils";

export type HomeBrandKey = string;
export type HomeCountryKey =
  | "all"
  | "US"
  | "Japan"
  | "Germany"
  | "Australia"
  | "France"
  | "Italy"
  | "Spain"
  | "Canada"
  | "United Kingdom"
  | "Brazil"
  | "Mexico"
  | "Argentina"
  | "Colombia";

export const FREE_HOME_BRAND_OPTIONS: Array<{ key: HomeBrandKey; label: string }> = [
  { key: "all", label: "All brands" },
  { key: "rawlings", label: "Rawlings" },
  { key: "wilson", label: "Wilson" },
  { key: "mizuno", label: "Mizuno" },
  { key: "44pro", label: "44 Pro" },
  { key: "zett", label: "Zett" },
];

export const FREE_HOME_COUNTRY_OPTIONS: Array<{ key: HomeCountryKey; label: string }> = [
  { key: "all", label: "All countries" },
  { key: "US", label: "US" },
  { key: "Japan", label: "Japan" },
  { key: "Germany", label: "Germany" },
  { key: "Australia", label: "Australia" },
  { key: "France", label: "France" },
  { key: "Italy", label: "Italy" },
  { key: "Spain", label: "Spain" },
  { key: "Canada", label: "Canada" },
  { key: "United Kingdom", label: "United Kingdom" },
  { key: "Brazil", label: "Brazil" },
  { key: "Mexico", label: "Mexico" },
  { key: "Argentina", label: "Argentina" },
  { key: "Colombia", label: "Colombia" },
];

type SparkKpi = {
  value: number;
  deltaPct: number;
  spark: number[];
};

export type FreeHomeDashboardData = {
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
    sold: SparkKpi;
    active: SparkKpi;
    sellThrough: SparkKpi;
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

const WINDOW_MULTIPLIER: Record<HomeWindowKey, number> = {
  "1mo": 1,
  "3mo": 2.85,
  "6mo": 5.55,
  "1yr": 10.8,
  ytd: 2.2,
  all: 24,
};

const BRAND_MULTIPLIER_MAP: Record<string, number> = {
  rawlings: 0.28,
  wilson: 0.24,
  mizuno: 0.2,
  "44pro": 0.15,
  zett: 0.13,
};

const COUNTRY_MULTIPLIER: Record<HomeCountryKey, number> = {
  all: 1,
  US: 0.31,
  Japan: 0.24,
  Germany: 0.09,
  Australia: 0.08,
  France: 0.06,
  Italy: 0.05,
  Spain: 0.05,
  Canada: 0.07,
  "United Kingdom": 0.08,
  Brazil: 0.06,
  Mexico: 0.06,
  Argentina: 0.04,
  Colombia: 0.04,
};

const COUNTRIES = [
  { country: "US", value: 822500, count: 3055 },
  { country: "Japan", value: 436400, count: 1411 },
  { country: "Germany", value: 208900, count: 724 },
  { country: "Australia", value: 174200, count: 612 },
  { country: "France", value: 129600, count: 467 },
  { country: "Italy", value: 117500, count: 444 },
  { country: "Spain", value: 110300, count: 413 },
  { country: "Canada", value: 186600, count: 650 },
  { country: "United Kingdom", value: 201800, count: 701 },
  { country: "Brazil", value: 143500, count: 552 },
  { country: "Mexico", value: 131800, count: 521 },
  { country: "Argentina", value: 93200, count: 378 },
  { country: "Colombia", value: 76800, count: 312 },
];

const trendSeed = [212, 214, 216, 218, 219, 221, 220, 223, 224, 226, 228, 227, 229, 231, 233, 235, 236, 238, 237, 239, 241, 243, 244, 246, 248, 247, 249, 252, 254, 256];
const salesSeed = [28, 31, 27, 33, 36, 35, 38, 42, 40, 44, 47, 39, 45, 48, 43, 50, 51, 46, 53, 55, 49, 58, 60, 57, 61, 54, 62, 65, 64, 68];

function buildSpark(base: number, spread: number): number[] {
  return Array.from({ length: 24 }).map((_, idx) => Math.max(1, Math.round(base + Math.sin(idx / 2.6) * spread + (idx % 3) * (spread / 4))));
}

function scaled(value: number, windowKey: HomeWindowKey, scopeMultiplier = 1): number {
  return Math.round(value * WINDOW_MULTIPLIER[windowKey] * scopeMultiplier);
}

function priceShift(windowKey: HomeWindowKey): number {
  if (windowKey === "1mo") return 0;
  if (windowKey === "3mo") return 6;
  if (windowKey === "6mo") return 12;
  if (windowKey === "1yr") return 18;
  if (windowKey === "ytd") return 8;
  return 26;
}

function previousWindow(windowKey: HomeWindowKey): HomeWindowKey {
  if (windowKey === "all") return "1yr";
  if (windowKey === "1yr") return "6mo";
  if (windowKey === "6mo") return "3mo";
  if (windowKey === "3mo") return "1mo";
  if (windowKey === "ytd") return "1mo";
  return "1mo";
}

function buildData(windowKey: HomeWindowKey, brandKey: HomeBrandKey, countryKey: HomeCountryKey): FreeHomeDashboardData {
  const prev = previousWindow(windowKey);
  const normalizedBrandKey = String(brandKey || "all").toLowerCase().replace(/[^a-z0-9]/g, "");
  const brandMultiplier = normalizedBrandKey === "all" ? 1 : (BRAND_MULTIPLIER_MAP[normalizedBrandKey] ?? 0.14);
  const scopeMultiplier = brandMultiplier * COUNTRY_MULTIPLIER[countryKey];
  const scopeBoost = 0.72 + scopeMultiplier * 0.58;
  const focusCountry = countryKey !== "all";
  const focusBrand = normalizedBrandKey !== "all";

  const countries = COUNTRIES
    .filter((entry) => (focusCountry ? entry.country === countryKey : true))
    .map((entry) => {
    const countryScale = focusCountry ? 1 : COUNTRY_MULTIPLIER[entry.country as HomeCountryKey];
    const currentValue = scaled(entry.value, windowKey, countryScale * (focusBrand ? brandMultiplier * 2.6 : 1));
    const previousValue = scaled(entry.value, prev, countryScale * (focusBrand ? brandMultiplier * 2.6 : 1));
    return {
      country: entry.country,
      value: Math.max(0, currentValue),
      count: Math.max(0, scaled(entry.count, windowKey, countryScale * (focusBrand ? brandMultiplier * 2.4 : 1))),
      change_pct: Number(percentChange(currentValue, previousValue).toFixed(1)),
    };
  });

  const totalValue = countries.reduce((sum, row) => sum + row.value, 0);
  const totalCount = countries.reduce((sum, row) => sum + row.count, 0);

  const soldValue = scaled(1845, windowKey, scopeBoost);
  const activeValue = scaled(3920, windowKey, scopeBoost);
  const sellThroughValue = Number((soldValue / Math.max(activeValue, 1) * 100).toFixed(1));

  const brandPriceBias = focusBrand
    ? ({ rawlings: 12, wilson: 10, mizuno: 14, "44pro": 6, zett: 16 } as const)[normalizedBrandKey as "rawlings" | "wilson" | "mizuno" | "44pro" | "zett"] ?? 8
    : 0;
  const countryPriceBias = focusCountry
    ? ({ US: 0, Japan: 18, Germany: 9, Australia: 5, France: 6, Italy: 6, Spain: 5, Canada: 4, "United Kingdom": 7, Brazil: 2, Mexico: 2, Argentina: 1, Colombia: 1 } as const)[countryKey]
    : 0;
  const priceBump = priceShift(windowKey) + brandPriceBias + countryPriceBias;
  const trendDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const trendEnd = new Date();
  trendEnd.setHours(0, 0, 0, 0);
  const trendStart = new Date(trendEnd);
  trendStart.setDate(trendEnd.getDate() - (trendSeed.length - 1));
  const trend = trendSeed.map((point, idx) => {
    const median = point + priceBump;
    const pointDate = new Date(trendStart);
    pointDate.setDate(trendStart.getDate() + idx);
    return {
      label: trendDateFormatter.format(pointDate),
      medianPrice: median,
      salesCount: Math.max(3, Math.round(salesSeed[idx] * (WINDOW_MULTIPLIER[windowKey] * 0.45 + 0.6) * scopeBoost)),
      p10: Math.round(median * 0.66),
      p90: Math.round(median * 1.35),
    };
  });

  const windowMedian = Math.round(trend.reduce((sum, row) => sum + row.medianPrice, 0) / trend.length);
  const prevMedian = windowMedian - (windowKey === "1mo" ? 8 : 10);

  return {
    global: {
      totalValue,
      totalCount,
      countries,
    },
    marketSnapshot: {
      sold: {
        value: soldValue,
        deltaPct: Number(percentChange(soldValue, scaled(1845, prev)).toFixed(1)),
        spark: buildSpark(130 * WINDOW_MULTIPLIER[windowKey], 20 * WINDOW_MULTIPLIER[windowKey]),
      },
      active: {
        value: activeValue,
        deltaPct: Number(percentChange(activeValue, scaled(3920, prev)).toFixed(1)),
        spark: buildSpark(255 * WINDOW_MULTIPLIER[windowKey], 25 * WINDOW_MULTIPLIER[windowKey]),
      },
      sellThrough: {
        value: sellThroughValue,
        deltaPct: Number(percentChange(sellThroughValue, Number((scaled(1845, prev) / Math.max(scaled(3920, prev), 1) * 100).toFixed(1))).toFixed(1)),
        spark: buildSpark(47, 3),
      },
    },
    priceOverview: {
      currentMedian: windowMedian + 12,
      medianWindow: windowMedian,
      p10: Math.round(windowMedian * 0.65),
      p90: Math.round(windowMedian * 1.37),
      deltaPct: Number(percentChange(windowMedian, prevMedian).toFixed(1)),
    },
    salesTrend: {
      series: trend,
      windowMedian,
      windowSales: trend.reduce((sum, row) => sum + row.salesCount, 0),
    },
    brandModelInsights: {
      brands: [
        { brand: "Rawlings", volume: scaled(350, windowKey) },
        { brand: "Wilson", volume: scaled(325, windowKey) },
        { brand: "Mizuno", volume: scaled(205, windowKey) },
        { brand: "44 Pro", volume: scaled(149, windowKey) },
        { brand: "Zett", volume: scaled(121, windowKey) },
      ].filter((row) => (focusBrand ? row.brand.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedBrandKey : true)),
      trending: [
        { model: "A2000 1786", trendPct: 12.4 },
        { model: "HOH PRO204", trendPct: 9.8 },
        { model: "Mizuno Pro Haga", trendPct: 8.1 },
        { model: "44 Pro C2", trendPct: 6.3 },
      ].filter((row) => (focusBrand ? row.model.toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedBrandKey) : true)),
      fastest: [
        { model: "Pro Preferred 205", avgDaysToSell: 5.3 },
        { model: "Mizuno Pro Select", avgDaysToSell: 5.9 },
        { model: "A2000 1786", avgDaysToSell: 6.6 },
        { model: "HOH PRO204", avgDaysToSell: 7.7 },
      ].filter((row) => (focusBrand ? row.model.toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedBrandKey) : true)),
    },
    listings: [
      { title: "Rawlings HOH PRO204 11.5\"", price: 229 + priceBump, source: "eBay", country: "US", date: "2026-03-02", url: "#" },
      { title: "Wilson A2000 1786 11.5\"", price: 188 + priceBump, source: "SidelineSwap", country: "US", date: "2026-03-03", url: "#" },
      { title: "Mizuno Pro Haga IF 11.75\"", price: 315 + priceBump, source: "eBay", country: "Japan", date: "2026-03-03", url: "#" },
      { title: "44 Pro C2 Custom 11.5\"", price: 172 + priceBump, source: "JBG", country: "US", date: "2026-03-04", url: "#" },
      { title: "Zett ProStatus Infield 11.6\"", price: 282 + priceBump, source: "eBay", country: "Japan", date: "2026-03-04", url: "#" },
      { title: "Wilson Staff DUAL 86 11.5\"", price: 352 + priceBump, source: "eBay", country: "Japan", date: "2026-03-05", url: "#" },
      { title: "Rawlings HyperTech R2G 11.75\"", price: 208 + priceBump, source: "eBay", country: "Canada", date: "2026-03-05", url: "#" },
      { title: "Mizuno Pro Classic 11.75\"", price: 301 + priceBump, source: "eBay", country: "United Kingdom", date: "2026-03-06", url: "#" },
    ].filter((row) => {
      if (focusCountry && row.country !== countryKey) return false;
      if (!focusBrand) return true;
      return row.title.toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedBrandKey);
    }),
  };
}

export type FreeHomeDashboardLoadState = {
  data: FreeHomeDashboardData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useFreeHomeDashboardData(windowKey: HomeWindowKey, brandKey: HomeBrandKey = "all", countryKey: HomeCountryKey = "all"): FreeHomeDashboardLoadState {
  const [data, setData] = useState<FreeHomeDashboardData | null>(() => buildData(windowKey, brandKey, countryKey));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    try {
      setData(buildData(windowKey, brandKey, countryKey));
      setError(null);
    } catch (err) {
      setError(String((err as Error)?.message || err));
    }
  }, [windowKey, brandKey, countryKey, nonce]);

  return useMemo(() => ({
    data,
    isLoading: false,
    error,
    reload: () => setNonce((value) => value + 1),
  }), [data, error]);
}

export const FREE_HOME_WINDOW_OPTIONS = HOME_WINDOW_OPTIONS.map((option) => ({ key: option.key, label: option.label }));
