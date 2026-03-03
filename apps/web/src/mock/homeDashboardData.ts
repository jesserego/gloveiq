import { useEffect, useMemo, useState } from "react";
import type { HomeDashboardData } from "../lib/homeDashboard";

const spark = (base: number, spread: number): number[] =>
  Array.from({ length: 12 }).map((_, idx) => Math.max(0, Math.round(base + Math.sin(idx / 2.5) * spread + (idx % 4) * (spread / 5))));

const labels30d = Array.from({ length: 30 }).map((_, idx) => `D${idx + 1}`);

export const homeDashboardMockData: HomeDashboardData = {
  kpis: {
    totalSold30d: { value: 1842, deltaPct: 8.4, spark: spark(138, 24) },
    activeListings: { value: 3917, deltaPct: -1.9, spark: spark(3920, 180) },
    sellThroughRate: { valuePct: 46.8, deltaPct: 2.6, spark: spark(47, 4) },
    salesCount30d: { value: 1206, deltaPct: 5.3, spark: spark(95, 18) },
  },
  price: {
    median30d: 226,
    currentMedian: 248,
    p10: 88,
    p90: 468,
    series30d: labels30d.map((label, idx) => ({ label, value: 198 + (idx % 7) * 4 + Math.round(Math.sin(idx / 3) * 12) })),
    medianSeries30d: labels30d.map((label) => ({ label, value: 226 })),
    p10Series30d: labels30d.map((label, idx) => ({ label, value: 84 + Math.round(Math.sin(idx / 7) * 5) })),
    p90Series30d: labels30d.map((label, idx) => ({ label, value: 452 + Math.round(Math.cos(idx / 6) * 14) })),
  },
  brands: [
    { brand: "Rawlings", volume: 362 },
    { brand: "Wilson", volume: 341 },
    { brand: "Mizuno", volume: 216 },
    { brand: "44 Pro", volume: 144 },
    { brand: "Zett", volume: 119 },
  ],
  models: [
    { model: "A2000 1786", trendPct30d: 12.4, avgDaysToSell: 6.8 },
    { model: "HOH PRO204", trendPct30d: 9.7, avgDaysToSell: 8.1 },
    { model: "Mizuno Pro Haga IF", trendPct30d: 7.9, avgDaysToSell: 5.9 },
    { model: "44 Pro C2", trendPct30d: 6.3, avgDaysToSell: 7.4 },
    { model: "Pro Preferred PROS205", trendPct30d: 5.1, avgDaysToSell: 5.3 },
  ],
  regions: [
    { region: "US", medianPrice: 238 },
    { region: "JP", medianPrice: 274 },
    { region: "EU", medianPrice: 211 },
  ],
  listings: [
    { title: 'Rawlings HOH PRO204 11.5"', price: 229, source: "eBay", condition: "Used", date: "2026-03-01", url: "#" },
    { title: 'Wilson A2000 1786 11.5"', price: 185, source: "SidelineSwap", condition: "Used", date: "2026-03-02", url: "#" },
    { title: 'Mizuno Pro Haga Infield 11.75"', price: 312, source: "eBay", condition: "New", date: "2026-03-02", url: "#" },
    { title: '44 Pro C2 Custom 11.5"', price: 169, source: "JBG", condition: "New", date: "2026-03-03", url: "#" },
    { title: 'Zett ProStatus Infield 11.6"', price: 278, source: "eBay", condition: "Used", date: "2026-03-03", url: "#" },
  ],
};

export type HomeDashboardLoadState = {
  data: HomeDashboardData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useMockHomeDashboardData(): HomeDashboardLoadState {
  const [data, setData] = useState<HomeDashboardData | null>(null);
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
        setData(homeDashboardMockData);
      } catch (err) {
        setError(String((err as Error)?.message || err));
      } finally {
        setIsLoading(false);
      }
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [nonce]);

  return useMemo(() => ({
    data,
    isLoading,
    error,
    reload: () => setNonce((current) => current + 1),
  }), [data, isLoading, error]);
}
