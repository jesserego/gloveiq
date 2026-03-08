import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tier } from "@gloveiq/shared";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { Chart as ChartInstance, ChartData, ChartOptions } from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";
import { Card, CardContent, Button } from "../../ui/Primitives";
import GlobalGloveMarketCard from "../home/GlobalGloveMarketCard";
import WindowFilterMenu from "../home/WindowFilterMenu";
import type { HomeWindowKey } from "../../lib/homeMarketUtils";
import {
  applyChartJsDefaults,
  buildChartOptions,
  hexToRgba,
  initChartThemeSync,
  readChartThemeTokens,
  registerChartInstance,
  unregisterChartInstance,
} from "../../lib/chartjsTheme";
import { ThemedBarChart, ThemedLineChart } from "../charts/ThemedCharts";
import { FREE_HOME_WINDOW_OPTIONS, useFreeHomeDashboardData, type FreeHomeDashboardData } from "../../mock/freeHomeDashboardData";
import { TIER_DASHBOARD_CONTAINERS, type TierDashboardContainerConfig } from "../../config/tierDashboardContainers";
import {
  ADVANCED_PRICE_ANALYTICS,
  CONDITION_COMPS,
  CROSS_BRAND_INTELLIGENCE,
  DEALER_INFRA,
  INVENTORY_OPERATIONS,
  MARKET_RISK_SUPPLY,
  PORTFOLIO_OVERVIEW,
  VARIANT_PERFORMANCE,
} from "../../mock/tierDashboardMocks";

const TIER_RANK: Record<Tier, number> = {
  [Tier.FREE]: 0,
  [Tier.COLLECTOR]: 1,
  [Tier.PRO]: 2,
  [Tier.DEALER]: 3,
};

const TIER_BADGE: Record<Tier, { label: string; color: string }> = {
  [Tier.FREE]: { label: "FREE", color: "#94A3B8" },
  [Tier.COLLECTOR]: { label: "COLLECTOR", color: "#3B82F6" },
  [Tier.PRO]: { label: "PRO", color: "#A855F7" },
  [Tier.DEALER]: { label: "DEALER", color: "#F59E0B" },
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function TrendDelta({ value }: { value: number }) {
  const epsilon = 0.15;
  const isUp = value > epsilon;
  const isDown = value < -epsilon;
  const color = isUp ? "success.main" : isDown ? "error.main" : "text.secondary";
  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {isUp ? <TrendingUpRoundedIcon sx={{ fontSize: 14, color }} /> : null}
      {isDown ? <TrendingDownRoundedIcon sx={{ fontSize: 14, color }} /> : null}
      {!isUp && !isDown ? <TrendingFlatRoundedIcon sx={{ fontSize: 14, color }} /> : null}
      <Typography variant="caption" sx={{ color, fontWeight: 800 }}>
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}%
      </Typography>
    </Stack>
  );
}

function PanelShell({
  title,
  subtitle,
  selectedWindow,
  onWindow,
  showWindowFilter = true,
  children,
  cardSx,
}: {
  title: string;
  subtitle?: string;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
  showWindowFilter?: boolean;
  children: React.ReactNode;
  cardSx?: object;
}) {
  return (
    <Card sx={{ height: "100%", ...cardSx }}>
      <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, p: { xs: 1.2, md: 1 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {showWindowFilter ? <WindowFilterMenu selected={selectedWindow} options={FREE_HOME_WINDOW_OPTIONS} onChange={onWindow} /> : null}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const tokens = readChartThemeTokens();
  const labels = points.map((_, idx) => `${idx + 1}`);
  return (
    <ThemedLineChart
      data={{
        labels,
        datasets: [
          {
            data: points,
            borderColor: positive ? tokens.positive : tokens.negative,
            backgroundColor: hexToRgba(positive ? tokens.positive : tokens.negative, tokens.isDark ? 0.18 : 0.25),
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.8,
          },
        ],
      }}
      options={{
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false, grid: { display: false }, border: { display: false } },
          y: { display: false, grid: { display: false }, border: { display: false } },
        },
      }}
      height={{ xs: 44, sm: 48, md: 52 }}
    />
  );
}

