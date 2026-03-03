import React from "react";
import { Tier, canAccess } from "@gloveiq/shared";
import { useTier } from "../providers/TierProvider";

export function TierGate({
  min,
  children,
  fallback = null,
}: {
  min: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { tier } = useTier();
  return <>{canAccess(min, tier) ? children : fallback}</>;
}
