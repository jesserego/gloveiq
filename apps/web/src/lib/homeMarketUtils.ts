export type HomeWindowKey = "1mo" | "3mo" | "6mo" | "1yr" | "ytd" | "all";

export const HOME_WINDOW_OPTIONS: Array<{ key: HomeWindowKey; label: string; ms: number }> = [
  { key: "1mo", label: "1mo", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "3mo", label: "3mo", ms: 90 * 24 * 60 * 60 * 1000 },
  { key: "6mo", label: "6mo", ms: 180 * 24 * 60 * 60 * 1000 },
  { key: "1yr", label: "1yr", ms: 365 * 24 * 60 * 60 * 1000 },
  { key: "ytd", label: "YTD", ms: 0 },
  { key: "all", label: "All", ms: Number.POSITIVE_INFINITY },
];

export function percentChange(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function quantizeScale(value: number, min: number, max: number, buckets = 5): number {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.min(buckets - 1, Math.floor(normalized * buckets));
}

export function compactCurrency(value: number): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString()}`;
  }
}
