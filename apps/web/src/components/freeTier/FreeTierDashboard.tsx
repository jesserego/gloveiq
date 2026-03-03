import React from "react";
import { Box, Chip, Divider, Stack, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Card, CardContent, Button } from "../../ui/Primitives";
import type { KpiMetric, ListingRow, RankedRow, TimePoint } from "../../mock/freeTierMetrics";

const palette = {
  accent: "#3B82F6",
  accent2: "#14B8A6",
  accent3: "#F59E0B",
  muted: "#94A3B8",
  grid: alpha("#64748B", 0.24),
};

function HeaderMeta({ title, timeframe, helpText }: { title: string; timeframe: string; helpText: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>{title}</Typography>
        <Tooltip title={helpText} arrow>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        </Tooltip>
      </Stack>
      <Chip size="small" label={timeframe} />
    </Stack>
  );
}

function Sparkline({ data, color = palette.accent }: { data: TimePoint[]; color?: string }) {
  if (!data.length) return null;
  const w = 170;
  const h = 52;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = max === min ? h / 2 : h - ((d.value - min) / (max - min)) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: "100%", height: 56 }}>
      <polyline fill="none" stroke={alpha(color, 0.95)} strokeWidth="2.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

export function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <Card><CardContent>
      <HeaderMeta title={metric.title} timeframe={metric.timeframe} helpText={metric.helpText} />
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="h5" sx={{ fontWeight: 900 }}>{metric.value}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 800, color: metric.deltaPct >= 0 ? "success.main" : "error.main" }}>
          {metric.deltaPct >= 0 ? "+" : ""}{metric.deltaPct}%
        </Typography>
      </Stack>
      <Sparkline data={metric.spark} color={metric.deltaPct >= 0 ? palette.accent : "#EF4444"} />
    </CardContent></Card>
  );
}

export function RangeBarCard({ title, p10, median, p90, timeframe, helpText }: { title: string; p10: number; median: number; p90: number; timeframe: string; helpText: string }) {
  const min = p10;
  const max = p90;
  const span = Math.max(1, max - min);
  const medianPct = ((median - min) / span) * 100;

  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Typography variant="h5" sx={{ fontWeight: 900 }}>${median} median</Typography>
      <Box sx={{ mt: 1.2, position: "relative", height: 26 }}>
        <Box sx={{ position: "absolute", left: 0, right: 0, top: 9, height: 8, borderRadius: 999, bgcolor: alpha(palette.muted, 0.18) }} />
        <Box sx={{ position: "absolute", left: 0, right: 0, top: 9, height: 8, borderRadius: 999, bgcolor: alpha(palette.accent, 0.24) }} />
        <Box sx={{ position: "absolute", left: `${medianPct}%`, top: 4, width: 2, height: 18, bgcolor: palette.accent }} />
      </Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">p10 ${p10}</Typography>
        <Typography variant="caption" color="text.secondary">median ${median}</Typography>
        <Typography variant="caption" color="text.secondary">p90 ${p90}</Typography>
      </Stack>
    </CardContent></Card>
  );
}

export function SellThroughGaugeCard({ title, ratePct, deltaPct, timeframe, helpText }: { title: string; ratePct: number; deltaPct: number; timeframe: string; helpText: string }) {
  const radius = 42;
  const c = 2 * Math.PI * radius;
  const dash = c * (Math.max(0, Math.min(100, ratePct)) / 100);
  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Box component="svg" viewBox="0 0 120 120" sx={{ width: 106, height: 106 }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke={alpha(palette.muted, 0.2)} strokeWidth="12" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={palette.accent2} strokeWidth="12" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>{ratePct}%</Typography>
          <Typography variant="body2" sx={{ color: deltaPct >= 0 ? "success.main" : "error.main", fontWeight: 800 }}>{deltaPct >= 0 ? "+" : ""}{deltaPct}% vs prior</Typography>
          <Typography variant="caption" color="text.secondary">sold / listed</Typography>
        </Box>
      </Stack>
    </CardContent></Card>
  );
}

