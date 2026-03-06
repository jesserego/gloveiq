import { useEffect, useMemo, useState } from "react";
import { HOME_WINDOW_OPTIONS, type HomeWindowKey, percentChange } from "../lib/homeMarketUtils";

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
  { country: "Argentina", value: 93200, count: 378 },
  { country: "Colombia", value: 76800, count: 312 },
];

const trendSeed = [212, 214, 216, 218, 219, 221, 220, 223, 224, 226, 228, 227, 229, 231, 233, 235, 236, 238, 237, 239, 241, 243, 244, 246, 248, 247, 249, 252, 254, 256];
const salesSeed = [28, 31, 27, 33, 36, 35, 38, 42, 40, 44, 47, 39, 45, 48, 43, 50, 51, 46, 53, 55, 49, 58, 60, 57, 61, 54, 62, 65, 64, 68];

function buildSpark(base: number, spread: number): number[] {
  return Array.from({ length: 24 }).map((_, idx) => Math.max(1, Math.round(base + Math.sin(idx / 2.6) * spread + (idx % 3) * (spread / 4))));
}

function scaled(value: number, windowKey: HomeWindowKey): number {
  return Math.round(value * WINDOW_MULTIPLIER[windowKey]);
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

function buildData(windowKey: HomeWindowKey): FreeHomeDashboardData {
  const prev = previousWindow(windowKey);

  const countries = COUNTRIES.map((entry) => {
    const currentValue = scaled(entry.value, windowKey);
    const previousValue = scaled(entry.value, prev);
    return {
      country: entry.country,
      value: currentValue,
      count: scaled(entry.count, windowKey),
      change_pct: Number(percentChange(currentValue, previousValue).toFixed(1)),
    };
  });

  const totalValue = countries.reduce((sum, row) => sum + row.value, 0);
  const totalCount = countries.reduce((sum, row) => sum + row.count, 0);

  const soldValue = scaled(1845, windowKey);
  const activeValue = scaled(3920, windowKey);
  const sellThroughValue = Number((soldValue / Math.max(activeValue, 1) * 100).toFixed(1));

  const priceBump = priceShift(windowKey);
  const trend = trendSeed.map((point, idx) => {
    const median = point + priceBump;
    return {
      label: `D${idx + 1}`,
      medianPrice: median,
      salesCount: Math.max(3, Math.round(salesSeed[idx] * (WINDOW_MULTIPLIER[windowKey] * 0.45 + 0.6))),
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
      ],
      trending: [
        { model: "A2000 1786", trendPct: 12.4 },
        { model: "HOH PRO204", trendPct: 9.8 },
        { model: "Mizuno Pro Haga", trendPct: 8.1 },
        { model: "44 Pro C2", trendPct: 6.3 },
      ],
      fastest: [
        { model: "Pro Preferred 205", avgDaysToSell: 5.3 },
        { model: "Mizuno Pro Select", avgDaysToSell: 5.9 },
        { model: "A2000 1786", avgDaysToSell: 6.6 },
        { model: "HOH PRO204", avgDaysToSell: 7.7 },
      ],
    },
    listings: [
      { title: "Rawlings HOH PRO204 11.5\"", price: 229 + priceBump, source: "eBay", country: "US", date: "2026-03-02", url: "#" },
      { title: "Wilson A2000 1786 11.5\"", price: 188 + priceBump, source: "SidelineSwap", country: "US", date: "2026-03-03", url: "#" },
      { title: "Mizuno Pro Haga IF 11.75\"", price: 315 + priceBump, source: "eBay", country: "JP", date: "2026-03-03", url: "#" },
      { title: "44 Pro C2 Custom 11.5\"", price: 172 + priceBump, source: "JBG", country: "US", date: "2026-03-04", url: "#" },
      { title: "Zett ProStatus Infield 11.6\"", price: 282 + priceBump, source: "eBay", country: "JP", date: "2026-03-04", url: "#" },
      { title: "Wilson Staff DUAL 86 11.5\"", price: 352 + priceBump, source: "eBay", country: "Japan", date: "2026-03-05", url: "#" },
      { title: "Rawlings HyperTech R2G 11.75\"", price: 208 + priceBump, source: "eBay", country: "Canada", date: "2026-03-05", url: "#" },
      { title: "Mizuno Pro Classic 11.75\"", price: 301 + priceBump, source: "eBay", country: "United Kingdom", date: "2026-03-06", url: "#" },
    ],
  };
}

export type FreeHomeDashboardLoadState = {
  data: FreeHomeDashboardData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useFreeHomeDashboardData(windowKey: HomeWindowKey): FreeHomeDashboardLoadState {
  const [data, setData] = useState<FreeHomeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        setData(buildData(windowKey));
      } catch (err) {
        setError(String((err as Error)?.message || err));
      } finally {
        setIsLoading(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [windowKey, nonce]);

  return useMemo(() => ({
    data,
    isLoading,
    error,
    reload: () => setNonce((value) => value + 1),
  }), [data, isLoading, error]);
}

export const FREE_HOME_WINDOW_OPTIONS = HOME_WINDOW_OPTIONS.map((option) => ({ key: option.key, label: option.label }));
