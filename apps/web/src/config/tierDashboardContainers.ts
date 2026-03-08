import { Tier } from "@gloveiq/shared";

export type DashboardVizType =
  | "mixed_kpi_chart"
  | "table_chart_combo"
  | "portfolio_analytics"
  | "matrix_intelligence"
  | "risk_signals"
  | "advanced_models"
  | "inventory_ops"
  | "dealer_infra";

export type TierDashboardContainerConfig = {
  container_id: string;
  title: string;
  description: string;
  unlockTier: Tier;
  includedFeatures: string[];
  vizType: DashboardVizType;
  order: number;
};

export const TIER_DASHBOARD_CONTAINERS: TierDashboardContainerConfig[] = [
  {
    container_id: "collector_variant_performance",
    title: "Variant Performance",
    description: "Variant-level pricing quality, liquidity, and seasonality.",
    unlockTier: Tier.COLLECTOR,
    includedFeatures: [
      "Lifetime sales count",
      "Lifetime median",
      "90-day rolling median",
      "Volatility score",
      "Liquidity grade",
      "Seasonality chart (12 months)",
      "MSRP vs resale delta",
    ],
    vizType: "mixed_kpi_chart",
    order: 100,
  },
  {
    container_id: "collector_condition_comps",
    title: "Condition & Comps",
    description: "Condition-adjusted comparables and sold-history context.",
    unlockTier: Tier.COLLECTOR,
    includedFeatures: [
      "Condition-adjusted comps",
      "Condition price elasticity",
      "Sale history table (sold listings)",
    ],
    vizType: "table_chart_combo",
    order: 110,
  },
  {
    container_id: "collector_portfolio_overview",
    title: "Collection / Portfolio Overview",
    description: "Collection value, gain/loss, and exposure composition.",
    unlockTier: Tier.COLLECTOR,
    includedFeatures: [
      "Personal collection value",
      "Gain/loss since purchase",
      "Appreciation rate",
      "Insurance export",
      "Exposure by brand / tier",
    ],
    vizType: "portfolio_analytics",
    order: 120,
  },
  {
    container_id: "pro_cross_brand_intelligence",
    title: "Cross-Brand Market Intelligence",
    description: "Equivalency pricing, divergence, and arbitrage across markets.",
    unlockTier: Tier.PRO,
    includedFeatures: [
      "Cross-brand mold equivalency pricing",
      "Tier equivalency matrix",
      "Global price divergence index",
      "JP vs US premium spread",
      "Arbitrage opportunities",
      "Buy-at-retail vs resale premium index",
    ],
    vizType: "matrix_intelligence",
    order: 200,
  },
  {
    container_id: "pro_market_risk_supply",
    title: "Market Risk & Supply Signals",
    description: "Supply shocks, concentration, and structural risk metrics.",
    unlockTier: Tier.PRO,
    includedFeatures: [
      "Supply shock detection",
      "Inventory growth vs velocity ratio",
      "Brand concentration index (HHI)",
      "Market risk score",
    ],
    vizType: "risk_signals",
    order: 210,
  },
  {
    container_id: "pro_advanced_price_analytics",
    title: "Advanced Price Analytics",
    description: "Model-driven trend analytics and rarity/multiplier signals.",
    unlockTier: Tier.PRO,
    includedFeatures: [
      "Price trend slope",
      "3/6/12 month trend models",
      "VWAP",
      "Rarity score",
      "Signature model price multiplier",
    ],
    vizType: "advanced_models",
    order: 220,
  },
  {
    container_id: "dealer_inventory_operations",
    title: "Inventory Operations",
    description: "Aging, margin control, arbitrage alerts, and repricing signals.",
    unlockTier: Tier.DEALER,
    includedFeatures: [
      "Aging inventory heatmap",
      "Margin tracking per SKU",
      "Purchase price vs resale margin",
      "Real-time arbitrage alerts",
      "Liquidity forecasting",
      "Dynamic repricing signals",
    ],
    vizType: "inventory_ops",
    order: 300,
  },
  {
    container_id: "dealer_data_infrastructure",
    title: "Dealer Data / Infrastructure",
    description: "Exports, APIs, benchmarking, forecasting, and reporting tools.",
    unlockTier: Tier.DEALER,
    includedFeatures: [
      "Bulk data export",
      "API access",
      "Scheduled feeds",
      "Custom reports",
      "Multi-account tracking",
      "Private comp benchmarking",
      "Regional demand forecasting",
      "Dealer marketplace analytics",
    ],
    vizType: "dealer_infra",
    order: 310,
  },
];

