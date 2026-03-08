export const VARIANT_PERFORMANCE = {
  kpis: {
    lifetimeSales: 1486,
    lifetimeMedian: 292,
    liquidityGrade: "A-",
    volatilityScore: 18,
    msrpVsResaleDeltaPct: 14.2,
  },
  rolling90: [262, 265, 268, 270, 272, 275, 279, 281, 286, 289, 291, 294],
  seasonality: [82, 78, 88, 91, 96, 102, 110, 114, 109, 98, 92, 86],
};

export const CONDITION_COMPS = {
  compRows: [
    { source: "eBay Sold", condition: "A", compPrice: 318, adjusted: 304 },
    { source: "SidelineSwap", condition: "A-", compPrice: 302, adjusted: 291 },
    { source: "Dealer Archive", condition: "B+", compPrice: 335, adjusted: 287 },
    { source: "eBay Sold", condition: "B", compPrice: 289, adjusted: 276 },
  ],
  elasticity: [1.05, 1.03, 1.01, 0.98, 0.95, 0.91, 0.88],
  conditionDist: [
    { label: "A", count: 19 },
    { label: "A-", count: 24 },
    { label: "B+", count: 28 },
    { label: "B", count: 17 },
    { label: "C", count: 8 },
  ],
  soldRows: [
    { date: "2026-03-05", source: "eBay", model: "A2000 1786", sold: 301 },
    { date: "2026-03-03", source: "SS", model: "PRO204", sold: 289 },
    { date: "2026-03-01", source: "Dealer", model: "Mizuno Pro", sold: 336 },
  ],
};

export const PORTFOLIO_OVERVIEW = {
  totalValue: 18420,
  gainLoss: 1620,
  appreciationRatePct: 9.7,
  gainLossTrend: [2.1, 2.6, 3.1, 4.2, 5.4, 6.2, 7.4, 8.3, 8.9, 9.7],
  exposureByBrand: [
    { label: "Rawlings", value: 34 },
    { label: "Wilson", value: 27 },
    { label: "Mizuno", value: 22 },
    { label: "44 Pro", value: 9 },
    { label: "Other", value: 8 },
  ],
};

export const CROSS_BRAND_INTELLIGENCE = {
  divergenceIndex: 1.18,
  jpUsSpread: [
    { label: "Rawlings", spreadPct: 12 },
    { label: "Wilson", spreadPct: 9 },
    { label: "Mizuno", spreadPct: 19 },
    { label: "Zett", spreadPct: 14 },
  ],
  matrixRows: [
    { mold: "NP5", tierA: "$302", tierB: "$281", tierC: "$248" },
    { mold: "1786", tierA: "$311", tierB: "$286", tierC: "$252" },
    { mold: "T9", tierA: "$327", tierB: "$296", tierC: "$258" },
  ],
  arbitrageRows: [
    { model: "A2000 1786", market: "US-West", discount: "p23", estUpside: "$36" },
    { model: "Mizuno Pro Haga", market: "JP", discount: "p21", estUpside: "$48" },
    { model: "Rawlings PRO204", market: "US-East", discount: "p24", estUpside: "$31" },
  ],
};

export const MARKET_RISK_SUPPLY = {
  marketRiskScore: 63,
  supplyShock: true,
  supplyVelocity: [0.88, 0.91, 0.95, 1.03, 1.09, 1.14, 1.11, 1.07],
  concentrationRows: [
    { brand: "Rawlings", share: 0.32 },
    { brand: "Wilson", share: 0.27 },
    { brand: "Mizuno", share: 0.17 },
    { brand: "Other", share: 0.24 },
  ],
  hhi: 2460,
};

export const ADVANCED_PRICE_ANALYTICS = {
  slopePct: 6.8,
  vwap: 296,
  rarityScore: 7.6,
  trend3: [284, 286, 291, 295, 296, 298],
  trend6: [276, 279, 283, 288, 292, 296],
  trend12: [258, 262, 268, 273, 279, 286],
  signatureRows: [
    { model: "A2K DATDUDE", multiplier: "1.24x" },
    { model: "Mizuno Pro Haga", multiplier: "1.19x" },
    { model: "Rawlings RSG", multiplier: "1.11x" },
  ],
};

export const INVENTORY_OPERATIONS = {
  agingHeatmap: [
    { bucket: "0-30d", infield: 18, outfield: 9, catcher: 4 },
    { bucket: "31-60d", infield: 13, outfield: 7, catcher: 5 },
    { bucket: "61-90d", infield: 8, outfield: 6, catcher: 3 },
    { bucket: "90+d", infield: 5, outfield: 4, catcher: 2 },
  ],
  marginRows: [
    { sku: "WIL-A2000-1786", cost: 187, resale: 286, marginPct: 34.6 },
    { sku: "RAW-PRO204-HOH", cost: 201, resale: 301, marginPct: 33.2 },
    { sku: "MIZ-HAGA-IF", cost: 244, resale: 336, marginPct: 27.4 },
  ],
  repricingSignals: [
    { sku: "WIL-A2000-1786", signal: "Raise +3%", reason: "High sell-through, below p50" },
    { sku: "RAW-PRO204-HOH", signal: "Hold", reason: "Balanced liquidity and margin" },
    { sku: "MIZ-HAGA-IF", signal: "Reduce -2%", reason: "Aging > 45d, market softening" },
  ],
  liquidityForecast: [58, 61, 64, 66, 69, 71, 74],
};

export const DEALER_INFRA = {
  exportRows: [
    { module: "Bulk Export", status: "Ready", detail: "CSV + JSON snapshots" },
    { module: "API Access", status: "Active", detail: "variant/sales/metrics endpoints" },
    { module: "Scheduled Feeds", status: "Configured", detail: "Daily 06:00 UTC" },
  ],
  benchmarkRows: [
    { dealer: "Dealer A", spread: "+4.2%", turnDays: 27, winRate: "62%" },
    { dealer: "Dealer B", spread: "+2.9%", turnDays: 34, winRate: "58%" },
    { dealer: "Dealer C", spread: "+5.1%", turnDays: 23, winRate: "66%" },
  ],
  regionalDemand: [44, 46, 49, 54, 57, 61, 64, 66],
  marketplacePerf: [
    { channel: "eBay", conv: "4.7%", avgPrice: 292 },
    { channel: "SS", conv: "5.1%", avgPrice: 286 },
    { channel: "Direct", conv: "3.8%", avgPrice: 314 },
  ],
};

