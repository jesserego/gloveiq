import React from "react";
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
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Button, Card, CardContent } from "../../ui/Primitives";
import {
  getHomeContainersForTier,
  type HomeDashboardContainerDef,
  type HomeDashboardData,
} from "../../lib/homeDashboard";
import { useMockHomeDashboardData } from "../../mock/homeDashboardData";

const palette = {
  line: "#4F8BFF",
  lineAlt: "#FF4DE1",
  lineMid: "#F8E71C",
  bar: "#6EE7B7",
  muted: "#94A3B8",
  grid: alpha("#64748B", 0.2),
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function ContainerHeader({ title, timeframeLabel, helpText }: Pick<HomeDashboardContainerDef, "title" | "timeframeLabel" | "helpText">) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2, gap: 1 }}>
      <Stack direction="row" spacing={0.7} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }} noWrap>{title}</Typography>
        <Tooltip title={helpText} arrow>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        </Tooltip>
      </Stack>
      <Chip size="small" label={timeframeLabel} />
    </Stack>
  );
}

function Sparkline({ points, color = palette.line }: { points: number[]; color?: string }) {
  if (!points.length) return null;
  const w = 180;
  const h = 52;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const path = points
    .map((value, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * w;
      const y = max === min ? h / 2 : h - ((value - min) / (max - min)) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: "100%", height: 54 }}>
      <polyline fill="none" stroke={color} strokeWidth="2.4" points={path} strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

function renderMarketSnapshot(data: HomeDashboardData) {
  const cards = [
    { label: "Total gloves sold", value: data.kpis.totalSold30d.value.toLocaleString(), delta: data.kpis.totalSold30d.deltaPct, spark: data.kpis.totalSold30d.spark },
    { label: "Active listings", value: data.kpis.activeListings.value.toLocaleString(), delta: data.kpis.activeListings.deltaPct, spark: data.kpis.activeListings.spark },
    { label: "Sell-through", value: `${data.kpis.sellThroughRate.valuePct.toFixed(1)}%`, delta: data.kpis.sellThroughRate.deltaPct, spark: data.kpis.sellThroughRate.spark },
    { label: "30-day sales count", value: data.kpis.salesCount30d.value.toLocaleString(), delta: data.kpis.salesCount30d.deltaPct, spark: data.kpis.salesCount30d.spark },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))", xl: "repeat(4,minmax(0,1fr))" }, gap: 1 }}>
      {cards.map((card) => (
        <Box key={card.label} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.3 }}>
          <Typography variant="caption" color="text.secondary">{card.label}</Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 0.4 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>{card.value}</Typography>
            <Typography variant="caption" sx={{ color: card.delta >= 0 ? "success.main" : "error.main", fontWeight: 800 }}>
              {card.delta >= 0 ? "+" : ""}{card.delta}%
            </Typography>
          </Stack>
          <Sparkline points={card.spark} color={card.delta >= 0 ? palette.line : "#ef4444"} />
        </Box>
      ))}
    </Box>
  );
}

function renderPriceOverview(data: HomeDashboardData) {
  const { median30d, currentMedian, p10, p90 } = data.price;
  const span = Math.max(1, p90 - p10);
  const medianPct = ((median30d - p10) / span) * 100;
  const currentPct = ((currentMedian - p10) / span) * 100;

  return (
    <Stack spacing={1.4}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Median sale price (30d)</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{money(median30d)}</Typography>
        </Box>
        <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">Current median price</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{money(currentMedian)}</Typography>
        </Box>
      </Stack>

      <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
        <Typography variant="caption" color="text.secondary">p10 / p90 range</Typography>
        <Box sx={{ mt: 1, position: "relative", height: 26 }}>
          <Box sx={{ position: "absolute", inset: "9px 0 auto 0", height: 8, borderRadius: 999, bgcolor: alpha(palette.muted, 0.24) }} />
          <Box sx={{ position: "absolute", left: `${medianPct}%`, top: 4, width: 2, height: 18, bgcolor: palette.line }} />
          <Box sx={{ position: "absolute", left: `${currentPct}%`, top: 4, width: 2, height: 18, bgcolor: palette.lineAlt }} />
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.4 }}>
          <Typography variant="caption" color="text.secondary">p10 {money(p10)}</Typography>
          <Typography variant="caption" color="text.secondary">median {money(median30d)}</Typography>
          <Typography variant="caption" color="text.secondary">current {money(currentMedian)}</Typography>
          <Typography variant="caption" color="text.secondary">p90 {money(p90)}</Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