function MarketSnapshotPanel({
  data,
  selectedWindow,
  onWindow,
}: {
  data: FreeHomeDashboardData;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
}) {
  const tokens = readChartThemeTokens();
  const rows = [
    {
      label: "Total gloves sold",
      value: data.marketSnapshot.sold.value.toLocaleString(),
      delta: data.marketSnapshot.sold.deltaPct,
      spark: data.marketSnapshot.sold.spark,
    },
    {
      label: "Active listings",
      value: data.marketSnapshot.active.value.toLocaleString(),
      delta: data.marketSnapshot.active.deltaPct,
      spark: data.marketSnapshot.active.spark,
    },
    {
      label: "Sell-through rate",
      value: `${data.marketSnapshot.sellThrough.value.toFixed(1)}%`,
      delta: data.marketSnapshot.sellThrough.deltaPct,
      spark: data.marketSnapshot.sellThrough.spark,
    },
  ];

  return (
    <PanelShell
      title="Market Overview"
      subtitle="Last 30 Days"
      selectedWindow={selectedWindow}
      onWindow={onWindow}
      cardSx={{
        background: tokens.isDark
          ? `linear-gradient(180deg, ${alpha(tokens.bgCard, 0.96)} 0%, ${alpha(tokens.bgCard, 0.86)} 100%)`
          : "linear-gradient(180deg,#FFFFFF,#F6F6F8)",
        borderColor: alpha(tokens.border, tokens.isDark ? 0.56 : 0.42),
        boxShadow: tokens.isDark
          ? "0 16px 34px rgba(0,0,0,0.42)"
          : "0 14px 30px rgba(2,6,23,0.08)",
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 0.8, flex: 1 }}>
        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              p: 1,
              border: "1px solid",
              borderColor: alpha(tokens.border, tokens.isDark ? 0.54 : 0.3),
              borderRadius: 1.3,
              minHeight: 170,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.66 : 0.78),
              boxShadow: tokens.isDark ? "inset 0 0 0 1px rgba(255,255,255,0.02)" : "none",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {row.label}
            </Typography>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 0.4 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1 }}>
                {row.value}
              </Typography>
              <TrendDelta value={row.delta} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              vs prev
            </Typography>
            <Sparkline points={row.spark} positive={row.delta >= 0} />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ pt: 0.5, borderTop: "1px dashed", borderColor: alpha(tokens.border, tokens.isDark ? 0.4 : 0.35) }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {row.value}
              </Typography>
              <TrendDelta value={row.delta} />
            </Stack>
          </Box>
        ))}
      </Box>
    </PanelShell>
  );
}

function PriceOverviewPanel({
  data,
  selectedWindow,
  onWindow,
}: {
  data: FreeHomeDashboardData;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
}) {
  const tokens = readChartThemeTokens();
  const range = data.priceOverview.p90 - data.priceOverview.p10;
  const spreadPct = Math.round((range / Math.max(data.priceOverview.medianWindow, 1)) * 100);
  const trendSeries = data.salesTrend.series;
  const trendLabels = trendSeries.map((row) => row.label);
  const currentSpark = trendSeries.slice(-12).map((row) => row.medianPrice + 8);
  const medianSpark = trendSeries.slice(-12).map((row) => row.medianPrice);

  return (
    <PanelShell
      title="Price Overview"
      subtitle="Pricing"
      selectedWindow={selectedWindow}
      onWindow={onWindow}
      cardSx={{
        background: tokens.isDark
          ? `linear-gradient(180deg, ${alpha(tokens.bgCard, 0.96)} 0%, ${alpha(tokens.bgCard, 0.86)} 100%)`
          : "linear-gradient(180deg,#FFFFFF,#F6F6F8)",
        borderColor: alpha(tokens.border, tokens.isDark ? 0.56 : 0.42),
        boxShadow: tokens.isDark
          ? "0 16px 34px rgba(0,0,0,0.42)"
          : "0 14px 30px rgba(2,6,23,0.08)",
      }}
    >
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 0.8 }}>
          <Box sx={{ p: 1, borderRadius: 1.3, border: "1px solid", borderColor: alpha(tokens.border, tokens.isDark ? 0.54 : 0.3), bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.66 : 0.78), minHeight: 182 }}>
            <Typography variant="caption" color="text.secondary">
              Current Price
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.25 }}>
              <Typography variant="h3" sx={{ fontWeight: 900, color: tokens.positive }}>
                {money(data.priceOverview.currentMedian)}
              </Typography>
              <TrendDelta value={data.priceOverview.deltaPct} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              vs prev
            </Typography>
            <Box sx={{ mt: 0.4 }}>
              <Sparkline points={currentSpark} positive />
            </Box>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1.3, border: "1px solid", borderColor: alpha(tokens.border, tokens.isDark ? 0.54 : 0.3), bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.66 : 0.78), minHeight: 182 }}>
            <Typography variant="caption" color="text.secondary">
              Median (30d)
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.25 }}>
              <Typography variant="h3" sx={{ fontWeight: 900 }}>
                {money(data.priceOverview.medianWindow)}
              </Typography>
              <TrendDelta value={Math.max(0.2, data.priceOverview.deltaPct - 0.7)} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              vs prev
            </Typography>
            <Box sx={{ mt: 0.4 }}>
              <Sparkline points={medianSpark} positive />
            </Box>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1.3, border: "1px solid", borderColor: alpha(tokens.border, tokens.isDark ? 0.54 : 0.3), bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.66 : 0.78), minHeight: 182 }}>
            <Typography variant="caption" color="text.secondary">
              Price Range
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, mt: 0.25 }}>
              {money(data.priceOverview.p10)} - {money(data.priceOverview.p90)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Spread: {spreadPct}%
            </Typography>
            <Box sx={{ mt: 1.1, height: 40, borderRadius: 1, border: "1px solid", borderColor: alpha(tokens.border, tokens.isDark ? 0.4 : 0.28), background: alpha(tokens.chart1, tokens.isDark ? 0.12 : 0.16), position: "relative", overflow: "hidden" }}>
              <Box sx={{ position: "absolute", left: "7%", right: "7%", top: "35%", height: 12, borderRadius: 999, background: alpha(tokens.chart1, tokens.isDark ? 0.35 : 0.42) }} />
              <Box sx={{ position: "absolute", left: "34%", width: 18, top: "20%", bottom: "20%", borderRadius: 0.6, background: alpha(tokens.chart3, tokens.isDark ? 0.9 : 0.8) }} />
            </Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{money(data.priceOverview.p10)}</Typography>
              <Typography variant="caption" color="text.secondary">{money(data.priceOverview.p90)}</Typography>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ p: 1, borderRadius: 1.3, border: "1px solid", borderColor: alpha(tokens.border, tokens.isDark ? 0.54 : 0.3), bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.66 : 0.78), flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Price Trend
          </Typography>
          <ThemedLineChart
            data={{
              labels: trendLabels,
              datasets: [
                {
                  label: "Median",
                  data: trendSeries.map((row) => row.medianPrice),
                  borderColor: tokens.chart1,
                  backgroundColor: hexToRgba(tokens.chart1, tokens.isDark ? 0.24 : 0.3),
                  fill: false,
                  tension: 0.32,
                  pointRadius: 0,
                  borderWidth: 2,
                },
                {
                  label: "p10",
                  data: trendSeries.map((row) => row.p10),
                  borderColor: hexToRgba(tokens.chart3, 0.35),
                  pointRadius: 0,
                  borderWidth: 1,
                  tension: 0.26,
                  fill: false,
                },
                {
                  label: "Range",
                  data: trendSeries.map((row) => row.p90),
                  borderColor: hexToRgba(tokens.chart3, 0.4),
                  backgroundColor: hexToRgba(tokens.chart1, tokens.isDark ? 0.18 : 0.22),
                  pointRadius: 0,
                  borderWidth: 1,
                  tension: 0.26,
                  fill: "-1",
                },
              ],
            }}
            options={{
              plugins: {
                legend: { display: false },
              },
              scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
                y: { ticks: { callback: (value) => `$${value}` } },
              },
            }}
            height={{ xs: 190, sm: 210, md: 240 }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.45 }}>
            <Typography variant="caption" color="text.secondary">{money(data.priceOverview.p10)}</Typography>
            <Typography variant="caption" color="text.secondary">{money(data.priceOverview.p90)}</Typography>
          </Stack>
        </Box>
      </Stack>
    </PanelShell>
  );
}

