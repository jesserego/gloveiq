export enum Tier {
  FREE = "FREE",
  COLLECTOR = "COLLECTOR",
  PRO = "PRO",
  DEALER = "DEALER",
}

export const TierOrder: Tier[] = [Tier.FREE, Tier.COLLECTOR, Tier.PRO, Tier.DEALER];

export function isTier(value: unknown): value is Tier {
  return TierOrder.includes(value as Tier);
}

export function canAccess(min: Tier, current: Tier): boolean {
  return TierOrder.indexOf(current) >= TierOrder.indexOf(min);
}
