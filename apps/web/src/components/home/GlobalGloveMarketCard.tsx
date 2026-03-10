import React, { useMemo } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import { alpha } from "@mui/material/styles";
import { Card, CardContent } from "../../ui/Primitives";
import { hexToRgba, readChartThemeTokens } from "../../lib/chartjsTheme";
import { compactCurrency, type HomeWindowKey } from "../../lib/homeMarketUtils";
import { ThemedLineChart } from "../charts/ThemedCharts";
import WindowFilterMenu from "./WindowFilterMenu";

export type GlobalCountryRow = {
  country: string;
  count: number;
  value: number;
  change_pct: number;
  is_dummy?: boolean;
};

const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  Canada: "🇨🇦",
  "United Kingdom": "🇬🇧",
  Germany: "🇩🇪",
  France: "🇫🇷",
  Spain: "🇪🇸",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Australia: "🇦🇺",
  Brazil: "🇧🇷",
  Argentina: "🇦🇷",
  Colombia: "🇨🇴",
};

const FALLBACK_ROWS: GlobalCountryRow[] = [
  { country: "US", value: 915200, count: 3354, change_pct: 4.8, is_dummy: true },
  { country: "Japan", value: 465000, count: 1493, change_pct: 3.9, is_dummy: true },
  { country: "United Kingdom", value: 233400, count: 794, change_pct: 2.6, is_dummy: true },
  { country: "Germany", value: 221700, count: 742, change_pct: 1.8, is_dummy: true },
  { country: "Canada", value: 206100, count: 689, change_pct: 2.1, is_dummy: true },
  { country: "Australia", value: 184500, count: 618, change_pct: 1.4, is_dummy: true },
];

type TrendDirection = "up" | "down" | "flat";

function getTrendDirection(value: number, epsilon = 0.15): TrendDirection {
  if (value > epsilon) return "up";
  if (value < -epsilon) return "down";
  return "flat";
}

