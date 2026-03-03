import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Tier, isTier } from "@gloveiq/shared";

const TIER_OVERRIDE_STORAGE_KEY = "gloveiq:tierOverride";

type TierContextValue = {
  tier: Tier;
  accountTier: Tier;
  isOverridden: boolean;
  setTierOverride: (tier: Tier) => void;
  clearTierOverride: () => void;
};

const TierContext = createContext<TierContextValue | null>(null);

export function TierProvider({
  children,
  accountTier: accountTierFromAuth,
}: {
  children: React.ReactNode;
  accountTier?: Tier | null;
}) {
  const accountTier = isTier(accountTierFromAuth) ? accountTierFromAuth : Tier.FREE;
  const [tierOverride, setTierOverrideState] = useState<Tier | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(TIER_OVERRIDE_STORAGE_KEY);
    if (isTier(raw)) setTierOverrideState(raw);
  }, []);

  const setTierOverride = (tier: Tier) => {
    setTierOverrideState(tier);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TIER_OVERRIDE_STORAGE_KEY, tier);
    }
  };

  const clearTierOverride = () => {
    setTierOverrideState(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TIER_OVERRIDE_STORAGE_KEY);
    }
  };

  const value = useMemo<TierContextValue>(() => {
    const tier = tierOverride || accountTier;
    return {
      tier,
      accountTier,
      isOverridden: Boolean(tierOverride),
      setTierOverride,
      clearTierOverride,
    };
  }, [tierOverride, accountTier]);

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error("useTier must be used within TierProvider");
  return ctx;
}
