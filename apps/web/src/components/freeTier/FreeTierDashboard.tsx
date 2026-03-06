import React, { useEffect, useRef, useState } from "react";
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

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function TrendDelta({ value }: { value: number }) {
  const color = value > 0 ? "success.main" : value < 0 ? "error.main" : "text.secondary";
  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {value > 0 ? <TrendingUpRoundedIcon sx={{ fontSize: 14, color }} /> : null}
      {value < 0 ? <TrendingDownRoundedIcon sx={{ fontSize: 14, color }} /> : null}
      {value === 0 ? <TrendingFlatRoundedIcon sx={{ fontSize: 14, color }} /> : null}
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
  children,
}: {
  title: string;
  subtitle?: string;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, p: 1.2 }}>
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
          <WindowFilterMenu selected={selectedWindow} options={FREE_HOME_WINDOW_OPTIONS} onChange={onWindow} />
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
    <PanelShell title="Market Snapshot" subtitle="Last 30 days" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 0.8, flex: 1 }}>
        {rows.map((row) => (
          <Box key={row.label} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
            <Typography variant="caption" color="text.secondary">
              {row.label}
            </Typography>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 0.4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {row.value}
              </Typography>
              <TrendDelta value={row.delta} />
            </Stack>
            <Sparkline points={row.spark} positive={row.delta >= 0} />
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

  return (
    <PanelShell title="Price Overview" subtitle="Pricing" selectedWindow={selectedWindow} onWindow={onWindow}>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8}>
          <Box sx={{ flex: 1, p: 1, borderRadius: 1.2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              Current median price
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {money(data.priceOverview.currentMedian)}
              </Typography>
              <TrendDelta value={data.priceOverview.deltaPct} />
            </Stack>
          </Box>
          <Box sx={{ flex: 1, p: 1, borderRadius: 1.2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              Median sale price
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {money(data.priceOverview.medianWindow)}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ p: 1, borderRadius: 1.2, border: "1px solid", borderColor: "divider", flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            p10 / p90 range
          </Typography>
          <ThemedBarChart
            data={{
              labels: ["Price range"],
              datasets: [
                {
                  label: "p10",
                  data: [data.priceOverview.p10],
                  backgroundColor: hexToRgba(tokens.chart3, tokens.isDark ? 0.7 : 0.8),
                  borderRadius: 10,
                  barPercentage: 0.55,
                },
                {
                  label: "Spread",
                  data: [range],
                  backgroundColor: hexToRgba(tokens.chart1, tokens.isDark ? 0.38 : 0.45),
                  borderRadius: 10,
                  barPercentage: 0.55,
                },
              ],
            }}
            options={{
              indexAxis: "y",
              plugins: {
                legend: { position: "bottom" },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${money(Number(ctx.parsed.x || 0))}`,
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: { callback: (value) => `$${value}` },
                },
                y: { stacked: true, grid: { display: false } },
              },
            }}
            height={{ xs: 170, sm: 190, md: 220 }}
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              p10: {money(data.priceOverview.p10)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              p90: {money(data.priceOverview.p90)}
            </Typography>
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
}: {
  data: FreeHomeDashboardData;
  selectedWindow: HomeWindowKey;
  onWindow: (windowKey: HomeWindowKey) => void;
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
        <Stack direction="row" spacing={1.2}>
          <Chip size="small" label={`${money(data.salesTrend.windowMedian)} median`} />
          <Chip size="small" label={`${data.salesTrend.windowSales.toLocaleString()} sales`} />
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
  return (
    <PanelShell
      title="Listings (Public / Unnormalized Condition)"
      subtitle="Evidence table"
      selectedWindow={selectedWindow}
      onWindow={onWindow}
    >
      <Box sx={{ flex: 1, minHeight: { xs: 280, md: 320 }, overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.listings.map((row) => (
              <TableRow key={`${row.title}_${row.date}`}>
                <TableCell sx={{ maxWidth: 360 }}>
                  <Typography variant="body2" noWrap>{row.title}</Typography>
                </TableCell>
                <TableCell align="right">{money(row.price)}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.country}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell align="right">
                  <Button
                    color="inherit"
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="inherit" />}
                    onClick={() => window.open(row.url, "_blank", "noopener,noreferrer")}
                  >
                    Open
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

  useEffect(() => {
    applyChartJsDefaults();
    initChartThemeSync();
  }, []);

  if (tier !== Tier.FREE) {
    return null;
  }

  return (
    <Stack spacing={1.3}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
        Home Dashboard
      </Typography>

      {error ? (
        <Alert severity="error" action={<Button color="inherit" onClick={reload}>Retry</Button>}>
          Failed to load dashboard data: {error}
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(12,minmax(0,1fr))" }, gap: 1.2 }}>
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

        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 5" }, minHeight: { xs: 300, md: 320 } }}>
          {isLoading || !data ? <LoadingPanel height={290} /> : <MarketSnapshotPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>
        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 7" }, minHeight: { xs: 320, md: 340 } }}>
          {isLoading || !data ? <LoadingPanel height={300} /> : <PriceOverviewPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>

        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 7" }, minHeight: { xs: 320, md: 350 } }}>
          {isLoading || !data ? <LoadingPanel height={310} /> : <SalesTrendPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>
        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 5" }, minHeight: { xs: 340, md: 350 } }}>
          {isLoading || !data ? <LoadingPanel height={310} /> : <BrandModelInsightsPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>

        <Box sx={{ gridColumn: "1 / -1", minHeight: { xs: 320, md: 380 } }}>
          {isLoading || !data ? <LoadingPanel height={340} /> : <ListingsPanel data={data} selectedWindow={windowKey} onWindow={setWindowKey} />}
        </Box>
      </Box>
    </Stack>
  );
}
