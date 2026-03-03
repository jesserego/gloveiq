import { Tier, canAccess } from "@gloveiq/shared";

export const FeatureKey = {
  GLOBAL_EXPORT: "GLOBAL_EXPORT",
  CONDITION_NORMALIZATION: "CONDITION_NORMALIZATION",
  ARBITRAGE_ALERTS: "ARBITRAGE_ALERTS",
  UPCOMING_RELEASES_PANEL: "UPCOMING_RELEASES_PANEL",
  JAPAN_MARKET_PANEL: "JAPAN_MARKET_PANEL",
  BRAND_SEEDS_PANEL: "BRAND_SEEDS_PANEL",
} as const;

export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

export const featureMinTier: Record<FeatureKey, Tier> = {
  [FeatureKey.GLOBAL_EXPORT]: Tier.DEALER,
  [FeatureKey.CONDITION_NORMALIZATION]: Tier.PRO,
  [FeatureKey.ARBITRAGE_ALERTS]: Tier.DEALER,
  [FeatureKey.UPCOMING_RELEASES_PANEL]: Tier.COLLECTOR,
  [FeatureKey.JAPAN_MARKET_PANEL]: Tier.PRO,
  [FeatureKey.BRAND_SEEDS_PANEL]: Tier.COLLECTOR,
};

export function hasFeature(featureKey: FeatureKey, currentTier: Tier): boolean {
  return canAccess(featureMinTier[featureKey], currentTier);
}