function renderPriceTrend(data: HomeDashboardData) {
  const w = 920;
  const h = 240;
  const values = [
    ...data.price.series30d.map((point) => point.value),
    ...data.price.p10Series30d.map((point) => point.value),
    ...data.price.p90Series30d.map((point) => point.value),
    ...data.price.medianSeries30d.map((point) => point.value),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);

  const toCoords = (series: Array<{ label: string; value: number }>) =>
    series
      .map((point, idx) => {
        const x = (idx / Math.max(1, series.length - 1)) * w;
        const y = max === min ? h / 2 : h - ((point.value - min) / (max - min)) * h;
        return { x, y, label: point.label, value: point.value };
      });

  const priceCoords = toCoords(data.price.series30d);
  const medianCoords = toCoords(data.price.medianSeries30d);
  const p10Coords = toCoords(data.price.p10Series30d);
  const p90Coords = toCoords(data.price.p90Series30d);

  const line = (coords: Array<{ x: number; y: number }>) => coords.map((point) => `${point.x},${point.y}`).join(" ");
  const band = `${line(p10Coords)} ${[...p90Coords].reverse().map((point) => `${point.x},${point.y}`).join(" ")}`;

  return (
    <Box>
      <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: "100%", height: { xs: 220, md: 280 } }}>
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = (pct / 100) * h;
          return <line key={pct} x1={0} x2={w} y1={y} y2={y} stroke={palette.grid} strokeWidth={1} />;
        })}

        <polygon points={band} fill={alpha(palette.lineAlt, 0.14)} />
        <polyline fill="none" stroke={palette.lineMid} strokeWidth="2" points={line(medianCoords)} strokeLinecap="round" />
        <polyline fill="none" stroke={palette.line} strokeWidth="3" points={line(priceCoords)} strokeLinecap="round" />

        {priceCoords.map((point, idx) => (
          <Tooltip key={`${point.label}_${idx}`} title={`${point.label}: ${money(point.value)}`} arrow>
            <circle cx={point.x} cy={point.y} r={3.2} fill={palette.line} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" spacing={1.2} sx={{ mt: 0.6, flexWrap: "wrap" }}>
        <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: palette.line }} /><Typography variant="caption" color="text.secondary">Daily median</Typography></Stack>
        <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: palette.lineMid }} /><Typography variant="caption" color="text.secondary">30d median line</Typography></Stack>
        <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: alpha(palette.lineAlt, 0.3) }} /><Typography variant="caption" color="text.secondary">p10-p90 band</Typography></Stack>
      </Stack>
    </Box>
  );
}