function SalesTrendPanel({
  data,
  selectedWindow,
  onWindow,
  tier,
}: {
  data: FreeHomeDashboardData;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
  tier: Tier;
}) {
  const tokens = readChartThemeTokens();
  const chartRef = useRef<ChartInstance<"bar"> | null>(null);

  useEffect(() => {
    registerChartInstance(chartRef.current);
    return () => unregisterChartInstance(chartRef.current);
  }, []);

  const chartData: ChartData<"bar"> = {
    labels: data.salesTrend.series.map((row) => row.label),
    datasets: [
      {
        // Mixed chart in a single panel (bars + line overlays).
        type: "bar",
        label: "Sales count",
        yAxisID: "ySales",
        data: data.salesTrend.series.map((row) => row.salesCount),
        backgroundColor: hexToRgba(tokens.chart3, tokens.isDark ? 0.38 : 0.5),
        borderRadius: 6,
      },
      {
        type: "line",
        label: "Median price",
        yAxisID: "yPrice",
        data: data.salesTrend.series.map((row) => row.medianPrice),
        borderColor: tokens.chart1,
        backgroundColor: hexToRgba(tokens.chart1, tokens.isDark ? 0.18 : 0.28),
        fill: false,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
      {
        type: "line",
        label: "p10",
        yAxisID: "yPrice",
        data: data.salesTrend.series.map((row) => row.p10),
        borderColor: hexToRgba(tokens.chart2, 0.45),
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.25,
        fill: false,
      },
      {
        type: "line",
        label: "p90 band",
        yAxisID: "yPrice",
        data: data.salesTrend.series.map((row) => row.p90),
        borderColor: hexToRgba(tokens.chart2, 0.45),
        backgroundColor: hexToRgba(tokens.chart2, tokens.isDark ? 0.2 : 0.3),
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.25,
        fill: "-1",
      },
    ],
  } as any;

  const chartOptions: ChartOptions<"bar"> = {
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === "yPrice") {
              return `${ctx.dataset.label}: ${money(Number(ctx.parsed.y || 0))}`;
            }
            return `${ctx.dataset.label}: ${Number(ctx.parsed.y || 0).toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 8 },
        grid: { display: false },
      },
      ySales: {
        type: "linear",
        position: "left",
        beginAtZero: true,
      },
      yPrice: {
        type: "linear",
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  return (
    <PanelShell title="Sales Trend" subtitle="Median price + sales count" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={0.8} sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1.2} sx={{ flexWrap: "wrap" }}>
          <Chip size="small" label={`${money(data.salesTrend.windowMedian)} median`} />
          <Chip size="small" label={`${data.salesTrend.windowSales.toLocaleString()} sales`} />
          <Chip size="small" label="3/6/12 mo models" disabled={TIER_RANK[tier] < TIER_RANK[Tier.PRO]} />
          {TIER_RANK[tier] < TIER_RANK[Tier.PRO] ? <Chip size="small" label="Pro Analytics" /> : null}
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, height: { xs: 220, sm: 250, md: 300 } }}>
          <ReactChart ref={chartRef} type="bar" data={chartData} options={buildChartOptions(chartOptions)} />
        </Box>
      </Stack>
    </PanelShell>
  );
}

function BrandModelInsightsPanel({
  data,
  selectedWindow,
  onWindow,
}: {
  data: FreeHomeDashboardData;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
}) {
  const tokens = readChartThemeTokens();

  return (
    <PanelShell title="Brand & Model Insights" subtitle="Top brands, trending, fastest" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
        <ThemedBarChart
          data={{
            labels: data.brandModelInsights.brands.map((row) => row.brand),
            datasets: [
              {
                label: "Top brands by volume",
                data: data.brandModelInsights.brands.map((row) => row.volume),
                backgroundColor: [tokens.chart1, tokens.chart2, tokens.chart3, tokens.chart4, hexToRgba(tokens.accent, 0.72)],
                borderRadius: 8,
              },
            ],
          }}
          options={{
            indexAxis: "y",
            plugins: { legend: { display: true, position: "bottom" } },
            scales: {
              x: { beginAtZero: true },
              y: { grid: { display: false } },
            },
          }}
          height={{ xs: 170, sm: 190, md: 210 }}
        />

        <Divider />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 0.8, flex: 1, minHeight: 0 }}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, p: 1, minHeight: 0, overflow: "auto" }}>
            <Typography variant="caption" color="text.secondary">Trending models (30-day % change)</Typography>
            <Stack spacing={0.6} sx={{ mt: 0.8 }}>
              {data.brandModelInsights.trending.map((row) => (
                <Stack key={row.model} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" noWrap sx={{ maxWidth: "70%" }}>{row.model}</Typography>
                  <TrendDelta value={row.trendPct} />
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, p: 1, minHeight: 0, overflow: "auto" }}>
            <Typography variant="caption" color="text.secondary">Fastest selling models (avg days to sell)</Typography>
            <Stack spacing={0.6} sx={{ mt: 0.8 }}>
              {data.brandModelInsights.fastest.map((row) => (
                <Stack key={row.model} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" noWrap sx={{ maxWidth: "70%" }}>{row.model}</Typography>
                  <Chip size="small" label={`${row.avgDaysToSell.toFixed(1)}d`} />
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Stack>
    </PanelShell>
  );
}

function ListingsPanel({
  data,
  selectedWindow,
  onWindow,
}: {
  data: FreeHomeDashboardData;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
}) {
  const thumbColorFromTitle = (title: string) => {
    const palette = ["#2563EB", "#0891B2", "#0F766E", "#9333EA", "#BE185D", "#B45309", "#1D4ED8"];
    const seed = Array.from(title).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return palette[seed % palette.length];
  };

  return (
    <PanelShell
      title="Listings (Public / Unnormalized Condition)"
      subtitle="Evidence table"
      selectedWindow={selectedWindow}
      onWindow={onWindow}
    >
      <Box sx={{ flex: 1, minHeight: { xs: 280, md: 320 }, overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 64 }}>Thumb</TableCell>
              <TableCell>Title</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.listings.map((row) => (
              <TableRow key={`${row.title}_${row.date}`}>
                <TableCell>
                  <Box
                    sx={{
                      width: 42,
                      height: 30,
                      borderRadius: 0.9,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: thumbColorFromTitle(row.title),
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "#fff", fontWeight: 800, letterSpacing: 0.2 }}>
                      {row.title.slice(0, 2).toUpperCase()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 360 }}>
                  <Typography variant="body2" noWrap>{row.title}</Typography>
                </TableCell>
                <TableCell align="right">{money(row.price)}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell align="right">
                  <Button
                    color="primary"
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="inherit" />}
                    onClick={() => window.open(row.url, "_blank", "noopener,noreferrer")}
                    sx={{ minWidth: 58, px: 1.1, py: 0.25, fontSize: 11, lineHeight: 1.1 }}
                  >
                    Link
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Divider sx={{ my: 0.8 }} />
      <Typography variant="caption" color="text.secondary">View more listings</Typography>
    </PanelShell>
  );
}

function LockedTierContainer({
  container,
  selectedWindow,
  onWindow,
  compact = false,
}: {
  container: TierDashboardContainerConfig;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
  compact?: boolean;
}) {
  const tokens = readChartThemeTokens();
  const unlock = TIER_BADGE[container.unlockTier];
  return (
    <PanelShell
      title={container.title}
      subtitle={container.description}
      selectedWindow={selectedWindow}
      onWindow={onWindow}
      showWindowFilter={!compact}
    >
      <Box sx={{ position: "relative", flex: 1, minHeight: { xs: 230, md: compact ? 150 : 220 }, border: "1px solid", borderColor: "divider", borderRadius: 1.4, overflow: "hidden" }}>
        <Box sx={{ p: compact ? 0.9 : 1.1, filter: compact ? "blur(1.6px)" : "blur(2px)", opacity: 0.68 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 0.8 }}>
            {[1, 2, 3].map((idx) => (
              <Box key={idx} sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
                <Typography variant="caption" color="text.secondary">Teaser metric {idx}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>--</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 1.1, height: compact ? 70 : 130, borderRadius: 1.2, border: "1px dashed", borderColor: "divider", background: alpha(tokens.chart1, tokens.isDark ? 0.11 : 0.18) }} />
        </Box>
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.46 : 0.55) }}>
          <Stack spacing={0.9} alignItems="center">
            <Chip size="small" label={`${unlock.label} Feature`} sx={{ bgcolor: alpha(unlock.color, 0.2), borderColor: alpha(unlock.color, 0.6), color: "text.primary" }} />
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 420 }}>
              Upgrade to {unlock.label} to unlock {container.title.toLowerCase()}.
            </Typography>
            <Button size="small">Upgrade to {unlock.label}</Button>
          </Stack>
        </Box>
      </Box>
    </PanelShell>
  );
}

function VariantPerformancePanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  const tokens = readChartThemeTokens();
  return (
    <PanelShell title="Variant Performance" subtitle="Variant-level historical pricing and liquidity" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(5,minmax(0,1fr))" }, gap: 0.8 }}>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Lifetime sales</Typography><Typography sx={{ fontWeight: 900 }}>{VARIANT_PERFORMANCE.kpis.lifetimeSales.toLocaleString()}</Typography></Box>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Lifetime median</Typography><Typography sx={{ fontWeight: 900 }}>{money(VARIANT_PERFORMANCE.kpis.lifetimeMedian)}</Typography></Box>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Liquidity grade</Typography><Typography sx={{ fontWeight: 900 }}>{VARIANT_PERFORMANCE.kpis.liquidityGrade}</Typography></Box>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Volatility</Typography><Chip size="small" label={`${VARIANT_PERFORMANCE.kpis.volatilityScore}/100`} /></Box>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">MSRP vs resale</Typography><Typography sx={{ fontWeight: 900, color: "success.main" }}>+{VARIANT_PERFORMANCE.kpis.msrpVsResaleDeltaPct}%</Typography></Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" }, gap: 0.8 }}>
          <ThemedLineChart
            data={{ labels: VARIANT_PERFORMANCE.rolling90.map((_, idx) => `W${idx + 1}`), datasets: [{ label: "90-day rolling median", data: VARIANT_PERFORMANCE.rolling90, borderColor: tokens.chart1, backgroundColor: hexToRgba(tokens.chart1, 0.16), fill: true, tension: 0.3, pointRadius: 1.8 }] }}
            options={{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (value) => `$${value}` } } } }}
            height={{ xs: 180, md: 200 }}
          />
          <ThemedBarChart
            data={{ labels: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"], datasets: [{ label: "Seasonality", data: VARIANT_PERFORMANCE.seasonality, backgroundColor: hexToRgba(tokens.chart3, tokens.isDark ? 0.64 : 0.74), borderRadius: 8 }] }}
            options={{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }}
            height={{ xs: 180, md: 200 }}
          />
        </Box>
      </Stack>
    </PanelShell>
  );
}

function ConditionCompsPanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  return (
    <PanelShell title="Condition & Comps" subtitle="Condition-adjusted market understanding" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.25fr 1fr" }, gap: 0.8 }}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Source</TableCell><TableCell>Cond.</TableCell><TableCell align="right">Comp</TableCell><TableCell align="right">Adjusted</TableCell></TableRow></TableHead>
              <TableBody>{CONDITION_COMPS.compRows.map((row) => <TableRow key={`${row.source}_${row.compPrice}`}><TableCell>{row.source}</TableCell><TableCell>{row.condition}</TableCell><TableCell align="right">{money(row.compPrice)}</TableCell><TableCell align="right">{money(row.adjusted)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </Box>
          <ThemedBarChart
            data={{ labels: CONDITION_COMPS.conditionDist.map((row) => row.label), datasets: [{ label: "Condition distribution", data: CONDITION_COMPS.conditionDist.map((row) => row.count), borderRadius: 10 }] }}
            options={{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }}
            height={{ xs: 170, md: 190 }}
          />
        </Box>
        <ThemedLineChart
          data={{ labels: ["Mint", "A", "A-", "B+", "B", "C+", "C"], datasets: [{ label: "Elasticity", data: CONDITION_COMPS.elasticity, borderColor: "#34D399", tension: 0.32, pointRadius: 2 }] }}
          options={{ plugins: { legend: { display: false } } }}
          height={{ xs: 150, md: 170 }}
        />
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Source</TableCell><TableCell>Model</TableCell><TableCell align="right">Sold</TableCell></TableRow></TableHead>
            <TableBody>{CONDITION_COMPS.soldRows.map((row) => <TableRow key={`${row.date}_${row.model}`}><TableCell>{row.date}</TableCell><TableCell>{row.source}</TableCell><TableCell>{row.model}</TableCell><TableCell align="right">{money(row.sold)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </Box>
      </Stack>
    </PanelShell>
  );
}

function PortfolioOverviewPanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  const tokens = readChartThemeTokens();
  return (
    <PanelShell title="Collection / Portfolio Overview" subtitle="Ownership and value tracking" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: 0.8 }}>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Collection value</Typography><Typography sx={{ fontWeight: 900 }}>{money(PORTFOLIO_OVERVIEW.totalValue)}</Typography></Box>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Gain/Loss</Typography><Typography sx={{ fontWeight: 900, color: "success.main" }}>+{money(PORTFOLIO_OVERVIEW.gainLoss)}</Typography></Box>
          <Box sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}><Typography variant="caption" color="text.secondary">Appreciation</Typography><Typography sx={{ fontWeight: 900 }}>{PORTFOLIO_OVERVIEW.appreciationRatePct}%</Typography></Box>
          <Button sx={{ minHeight: 0, py: 0.6 }}>Insurance Export</Button>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.3fr 1fr" }, gap: 0.8 }}>
          <ThemedLineChart
            data={{ labels: PORTFOLIO_OVERVIEW.gainLossTrend.map((_, idx) => `M${idx + 1}`), datasets: [{ label: "Gain/Loss trend", data: PORTFOLIO_OVERVIEW.gainLossTrend, borderColor: tokens.positive, backgroundColor: hexToRgba(tokens.positive, 0.15), fill: true, tension: 0.34, pointRadius: 0 }] }}
            options={{ plugins: { legend: { display: false } } }}
            height={{ xs: 180, md: 200 }}
          />
          <ThemedBarChart
            data={{ labels: PORTFOLIO_OVERVIEW.exposureByBrand.map((row) => row.label), datasets: [{ label: "Exposure %", data: PORTFOLIO_OVERVIEW.exposureByBrand.map((row) => row.value), borderRadius: 8 }] }}
            options={{ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }}
            height={{ xs: 180, md: 200 }}
          />
        </Box>
      </Stack>
    </PanelShell>
  );
}

function CrossBrandIntelligencePanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  return (
    <PanelShell title="Cross-Brand Market Intelligence" subtitle="Equivalency pricing and divergence analytics" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Stack direction="row" spacing={0.8}>
          <Chip size="small" label={`Divergence index ${CROSS_BRAND_INTELLIGENCE.divergenceIndex}`} />
          <Chip size="small" label="Pro Analytics" sx={{ opacity: 0.9 }} />
        </Stack>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
          <Table size="small"><TableHead><TableRow><TableCell>Mold</TableCell><TableCell align="right">Tier A</TableCell><TableCell align="right">Tier B</TableCell><TableCell align="right">Tier C</TableCell></TableRow></TableHead><TableBody>{CROSS_BRAND_INTELLIGENCE.matrixRows.map((row) => <TableRow key={row.mold}><TableCell>{row.mold}</TableCell><TableCell align="right">{row.tierA}</TableCell><TableCell align="right">{row.tierB}</TableCell><TableCell align="right">{row.tierC}</TableCell></TableRow>)}</TableBody></Table>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 0.8 }}>
          <ThemedBarChart
            data={{ labels: CROSS_BRAND_INTELLIGENCE.jpUsSpread.map((row) => row.label), datasets: [{ label: "JP vs US spread %", data: CROSS_BRAND_INTELLIGENCE.jpUsSpread.map((row) => row.spreadPct), borderRadius: 8 }] }}
            options={{ plugins: { legend: { display: false } } }}
            height={{ xs: 170, md: 190 }}
          />
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, p: 1, overflow: "auto" }}>
            <Typography variant="caption" color="text.secondary">Arbitrage opportunities</Typography>
            <Stack spacing={0.65} sx={{ mt: 0.7 }}>
              {CROSS_BRAND_INTELLIGENCE.arbitrageRows.map((row) => (
                <Stack key={`${row.model}_${row.market}`} direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2">{row.model}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.market} • {row.discount} • {row.estUpside}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Stack>
    </PanelShell>
  );
}

function MarketRiskSupplyPanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  return (
    <PanelShell title="Market Risk & Supply Signals" subtitle="Structural market conditions and risk" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        {MARKET_RISK_SUPPLY.supplyShock ? <Alert severity="warning">Supply shock detected: inventory inflow +17% vs velocity trend.</Alert> : null}
        <Stack direction="row" spacing={0.8}>
          <Chip size="small" label={`Risk score ${MARKET_RISK_SUPPLY.marketRiskScore}`} color={MARKET_RISK_SUPPLY.marketRiskScore > 70 ? "error" : "warning"} />
          <Chip size="small" label={`HHI ${MARKET_RISK_SUPPLY.hhi}`} />
        </Stack>
        <ThemedLineChart
          data={{ labels: MARKET_RISK_SUPPLY.supplyVelocity.map((_, idx) => `W${idx + 1}`), datasets: [{ label: "Supply/velocity ratio", data: MARKET_RISK_SUPPLY.supplyVelocity, borderColor: "#F59E0B", pointRadius: 2 }] }}
          options={{ plugins: { legend: { display: false } } }}
          height={{ xs: 160, md: 180 }}
        />
        <ThemedBarChart
          data={{ labels: MARKET_RISK_SUPPLY.concentrationRows.map((row) => row.brand), datasets: [{ label: "Market share", data: MARKET_RISK_SUPPLY.concentrationRows.map((row) => Number((row.share * 100).toFixed(1))), borderRadius: 8 }] }}
          options={{ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }}
          height={{ xs: 170, md: 180 }}
        />
      </Stack>
    </PanelShell>
  );
}

function AdvancedPriceAnalyticsPanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  return (
    <PanelShell title="Advanced Price Analytics" subtitle="Model-driven trend and rarity analytics" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Stack direction="row" spacing={0.8}>
          <Chip size="small" label={`Slope +${ADVANCED_PRICE_ANALYTICS.slopePct}%`} color="success" />
          <Chip size="small" label={`VWAP ${money(ADVANCED_PRICE_ANALYTICS.vwap)}`} />
          <Chip size="small" label={`Rarity ${ADVANCED_PRICE_ANALYTICS.rarityScore}/10`} />
        </Stack>
        <ThemedLineChart
          data={{
            labels: ADVANCED_PRICE_ANALYTICS.trend12.map((_, idx) => `T${idx + 1}`),
            datasets: [
              { label: "3mo", data: ADVANCED_PRICE_ANALYTICS.trend3, borderColor: "#38BDF8", pointRadius: 1.8 },
              { label: "6mo", data: ADVANCED_PRICE_ANALYTICS.trend6, borderColor: "#22C55E", pointRadius: 1.8 },
              { label: "12mo", data: ADVANCED_PRICE_ANALYTICS.trend12, borderColor: "#A78BFA", pointRadius: 1.8 },
            ],
          }}
          options={{ plugins: { legend: { position: "bottom" } } }}
          height={{ xs: 180, md: 210 }}
        />
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
          <Table size="small"><TableHead><TableRow><TableCell>Signature model</TableCell><TableCell align="right">Price multiplier</TableCell></TableRow></TableHead><TableBody>{ADVANCED_PRICE_ANALYTICS.signatureRows.map((row) => <TableRow key={row.model}><TableCell>{row.model}</TableCell><TableCell align="right">{row.multiplier}</TableCell></TableRow>)}</TableBody></Table>
        </Box>
      </Stack>
    </PanelShell>
  );
}

function InventoryOperationsPanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  const tokens = readChartThemeTokens();
  return (
    <PanelShell title="Inventory Operations" subtitle="Dealer inventory management and repricing" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 0.8 }}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, p: 1 }}>
            <Typography variant="caption" color="text.secondary">Aging inventory heatmap</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 0.5, mt: 0.65 }}>
              {INVENTORY_OPERATIONS.agingHeatmap.map((row) => (
                <Box key={row.bucket} sx={{ p: 0.6, border: "1px solid", borderColor: "divider", borderRadius: 0.9, bgcolor: alpha(tokens.chart1, 0.08) }}>
                  <Typography variant="caption">{row.bucket}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>IF {row.infield} • OF {row.outfield}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
            <Table size="small"><TableHead><TableRow><TableCell>SKU</TableCell><TableCell align="right">Cost</TableCell><TableCell align="right">Resale</TableCell><TableCell align="right">Margin</TableCell></TableRow></TableHead><TableBody>{INVENTORY_OPERATIONS.marginRows.map((row) => <TableRow key={row.sku}><TableCell>{row.sku}</TableCell><TableCell align="right">{money(row.cost)}</TableCell><TableCell align="right">{money(row.resale)}</TableCell><TableCell align="right">{row.marginPct}%</TableCell></TableRow>)}</TableBody></Table>
          </Box>
        </Box>
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, p: 1 }}>
          <Typography variant="caption" color="text.secondary">Dynamic repricing signals</Typography>
          <Stack spacing={0.6} sx={{ mt: 0.7 }}>
            {INVENTORY_OPERATIONS.repricingSignals.map((row) => (
              <Stack key={row.sku} direction="row" justifyContent="space-between">
                <Typography variant="body2">{row.sku}</Typography>
                <Typography variant="caption" color="text.secondary">{row.signal} • {row.reason}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <ThemedLineChart
          data={{ labels: INVENTORY_OPERATIONS.liquidityForecast.map((_, idx) => `F${idx + 1}`), datasets: [{ label: "Liquidity forecast", data: INVENTORY_OPERATIONS.liquidityForecast, borderColor: "#22C55E", pointRadius: 2 }] }}
          options={{ plugins: { legend: { display: false } } }}
          height={{ xs: 140, md: 160 }}
        />
      </Stack>
    </PanelShell>
  );
}

function DealerInfrastructurePanel({ selectedWindow, onWindow }: { selectedWindow: HomeWindowKey; onWindow: (windowKey: HomeWindowKey) => void }) {
  return (
    <PanelShell title="Dealer Data / Infrastructure" subtitle="Exports, APIs, benchmarking, and forecasting" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 0.8 }}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
            <Table size="small"><TableHead><TableRow><TableCell>Module</TableCell><TableCell>Status</TableCell><TableCell>Detail</TableCell></TableRow></TableHead><TableBody>{DEALER_INFRA.exportRows.map((row) => <TableRow key={row.module}><TableCell>{row.module}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.detail}</TableCell></TableRow>)}</TableBody></Table>
          </Box>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden" }}>
            <Table size="small"><TableHead><TableRow><TableCell>Benchmark</TableCell><TableCell align="right">Spread</TableCell><TableCell align="right">Turn days</TableCell><TableCell align="right">Win rate</TableCell></TableRow></TableHead><TableBody>{DEALER_INFRA.benchmarkRows.map((row) => <TableRow key={row.dealer}><TableCell>{row.dealer}</TableCell><TableCell align="right">{row.spread}</TableCell><TableCell align="right">{row.turnDays}</TableCell><TableCell align="right">{row.winRate}</TableCell></TableRow>)}</TableBody></Table>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 0.8 }}>
          <ThemedLineChart
            data={{ labels: DEALER_INFRA.regionalDemand.map((_, idx) => `Q${idx + 1}`), datasets: [{ label: "Regional demand forecast", data: DEALER_INFRA.regionalDemand, borderColor: "#60A5FA", pointRadius: 2 }] }}
            options={{ plugins: { legend: { display: false } } }}
            height={{ xs: 150, md: 170 }}
          />
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.2, p: 1 }}>
            <Typography variant="caption" color="text.secondary">Marketplace performance</Typography>
            <Stack spacing={0.6} sx={{ mt: 0.7 }}>
              {DEALER_INFRA.marketplacePerf.map((row) => (
                <Stack key={row.channel} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{row.channel}</Typography>
                  <Typography variant="caption" color="text.secondary">Conv {row.conv} • Avg {money(row.avgPrice)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Stack>
    </PanelShell>
  );
}

function LoadingPanel({ height = 260 }: { height?: number }) {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width={220} height={28} />
        <Skeleton variant="rounded" height={height} />
      </CardContent>
    </Card>
  );
}

export default function FreeTierDashboard({ tier }: { tier: Tier }) {
  const [windowKey, setWindowKey] = useState<HomeWindowKey>("1mo");
  const { data, isLoading, error, reload } = useFreeHomeDashboardData(windowKey);
  const tierRank = TIER_RANK[tier];
  const tierContainers = useMemo(
    () => [...TIER_DASHBOARD_CONTAINERS].sort((a, b) => a.order - b.order),
    [],
  );

  useEffect(() => {
    applyChartJsDefaults();
    initChartThemeSync();
  }, []);

  const renderUnlockedContainer = (containerId: string) => {
    if (containerId === "collector_variant_performance") return <VariantPerformancePanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "collector_condition_comps") return <ConditionCompsPanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "collector_portfolio_overview") return <PortfolioOverviewPanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "pro_cross_brand_intelligence") return <CrossBrandIntelligencePanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "pro_market_risk_supply") return <MarketRiskSupplyPanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "pro_advanced_price_analytics") return <AdvancedPriceAnalyticsPanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "dealer_inventory_operations") return <InventoryOperationsPanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    if (containerId === "dealer_data_infrastructure") return <DealerInfrastructurePanel selectedWindow={windowKey} onWindow={setWindowKey} />;
    return null;
  };

  return (
    <Stack spacing={{ xs: 1.2, md: 1 }}>
      {error ? (
        <Alert severity="error" action={<Button color="inherit" onClick={reload}>Retry</Button>}>
          Failed to load dashboard data: {error}
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(12,minmax(0,1fr))" }, gap: { xs: 1.15, md: 0.9 } }}>
        <Box sx={{ gridColumn: "1 / -1" }}>
          {isLoading || !data ? (
            <LoadingPanel height={360} />
          ) : (
            <GlobalGloveMarketCard
              rows={data.global.countries}
              totalValue={data.global.totalValue}
              totalCount={data.global.totalCount}
              selectedWindow={windowKey}
              windowOptions={FREE_HOME_WINDOW_OPTIONS}
              onSelectWindow={setWindowKey}
            />
          )}
        </Box>

        <Box sx={{ gridColumn: "1 / -1", minHeight: { xs: 300, md: 250 } }}>
          {isLoading || !data ? <LoadingPanel height={250} /> : <MarketSnapshotPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>

        <Box sx={{ gridColumn: "1 / -1", minHeight: { xs: 320, md: 320 } }}>
          {isLoading || !data ? <LoadingPanel height={280} /> : <PriceOverviewPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>

        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 7" }, minHeight: { xs: 320, md: 310 } }}>
          {isLoading || !data ? <LoadingPanel height={310} /> : <SalesTrendPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} tier={tier} />}
        </Box>
        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 5" }, minHeight: { xs: 340, md: 310 } }}>
          {isLoading || !data ? <LoadingPanel height={310} /> : <BrandModelInsightsPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>

        <Box sx={{ gridColumn: "1 / -1", minHeight: { xs: 320, md: 335 } }}>
          {isLoading || !data ? <LoadingPanel height={300} /> : <ListingsPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>

        {tierContainers.map((container: TierDashboardContainerConfig) => {
          const unlocked = tierRank >= TIER_RANK[container.unlockTier];
          return (
            <Box
              key={container.container_id}
              sx={{
                gridColumn: unlocked ? "1 / -1" : { xs: "1 / -1", md: "span 4" },
                minHeight: unlocked ? { xs: 330, md: 305 } : { xs: 250, md: 230 },
              }}
            >
              {isLoading || !data ? (
                <LoadingPanel height={290} />
              ) : unlocked ? (
                renderUnlockedContainer(container.container_id)
              ) : (
                <LockedTierContainer container={container} selectedWindow={windowKey} onWindow={setWindowKey} compact />
              )}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
