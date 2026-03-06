import React, { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import { alpha } from "@mui/material/styles";
import { Card, CardContent } from "../../ui/Primitives";
import { hexToRgba, readChartThemeTokens } from "../../lib/chartjsTheme";
import { compactCurrency, quantizeScale, type HomeWindowKey } from "../../lib/homeMarketUtils";
import WindowFilterMenu from "./WindowFilterMenu";

export type GlobalCountryRow = {
  country: string;
  count: number;
  value: number;
  change_pct: number;
  is_dummy?: boolean;
};

const COUNTRY_SHAPES: Array<{ country: string; path: string }> = [
  { country: "US", path: "M110,155 L210,155 L215,195 L120,205 Z" },
  { country: "Canada", path: "M100,110 L235,105 L245,145 L110,148 Z" },
  { country: "United Kingdom", path: "M430,138 L450,134 L456,153 L437,160 Z" },
  { country: "Germany", path: "M475,146 L505,146 L506,176 L475,176 Z" },
  { country: "France", path: "M448,176 L477,176 L478,208 L448,208 Z" },
  { country: "Spain", path: "M408,194 L448,194 L446,216 L406,216 Z" },
  { country: "Italy", path: "M502,183 L522,186 L528,220 L509,224 Z" },
  { country: "Japan", path: "M787,152 L803,146 L808,200 L792,206 Z" },
  { country: "Australia", path: "M785,286 L865,284 L880,335 L795,342 Z" },
  { country: "Brazil", path: "M300,268 L360,258 L388,344 L338,373 Z" },
  { country: "Argentina", path: "M344,376 L369,374 L374,436 L351,438 Z" },
  { country: "Colombia", path: "M284,229 L312,225 L320,256 L297,268 Z" },
];

const countryAliases: Record<string, string> = {
  "United Kingdom": "UK",
};

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
  const [hovered, setHovered] = useState<{ row: GlobalCountryRow; x: number; y: number } | null>(null);

  const byCountry = useMemo(() => {
    const map = new Map<string, GlobalCountryRow>();
    for (const row of rows) map.set(row.country, row);
    return map;
  }, [rows]);

  const values = rows.map((row) => row.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);

  const colorForCountry = (country: string) => {
    const row = byCountry.get(country);
    if (!row) return hexToRgba(tokens.border, tokens.isDark ? 0.18 : 0.22);
    const bucket = quantizeScale(row.value, min, max, 6);
    const alphaStep = [0.2, 0.32, 0.44, 0.58, 0.7, 0.84][bucket] ?? 0.2;
    // Intensity is based on total sales value for selected window.
    return hexToRgba(tokens.chart1, alphaStep);
  };

  return (
    <Card><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Global Glove Market (All Sales)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>{compactCurrency(totalValue)}</Typography>
          <Typography variant="body2" color="text.secondary">{totalCount.toLocaleString()} tracked sales in selected window</Typography>
        </Box>
        <WindowFilterMenu
          selected={selectedWindow}
          options={windowOptions}
          onChange={onSelectWindow}
        />
      </Stack>

      <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4,minmax(0,1fr))" }, gap: 0.7 }}>
        {rows.map((row) => (
          <Box key={row.country} sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
            <Typography variant="caption" color="text.secondary">
              {row.country}
              {row.is_dummy ? " • demo" : ""}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{compactCurrency(row.value)}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">{row.count} sales</Typography>
              <Stack direction="row" spacing={0.25} alignItems="center">
                {row.change_pct > 1 ? <TrendingUpRoundedIcon sx={{ fontSize: 14, color: "success.main" }} /> : null}
                {row.change_pct < -1 ? <TrendingDownRoundedIcon sx={{ fontSize: 14, color: "error.main" }} /> : null}
                {Math.abs(row.change_pct) <= 1 ? <TrendingFlatRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} /> : null}
                <Typography
                  variant="caption"
                  sx={{
                    color: row.change_pct > 1 ? "success.main" : row.change_pct < -1 ? "error.main" : "text.secondary",
                    fontWeight: 700,
                  }}
                >
                  {row.change_pct > 0 ? "+" : ""}{row.change_pct}%
                </Typography>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1.2, position: "relative", p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.2, overflow: "hidden", minHeight: { xs: 220, md: 280 } }}>
        <Box component="svg" viewBox="0 0 1000 460" sx={{ width: "100%", height: { xs: 200, md: 260 }, display: "block" }}>
          <rect x="0" y="0" width="1000" height="460" fill={hexToRgba(tokens.bgCard, tokens.isDark ? 0.46 : 0.7)} />
          <path d="M20,130 L320,110 L390,200 L420,260 L370,405 L230,430 L120,390 L45,295 Z" fill={hexToRgba(tokens.border, tokens.isDark ? 0.12 : 0.2)} />
          <path d="M360,80 L595,85 L725,152 L692,312 L560,368 L440,340 L410,280 L425,200 Z" fill={hexToRgba(tokens.border, tokens.isDark ? 0.12 : 0.2)} />
          <path d="M745,120 L935,145 L960,265 L900,350 L770,338 L730,255 Z" fill={hexToRgba(tokens.border, tokens.isDark ? 0.12 : 0.2)} />

          {COUNTRY_SHAPES.map((shape) => {
            const row = byCountry.get(shape.country);
            const isHovered = hovered?.row.country === shape.country;
            return (
              <path
                key={shape.country}
                d={shape.path}
                fill={colorForCountry(shape.country)}
                stroke={isHovered ? tokens.accent : hexToRgba(tokens.border, tokens.isDark ? 0.6 : 0.7)}
                strokeWidth={isHovered ? 2 : 1.1}
                onMouseEnter={(event) => {
                  if (!row) return;
                  const rect = (event.currentTarget.ownerSVGElement?.getBoundingClientRect()) || { left: 0, top: 0 };
                  setHovered({ row, x: event.clientX - rect.left, y: event.clientY - rect.top });
                }}
                onMouseMove={(event) => {
                  if (!row) return;
                  const rect = (event.currentTarget.ownerSVGElement?.getBoundingClientRect()) || { left: 0, top: 0 };
                  setHovered({ row, x: event.clientX - rect.left, y: event.clientY - rect.top });
                }}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {COUNTRY_SHAPES.map((shape) => {
            const row = byCountry.get(shape.country);
            if (!row) return null;
            return (
              <text key={`${shape.country}_label`} x={shape.path.includes("M") ? Number(shape.path.split("M")[1].split(",")[0]) + 8 : 0} y={shape.path.includes("L") ? Number(shape.path.split("L")[1].split(",")[1]) + 8 : 0} fill={tokens.textSecondary} fontSize="11">
                {countryAliases[shape.country] || shape.country}
              </text>
            );
          })}
        </Box>

        {hovered ? (
          <Box
            sx={{
              position: "absolute",
              left: Math.min(hovered.x + 14, 760),
              top: Math.max(10, hovered.y - 16),
              px: 1,
              py: 0.8,
              borderRadius: 1.2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(tokens.bgCard, tokens.isDark ? 0.95 : 0.98),
              boxShadow: "0 14px 24px rgba(0,0,0,0.28)",
              minWidth: 180,
              pointerEvents: "none",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{hovered.row.country}</Typography>
            <Typography variant="caption" color="text.secondary">Sales: {compactCurrency(hovered.row.value)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Count: {hovered.row.count}</Typography>
            <Stack direction="row" spacing={0.35} alignItems="center">
              {hovered.row.change_pct > 1 ? <TrendingUpRoundedIcon sx={{ fontSize: 14, color: "success.main" }} /> : null}
              {hovered.row.change_pct < -1 ? <TrendingDownRoundedIcon sx={{ fontSize: 14, color: "error.main" }} /> : null}
              {Math.abs(hovered.row.change_pct) <= 1 ? <TrendingFlatRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} /> : null}
              <Typography variant="caption" sx={{ color: hovered.row.change_pct > 0 ? "success.main" : hovered.row.change_pct < 0 ? "error.main" : "text.secondary", fontWeight: 800 }}>
                {hovered.row.change_pct > 0 ? "+" : ""}{hovered.row.change_pct}% vs previous
              </Typography>
            </Stack>
          </Box>
        ) : null}
      </Box>
    </CardContent></Card>
  );
}