export function HorizontalBarCard({ title, timeframe, helpText, data, valuePrefix = "", valueSuffix = "" }: { title: string; timeframe: string; helpText: string; data: RankedRow[]; valuePrefix?: string; valueSuffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Stack spacing={0.7}>
        {data.map((row) => (
          <Box key={row.label}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">{row.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{valuePrefix}{row.value}{valueSuffix}</Typography>
            </Stack>
            <Box sx={{ mt: 0.35, height: 8, borderRadius: 999, bgcolor: alpha(palette.muted, 0.18), overflow: "hidden" }}>
              <Box sx={{ width: `${Math.max(6, (row.value / max) * 100)}%`, height: "100%", bgcolor: palette.accent }} />
            </Box>
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 0.9 }}>
        <Stack direction="row" spacing={0.4} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: palette.accent }} /><Typography variant="caption" color="text.secondary">Units</Typography></Stack>
      </Stack>
    </CardContent></Card>
  );
}

export function RankedListCard({ title, timeframe, helpText, rows, smallerIsBetter = false }: { title: string; timeframe: string; helpText: string; rows: RankedRow[]; smallerIsBetter?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Stack spacing={0.75}>
        {rows.map((row, idx) => {
          const pct = smallerIsBetter ? (1 - row.value / max) * 100 : (row.value / max) * 100;
          return (
            <Box key={row.label} sx={{ p: 0.7, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{idx + 1}. {row.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.value}{row.unit ? ` ${row.unit}` : ""}</Typography>
              </Stack>
              {typeof row.deltaPct === "number" ? (
                <Typography variant="caption" sx={{ color: row.deltaPct >= 0 ? "success.main" : "error.main" }}>
                  {row.deltaPct >= 0 ? "+" : ""}{row.deltaPct}%
                </Typography>
              ) : null}
              {row.spark?.length ? <Sparkline data={row.spark} color={palette.accent3} /> : (
                <Box sx={{ mt: 0.45, height: 6, borderRadius: 999, bgcolor: alpha(palette.muted, 0.18), overflow: "hidden" }}>
                  <Box sx={{ width: `${Math.max(7, pct)}%`, height: "100%", bgcolor: palette.accent3 }} />
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </CardContent></Card>
  );
}

export function RegionBarCard({ title, timeframe, helpText, data }: { title: string; timeframe: string; helpText: string; data: RankedRow[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 0.75, alignItems: "end", minHeight: 120 }}>
        {data.map((row) => (
          <Stack key={row.label} alignItems="center" spacing={0.35}>
            <Typography variant="caption" color="text.secondary">${row.value}</Typography>
            <Box sx={{ width: "68%", minWidth: 28, height: `${Math.max(16, (row.value / max) * 90)}px`, borderRadius: 0.8, bgcolor: palette.accent2 }} />
            <Typography variant="caption">{row.label}</Typography>
          </Stack>
        ))}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 0.7 }}>
        <Stack direction="row" spacing={0.4} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: palette.accent2 }} /><Typography variant="caption" color="text.secondary">Median price</Typography></Stack>
      </Stack>
    </CardContent></Card>
  );
}

export function LineChartCard({ title, timeframe, helpText, data }: { title: string; timeframe: string; helpText: string; data: TimePoint[] }) {
  const w = 520;
  const h = 180;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = max === min ? h / 2 : h - ((d.value - min) / (max - min)) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: "100%", height: 220 }}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <line key={pct} x1={0} x2={w} y1={(pct / 100) * h} y2={(pct / 100) * h} stroke={palette.grid} strokeWidth={1} />
        ))}
        <polyline fill="none" stroke={palette.accent} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = (i / Math.max(1, data.length - 1)) * w;
          const y = max === min ? h / 2 : h - ((d.value - min) / (max - min)) * h;
          return (
            <Tooltip key={d.label} title={`${d.label} • $${d.value}`} arrow>
              <circle cx={x} cy={y} r={4} fill={palette.accent} />
            </Tooltip>
          );
        })}
      </Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: -1.2 }}>
        <Typography variant="caption" color="text.secondary">{data[0]?.label}</Typography>
        <Typography variant="caption" color="text.secondary">{data[data.length - 1]?.label}</Typography>
      </Stack>
    </CardContent></Card>
  );
}

