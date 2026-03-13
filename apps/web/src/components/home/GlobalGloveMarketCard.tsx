import React, { useMemo } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import { Card, CardContent } from "../../ui/Primitives";
import { readChartThemeTokens } from "../../lib/chartjsTheme";
import { compactCurrency, type HomeWindowKey } from "../../lib/homeMarketUtils";
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
  Mexico: "🇲🇽",
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
  { country: "France", value: 176400, count: 571, change_pct: 1.7, is_dummy: true },
  { country: "Italy", value: 169300, count: 542, change_pct: 1.3, is_dummy: true },
  { country: "Spain", value: 163100, count: 521, change_pct: 1.2, is_dummy: true },
  { country: "Brazil", value: 159400, count: 513, change_pct: 2.4, is_dummy: true },
  { country: "Mexico", value: 152600, count: 492, change_pct: 2.2, is_dummy: true },
  { country: "Argentina", value: 145200, count: 468, change_pct: 1.1, is_dummy: true },
  { country: "Colombia", value: 139500, count: 441, change_pct: 0.9, is_dummy: true },
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
  readChartThemeTokens();
  const usingDummy = rows.length === 0;
  const displayRows = useMemo(
    () => (usingDummy ? FALLBACK_ROWS : [...rows].sort((a, b) => b.value - a.value).slice(0, 13)),
    [rows, usingDummy],
  );
  const computedTotalValue = usingDummy
    ? displayRows.reduce((sum, row) => sum + row.value, 0)
    : totalValue;
  const computedTotalCount = usingDummy
    ? displayRows.reduce((sum, row) => sum + row.count, 0)
    : totalCount;

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
      <Box sx={{ mt: 0.4, display: "flex", gap: 0.7, alignItems: "stretch", flexWrap: "nowrap" }}>
        <Box
          sx={{
            p: 0.95,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.1,
            minWidth: { xs: 220, sm: 240 },
            flex: "0 0 270px",
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{compactCurrency(computedTotalValue)}</Typography>
          <Typography variant="caption" color="text.secondary">{computedTotalCount.toLocaleString()} tracked sales in selected window</Typography>
        </Box>
        <Box
          sx={{
            position: "relative",
            minWidth: 0,
            flex: "1 1 auto",
            overflow: "hidden",
            borderRadius: 1.1,
            maskImage: "linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)",
            "@media (prefers-reduced-motion: reduce)": {
              overflowX: "auto",
              maskImage: "none",
              WebkitMaskImage: "none",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 0.7,
              width: "max-content",
              animation: "gloveiq-country-marquee 52s linear infinite",
              "@keyframes gloveiq-country-marquee": {
                "0%": { transform: "translateX(0)" },
                "100%": { transform: "translateX(calc(-50% - 0.35rem))" },
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
              },
            }}
          >
            {[...displayRows, ...displayRows].map((row, idx) => (
              <Box
                key={`${row.country}-${idx}`}
                sx={{
                  p: 0.85,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.1,
                  minWidth: 156,
                  backgroundColor: "background.paper",
                }}
              >
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
        </Box>
      </Box>
    </CardContent></Card>
  );
}