function renderBrandMarketShare(data: HomeDashboardData) {
  const max = Math.max(1, ...data.brands.map((row) => row.volume));
  return (
    <Stack spacing={0.8}>
      {data.brands.map((row) => (
        <Box key={row.brand}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">{row.brand}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.volume}</Typography>
          </Stack>
          <Box sx={{ mt: 0.35, height: 8, borderRadius: 999, bgcolor: alpha(palette.muted, 0.2), overflow: "hidden" }}>
            <Box sx={{ width: `${Math.max(8, Math.round((row.volume / max) * 100))}%`, height: "100%", bgcolor: palette.bar }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function renderModelMomentum(data: HomeDashboardData) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Model</TableCell>
          <TableCell align="right">Trend %</TableCell>
          <TableCell align="right">Avg Days to Sell</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.models.map((row) => (
          <TableRow key={row.model}>
            <TableCell>{row.model}</TableCell>
            <TableCell align="right" sx={{ color: row.trendPct30d >= 0 ? "success.main" : "error.main", fontWeight: 700 }}>
              {row.trendPct30d >= 0 ? "+" : ""}{row.trendPct30d.toFixed(1)}%
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>{row.avgDaysToSell.toFixed(1)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function renderRegionalMarket(data: HomeDashboardData) {
  const max = Math.max(1, ...data.regions.map((row) => row.medianPrice));
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 1, alignItems: "end", minHeight: 140 }}>
      {data.regions.map((row) => (
        <Stack key={row.region} alignItems="center" spacing={0.55}>
          <Typography variant="caption" color="text.secondary">{money(row.medianPrice)}</Typography>
          <Box sx={{ width: "70%", minWidth: 28, height: `${Math.max(18, Math.round((row.medianPrice / max) * 100))}px`, bgcolor: palette.line, borderRadius: 0.8 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.region}</Typography>
        </Stack>
      ))}
    </Box>
  );
}

function renderPublicListings(data: HomeDashboardData) {
  return (
    <>
      <Stack direction="row" spacing={0.6} sx={{ mb: 0.8 }}>
        <Chip size="small" color="warning" label="Not normalized" />
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Condition</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="right">Link</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.listings.map((row) => (
            <TableRow key={`${row.title}_${row.date}`}>
              <TableCell sx={{ maxWidth: 280 }}>
                <Typography variant="body2" noWrap>{row.title}</Typography>
              </TableCell>
              <TableCell align="right">{money(row.price)}</TableCell>
              <TableCell>{row.source}</TableCell>
              <TableCell>{row.condition}</TableCell>
              <TableCell>{row.date}</TableCell>
              <TableCell align="right">
                <Button color="inherit" size="small" endIcon={<OpenInNewIcon fontSize="inherit" />} onClick={() => window.open(row.url, "_blank", "noopener,noreferrer")}>
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function ContainerLoading({ title, timeframeLabel, helpText }: Pick<HomeDashboardContainerDef, "title" | "timeframeLabel" | "helpText">) {
  return (
    <Card><CardContent>
      <ContainerHeader title={title} timeframeLabel={timeframeLabel} helpText={helpText} />
      <Skeleton variant="rounded" height={140} />
    </CardContent></Card>
  );
}

function renderContainerBody(container: HomeDashboardContainerDef, data: HomeDashboardData) {
  if (container.id === "market_snapshot") return renderMarketSnapshot(data);
  if (container.id === "price_overview") return renderPriceOverview(data);
  if (container.id === "price_trend") return renderPriceTrend(data);
  if (container.id === "brand_market_share") return renderBrandMarketShare(data);
  if (container.id === "model_momentum") return renderModelMomentum(data);
  if (container.id === "regional_market") return renderRegionalMarket(data);
  return renderPublicListings(data);
}

function spanFor(containerId: HomeDashboardContainerDef["id"]) {
  if (containerId === "market_snapshot" || containerId === "price_trend" || containerId === "public_listings") {
    return { xs: "1 / -1", lg: "1 / -1" };
  }
  return { xs: "1 / -1", lg: "span 6" };
}

export default function FreeTierDashboard({ tier }: { tier: Tier }) {
  const { data, isLoading, error, reload } = useMockHomeDashboardData();
  const containers = getHomeContainersForTier(tier);

  if (!containers.length) {
    return (
      <Card><CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Home Dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
          No containers available for this tier yet.
        </Typography>
      </CardContent></Card>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Home Dashboard</Typography>

      {error ? (
        <Alert severity="error" action={<Button color="inherit" onClick={reload}>Retry</Button>}>
          Failed to load dashboard data: {error}
        </Alert>
      ) : null}

      {!error && !isLoading && !data ? (
        <Card><CardContent>
          <Typography variant="body2" color="text.secondary">No dashboard data available.</Typography>
        </CardContent></Card>
      ) : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12,minmax(0,1fr))" }, gap: 1.25 }}>
        {containers.map((container) => (
          <Box key={container.id} sx={{ gridColumn: spanFor(container.id) }}>
            {isLoading || !data ? (
              <ContainerLoading title={container.title} timeframeLabel={container.timeframeLabel} helpText={container.helpText} />
            ) : (
              <Card><CardContent>
                <ContainerHeader title={container.title} timeframeLabel={container.timeframeLabel} helpText={container.helpText} />
                {renderContainerBody(container, data)}
                <Divider sx={{ mt: 1.1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: "block" }}>
                  Source key: {container.dataQueryKey}
                </Typography>
              </CardContent></Card>
            )}
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