export function ListingsTableCard({ title, timeframe, helpText, rows }: { title: string; timeframe: string; helpText: string; rows: ListingRow[] }) {
  return (
    <Card><CardContent>
      <HeaderMeta title={title} timeframe={timeframe} helpText={helpText} />
      <Stack direction="row" spacing={0.6} sx={{ mb: 0.7 }}>
        <Chip size="small" label="Not normalized" color="warning" />
      </Stack>
      <Stack spacing={0.6}>
        {rows.map((row) => (
          <Box key={row.id} sx={{ p: 0.8, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{row.title}</Typography>
                <Typography variant="caption" color="text.secondary">{row.source} • {row.date}</Typography>
              </Box>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 900 }}>${row.price}</Typography>
                <Button color="inherit" sx={{ minWidth: 0, px: 0.7 }} endIcon={<OpenInNewIcon fontSize="inherit" />} onClick={() => window.open(row.url, "_blank", "noopener,noreferrer")}>Open</Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </CardContent></Card>
  );
}

export default function FreeTierDashboard({ data }: { data: import("../../mock/freeTierMetrics").FreeTierMetricsData }) {
  return (
    <Stack spacing={1.2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Free Tier Dashboard</Typography>
        <Chip size="small" label="Last 30 days" />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(3,minmax(0,1fr))" }, gap: 1.2 }}>
        <KpiCard metric={data.totalSold} />
        <KpiCard metric={data.medianSalePrice} />
        <KpiCard metric={data.activeListings} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.2 }}>
        <RangeBarCard title={data.pRange.title} p10={data.pRange.p10} median={data.pRange.median} p90={data.pRange.p90} timeframe={data.pRange.timeframe} helpText={data.pRange.helpText} />
        <SellThroughGaugeCard title={data.sellThrough.title} ratePct={data.sellThrough.ratePct} deltaPct={data.sellThrough.deltaPct} timeframe={data.sellThrough.timeframe} helpText={data.sellThrough.helpText} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.2 }}>
        <HorizontalBarCard title={data.topBrands.title} timeframe={data.topBrands.timeframe} helpText={data.topBrands.helpText} data={data.topBrands.data} />
        <RegionBarCard title={data.regionalMedian.title} timeframe={data.regionalMedian.timeframe} helpText={data.regionalMedian.helpText} data={data.regionalMedian.data} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.2 }}>
        <RankedListCard title={data.trendingModels.title} timeframe={data.trendingModels.timeframe} helpText={data.trendingModels.helpText} rows={data.trendingModels.rows} />
        <RankedListCard title={data.fastestModels.title} timeframe={data.fastestModels.timeframe} helpText={data.fastestModels.helpText} rows={data.fastestModels.rows} smallerIsBetter />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.2 }}>
        <Card><CardContent>
          <HeaderMeta title={data.currentMedianPrice.title} timeframe={data.currentMedianPrice.timeframe} helpText={data.currentMedianPrice.helpText} />
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{data.currentMedianPrice.value}</Typography>
        </CardContent></Card>
        <KpiCard metric={data.salesEvents30d} />
      </Box>

      <LineChartCard title={data.basicPriceChart.title} timeframe={data.basicPriceChart.timeframe} helpText={data.basicPriceChart.helpText} data={data.basicPriceChart.data} />
      <ListingsTableCard title={data.publicListings.title} timeframe={data.publicListings.timeframe} helpText={data.publicListings.helpText} rows={data.publicListings.rows} />
    </Stack>
  );
}