export default function GlobalGloveMarketCard({
  rows,
  totalValue,
  totalCount,
  selectedWindow,
  windowOptions,
  onSelectWindow,
}: {
  rows: GlobalCountryRow[];
  totalValue: number;
  totalCount: number;
  selectedWindow: HomeWindowKey;
  windowOptions: Array<{ key: HomeWindowKey; label: string }>;
  onSelectWindow: (key: HomeWindowKey) => void;
}) {
  const tokens = readChartThemeTokens();
  const usingDummy = rows.length === 0;
  const displayRows = useMemo(
    () => (usingDummy ? FALLBACK_ROWS : [...rows].sort((a, b) => b.value - a.value).slice(0, 8)),
    [rows, usingDummy],
  );
  const computedTotalValue = usingDummy
    ? displayRows.reduce((sum, row) => sum + row.value, 0)
    : totalValue;
  const computedTotalCount = usingDummy
    ? displayRows.reduce((sum, row) => sum + row.count, 0)
    : totalCount;
  const avgChange = displayRows.reduce((sum, row) => sum + row.change_pct, 0) / Math.max(displayRows.length, 1);
  const avgSalePrice = computedTotalValue / Math.max(computedTotalCount, 1);
  const trendLabels = useMemo(
    () => Array.from({ length: 12 }).map((_, idx) => `W${idx + 1}`),
    [],
  );
  const seriesPalette = [
    tokens.chart1,
    tokens.chart2,
    tokens.chart3,
    tokens.chart4,
    tokens.accent,
    tokens.positive,
    hexToRgba(tokens.chart1, 0.7),
    hexToRgba(tokens.chart2, 0.7),
  ];
  const countryTrendDatasets = useMemo(() => (
    displayRows.map((row, countryIdx) => {
      const color = seriesPalette[countryIdx % seriesPalette.length];
      const avgTicket = row.value / Math.max(row.count, 1);
      const growthBias = row.change_pct / 100;
      const variance = Math.max(2, Math.min(12, avgTicket * 0.04));
      const points = trendLabels.map((_, pointIdx) => {
        const progress = pointIdx / Math.max(trendLabels.length - 1, 1);
        const seasonality = Math.sin((pointIdx + countryIdx) * 0.78) * variance;
        const drift = ((progress - 0.5) * 2) * variance * growthBias * 6;
        return Number((avgTicket + seasonality + drift).toFixed(1));
      });

      return {
        label: row.country,
        data: points,
        borderColor: color,
        backgroundColor: hexToRgba(color, tokens.isDark ? 0.1 : 0.14),
        pointBackgroundColor: color,
        pointRadius: 1.8,
        pointHoverRadius: 3.4,
        borderWidth: 1.9,
        fill: false,
        tension: 0.3,
      };
    })
  ), [displayRows, trendLabels, tokens.isDark, seriesPalette]);

  const renderTrend = (changePct: number) => {
    const direction = getTrendDirection(changePct);
    const color = direction === "up" ? "success.main" : direction === "down" ? "error.main" : "text.secondary";
    return (
      <Stack direction="row" spacing={0.25} alignItems="center">
        {direction === "up" ? <TrendingUpRoundedIcon sx={{ fontSize: 14, color }} /> : null}
        {direction === "down" ? <TrendingDownRoundedIcon sx={{ fontSize: 14, color }} /> : null}
        {direction === "flat" ? <TrendingFlatRoundedIcon sx={{ fontSize: 14, color }} /> : null}
        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>
          {changePct > 0 ? "+" : ""}
          {changePct}%
        </Typography>
      </Stack>
    );
  };

  return (
    <Card><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Global Glove Market (All Sales)</Typography>
          <Typography variant="caption" color="text.secondary">
            Regional sales value and velocity
          </Typography>
        </Box>
        <WindowFilterMenu selected={selectedWindow} options={windowOptions} onChange={onSelectWindow} />
      </Stack>

      <Divider sx={{ mb: 1.1 }} />

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.1} alignItems={{ md: "flex-end" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>{compactCurrency(computedTotalValue)}</Typography>
          <Typography variant="body2" color="text.secondary">{computedTotalCount.toLocaleString()} tracked sales in selected window</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 0.7, width: { xs: "100%", md: 410 } }}>
          <Box sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
            <Typography variant="caption" color="text.secondary">Market momentum</Typography>
            {renderTrend(Number(avgChange.toFixed(1)))}
          </Box>
          <Box sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
            <Typography variant="caption" color="text.secondary">Avg sale price</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{compactCurrency(avgSalePrice)}</Typography>
          </Box>
          <Box sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
            <Typography variant="caption" color="text.secondary">Active regions</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{displayRows.length}</Typography>
          </Box>
        </Box>
      </Stack>

      <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: 0.7 }}>
        {displayRows.map((row) => (
          <Box key={row.country} sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
            <Typography variant="caption" color="text.secondary">
              {countryFlags[row.country] ? `${countryFlags[row.country]} ` : ""}
              {row.country}
              {row.is_dummy ? " • demo" : ""}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{compactCurrency(row.value)}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">{row.count} sales</Typography>
              {renderTrend(row.change_pct)}
            </Stack>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1.2, p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.2, bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.48 : 0.66) }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.4, display: "block" }}>
          Country trend lines for displayed regions
        </Typography>
        <ThemedLineChart
          data={{
            labels: trendLabels,
            datasets: countryTrendDatasets,
          }}
          options={{
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: { usePointStyle: true, pointStyle: "line", boxWidth: 12 },
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
              y: { grid: { color: hexToRgba(tokens.border, tokens.isDark ? 0.28 : 0.4) }, ticks: { maxTicksLimit: 5 } },
            },
          }}
          height={{ xs: 170, sm: 190, md: 210 }}
        />
      </Box>
    </CardContent></Card>
  );
}
