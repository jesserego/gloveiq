import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type CompRecord, type FamilyRecord, type PatternRecord, type SaleRecord, type VariantRecord } from "./lib/api";
import type { Artifact, BrandConfig } from "@gloveiq/shared";
import type { SearchResult, VariantProfileRecord, GloveProfileRecord } from "./data/search-mocks";
import { MOCK_SEARCH_RESULTS } from "./data/search-mocks";
import { Locale, t } from "./i18n/strings";
import { Card, CardContent, Button, Input } from "./ui/Primitives";
import { buildAppTheme, type AppThemeMode } from "./ui/theme";
import { MainTab, MobileBottomNav, SidebarNav } from "./ui/Shell";

import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Dialog,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import SecurityIcon from "@mui/icons-material/Security";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import PublicIcon from "@mui/icons-material/Public";
import glovePlaceholderImage from "./assets/baseball-glove-placeholder.svg";

const NAV_SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;
const FIGMA_TAG_BASE_SX = {
  height: 24,
  borderRadius: "999px",
  "& .MuiChip-label": { px: 1.15, py: 0.1, fontWeight: 700, fontSize: 12, lineHeight: "16px" },
} as const;
const FIGMA_OPEN_BUTTON_SX = {
  height: 28,
  minHeight: 28,
  borderRadius: "999px",
  px: 1.85,
  py: 0,
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 700,
} as const;

type Route =
  | { name: "search" }
  | { name: "artifacts" }
  | { name: "appraisal" }
  | { name: "account" }
  | { name: "artifactDetail"; artifactId: string }
  | { name: "variantProfile"; variantId: string }
  | { name: "gloveProfile"; gloveId: string }
  | { name: "pricing" };

function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
  catch { return `$${v}`; }
}

function confidenceBandFromScore(score: number): "Low" | "Medium" | "High" {
  if (score >= 0.78) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

function routeToTab(route: Route): MainTab {
  if (route.name === "artifacts" || route.name === "artifactDetail" || route.name === "variantProfile" || route.name === "gloveProfile") return "artifact";
  if (route.name === "appraisal") return "appraisal";
  if (route.name === "account") return "account";
  return route.name;
}

function routeFromPath(pathname: string): Route {
  if (pathname.startsWith("/variants/")) return { name: "variantProfile", variantId: decodeURIComponent(pathname.replace("/variants/", "")) };
  if (pathname.startsWith("/gloves/")) return { name: "gloveProfile", gloveId: decodeURIComponent(pathname.replace("/gloves/", "")) };
  if (pathname === "/artifacts") return { name: "artifacts" };
  if (pathname === "/appraisal") return { name: "appraisal" };
  if (pathname === "/account") return { name: "account" };
  if (pathname === "/pricing") return { name: "pricing" };
  return { name: "search" };
}

function pathFromRoute(route: Route): string {
  if (route.name === "variantProfile") return `/variants/${encodeURIComponent(route.variantId)}`;
  if (route.name === "gloveProfile") return `/gloves/${encodeURIComponent(route.gloveId)}`;
  if (route.name === "artifacts") return "/artifacts";
  if (route.name === "appraisal") return "/appraisal";
  if (route.name === "account") return "/account";
  if (route.name === "pricing") return "/pricing";
  return "/search";
}

function routeForSearchResult(record: SearchResult): Route {
  if (record.record_type === "variant") return { name: "variantProfile", variantId: record.id };
  return { name: "gloveProfile", gloveId: record.id };
}

const PAGE_CONTAINER_SX = {
  py: { xs: 2, md: 2.5 },
  px: { xs: 1.5, sm: 2.5, md: 3 },
} as const;

const FULL_BRAND_SEEDS: BrandConfig[] = [
  { brand_key: "RAWLINGS", display_name: "Rawlings", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "WILSON", display_name: "Wilson", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "MIZUNO", display_name: "Mizuno", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "EASTON", display_name: "Easton", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "MARUCCI", display_name: "Marucci", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "FRANKLIN", display_name: "Franklin", country_hint: "USA", supports_variant_ai: false },
  { brand_key: "LOUISVILLE_SLUGGER", display_name: "Louisville Slugger", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "NIKE", display_name: "Nike", country_hint: "USA", supports_variant_ai: false },
  { brand_key: "FORTY_FOUR", display_name: "44 Pro", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "SSK", display_name: "SSK", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "ADIDAS", display_name: "Adidas", country_hint: "Germany", supports_variant_ai: false },
  { brand_key: "JAX", display_name: "JAX", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "NAKONA", display_name: "Nokona", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "YARDLEY", display_name: "Yardley", country_hint: "USA", supports_variant_ai: true },
  { brand_key: "HATAKEYAMA", display_name: "Hatakeyama", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "ZETT", display_name: "Zett", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "STUDIO_RYU", display_name: "Studio Ryu", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "HI_GOLD", display_name: "Hi-Gold", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "ATOMS", display_name: "Atoms", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "IP_SELECT", display_name: "IP Select", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "DONAIYA", display_name: "Donaiya", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "FIVE_BASEBALL", display_name: "Five Baseball", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "XANAX_BASEBALL", display_name: "Xanax Baseball", country_hint: "Japan", supports_variant_ai: true },
  { brand_key: "KUBOTA_SLUGGER", display_name: "Kubota Slugger", country_hint: "Japan", supports_variant_ai: true },
];

const BRAND_COMPANY_INFO: Record<string, { company: string; contact: string }> = {
  RAWLINGS: { company: "Rawlings Sporting Goods", contact: "support@rawlings.com" },
  WILSON: { company: "Wilson Sporting Goods", contact: "www.wilson.com/contact-us" },
  MIZUNO: { company: "Mizuno Corporation", contact: "www.mizunousa.com/support" },
  EASTON: { company: "Easton Diamond Sports", contact: "support.easton@rawlings.com" },
  MARUCCI: { company: "Marucci Sports", contact: "www.maruccisports.com/pages/contact" },
  FRANKLIN: { company: "Franklin Sports", contact: "customerservice@franklinsports.com" },
  LOUISVILLE_SLUGGER: { company: "Louisville Slugger", contact: "www.slugger.com/en-us/contact-us" },
  NIKE: { company: "Nike, Inc.", contact: "www.nike.com/help" },
  FORTY_FOUR: { company: "44 Pro Gloves", contact: "support@44pro.com" },
  SSK: { company: "SSK Corporation", contact: "www.sskbaseballshop.com/pages/contact" },
  ADIDAS: { company: "adidas AG", contact: "www.adidas.com/us/help" },
  JAX: { company: "JAX Baseball", contact: "hello@jaxbaseball.com" },
  NAKONA: { company: "Nokona Ballgloves", contact: "www.nokona.com/pages/contact" },
  YARDLEY: { company: "Yardley Gloves", contact: "support@yardleygloves.com" },
  HATAKEYAMA: { company: "Hatakeyama Co., Ltd.", contact: "www.hatakeyama-web.com" },
  ZETT: { company: "ZETT Corporation", contact: "www.zett-baseball.jp" },
  STUDIO_RYU: { company: "Studio Ryu", contact: "info@studioryu.jp" },
  HI_GOLD: { company: "Hi-Gold Co., Ltd.", contact: "www.hi-gold.co.jp" },
  ATOMS: { company: "Atoms Baseball", contact: "www.atoms-baseball.jp" },
  IP_SELECT: { company: "IP Select", contact: "www.ipselect.jp" },
  DONAIYA: { company: "Donaiya", contact: "www.donaiya.com" },
  FIVE_BASEBALL: { company: "Five Baseball", contact: "info@five-baseball.jp" },
  XANAX_BASEBALL: { company: "Xanax Baseball", contact: "www.xanax-baseball.jp" },
  KUBOTA_SLUGGER: { company: "Kubota Slugger", contact: "www.kyu-kubota.co.jp" },
};

function logoDomainFromContact(contact: string) {
  const normalized = contact.trim().toLowerCase();
  if (!normalized) return "";
  const urlMatch = normalized.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
  if (urlMatch?.[1]) return urlMatch[1];
  const emailMatch = normalized.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (emailMatch?.[1]) return emailMatch[1];
  return "";
}

function brandLogoSrc(contact: string) {
  const domain = logoDomainFromContact(contact);
  if (!domain) return "";
  return `https://logo.clearbit.com/${domain}`;
}

function brandLogoMark(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type BrandHierarchyNode = {
  brand: BrandConfig;
  details: { company: string; contact: string };
  families: Array<{ family: FamilyRecord; patterns: PatternRecord[] }>;
};

function SearchHeader({
  value,
  onChange,
  onSearch,
  onOpenIq,
  onOpenGlobalStats,
  manufacturers,
  selectedManufacturer,
  onSelectManufacturer,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  onOpenIq: () => void;
  onOpenGlobalStats: () => void;
  manufacturers: string[];
  selectedManufacturer: string;
  onSelectManufacturer: (manufacturer: string) => void;
  suggestions: string[];
}) {
  const [manufacturerAnchor, setManufacturerAnchor] = useState<HTMLElement | null>(null);

  return (
    <Stack spacing={1.3} sx={{ alignItems: "center", maxWidth: 760, mx: "auto", width: "100%" }}>
      <Autocomplete
        freeSolo
        options={suggestions}
        value={value}
        onInputChange={(_, v) => onChange(v)}
        sx={{ width: "100%" }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Paste listing link, model, or artifact"
            onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "999px",
                minHeight: 52,
                backgroundColor: alpha("#ffffff", 0.02),
                border: "1px solid",
                borderColor: alpha("#ffffff", 0.22),
                boxShadow: `0 1px 6px ${alpha("#000", 0.35)}`,
                transition: "box-shadow .16s ease, border-color .16s ease",
                "&:hover": {
                  boxShadow: `0 2px 10px ${alpha("#000", 0.45)}`,
                  borderColor: alpha("#ffffff", 0.35),
                },
                "&.Mui-focused": {
                  boxShadow: `0 2px 10px ${alpha("#000", 0.45)}`,
                  borderColor: alpha("#ffffff", 0.35),
                },
              },
              "& .MuiOutlinedInput-input": { py: 1.35, fontSize: 16 },
            }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: alpha("#fff", 0.72) }} />
                </InputAdornment>
              ),
              endAdornment: (
                <Stack direction="row" spacing={0.15} sx={{ pr: 0.5, alignItems: "center" }}>
                  <Tooltip title={selectedManufacturer ? `Manufacturer: ${selectedManufacturer}` : "Select manufacturer"}>
                    <IconButton
                      size="small"
                      onClick={(evt) => setManufacturerAnchor(evt.currentTarget)}
                      aria-label="Select manufacturer"
                    >
                      <SportsBaseballIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open global baseball statistics">
                    <IconButton size="small" onClick={onOpenGlobalStats} aria-label="Open global baseball statistics">
                      <PublicIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {params.InputProps.endAdornment}
                </Stack>
              ),
            }}
          />
        )}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: "center", width: "100%" }}>
        <Button
          onClick={onSearch}
          sx={{
            borderRadius: 2,
            minWidth: 128,
            px: 2,
            height: 36,
            bgcolor: alpha("#fff", 0.06),
            border: "1px solid",
            borderColor: alpha("#fff", 0.08),
            "&:hover": { bgcolor: alpha("#fff", 0.1), borderColor: alpha("#fff", 0.18) },
          }}
        >
          Search
        </Button>
        <Button
          onClick={onOpenIq}
          sx={{
            borderRadius: 2,
            minWidth: 128,
            px: 2,
            height: 36,
            bgcolor: alpha("#fff", 0.06),
            border: "1px solid",
            borderColor: alpha("#fff", 0.08),
            "&:hover": { bgcolor: alpha("#fff", 0.1), borderColor: alpha("#fff", 0.18) },
          }}
        >
          IQ Mode
        </Button>
      </Stack>
      <Menu
        anchorEl={manufacturerAnchor}
        open={Boolean(manufacturerAnchor)}
        onClose={() => setManufacturerAnchor(null)}
      >
        <MenuItem onClick={() => { onSelectManufacturer(""); setManufacturerAnchor(null); }}>All manufacturers</MenuItem>
        {manufacturers.map((name) => (
          <MenuItem
            key={name}
            selected={selectedManufacturer === name}
            onClick={() => { onSelectManufacturer(name); setManufacturerAnchor(null); }}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}

function IdentifierModal({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record: VariantProfileRecord | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box sx={{ p: 1.4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Identifier</Typography>
          <Button onClick={onClose} startIcon={<CloseIcon />}>Close</Button>
        </Stack>
        <Divider sx={{ my: 1.2 }} />
        {record ? (
          <Stack spacing={0.9}>
            <Typography sx={{ fontWeight: 800 }}>{record.title}</Typography>
            <Typography variant="body2" color="text.secondary">{record.subtitle}</Typography>
            <Stack direction="row" spacing={0.7} sx={{ flexWrap: "wrap" }}>
              {[record.brand, record.model, record.pattern, record.hand, record.throwSide, record.size, record.web, record.year ? String(record.year) : ""]
                .filter(Boolean)
                .map((v) => <Chip key={v} size="small" label={v} />)}
            </Stack>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No variant selected yet.</Typography>
        )}
      </Box>
    </Dialog>
  );
}

function ResultsGrid({
  rows,
  selectedId,
  onSelect,
}: {
  rows: SearchResult[];
  selectedId: string | null;
  onSelect: (row: SearchResult) => void;
}) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(3,minmax(0,1fr))" }, gap: 1.2 }}>
      {rows.map((row) => (
        <Box
          key={row.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(row)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(row); } }}
          sx={{
            p: 1.2,
            border: "1px solid",
            borderColor: selectedId === row.id ? "primary.main" : "divider",
            borderRadius: 2,
            backgroundColor: selectedId === row.id ? alpha("#0A84FF", 0.14) : "transparent",
            cursor: "pointer",
          }}
        >
          <Box component="img" src={row.thumbnail || glovePlaceholderImage} alt={row.title} sx={{ width: "100%", height: 126, borderRadius: 1.3, objectFit: "cover", border: "1px solid", borderColor: "divider", mb: 0.9 }} />
          <Typography sx={{ fontWeight: 800 }} noWrap>{row.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{row.subtitle}</Typography>
          <Stack direction="row" spacing={0.65} sx={{ mt: 0.8, flexWrap: "wrap" }}>
            {row.chips.map((chip) => <Chip key={`${row.id}-${chip}`} size="small" label={chip} sx={FIGMA_TAG_BASE_SX} />)}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function DashboardLayout({
  left,
  currentListings,
  conditionImpact,
  originMap,
  salesHistory,
}: {
  left: React.ReactNode;
  currentListings: React.ReactNode;
  conditionImpact: React.ReactNode;
  originMap: React.ReactNode;
  salesHistory: React.ReactNode;
}) {
  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.45fr 1fr" }, gap: 1.5 }}>
        {left}
        <Stack spacing={1.5}>
          {currentListings}
          {conditionImpact}
        </Stack>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5 }}>
        {originMap}
        {salesHistory}
      </Box>
    </Stack>
  );
}

function CurrentListings({ rows }: { rows: Array<{ label: string; price: number; href?: string | null }> }) {
  return (
    <Card><CardContent>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Current for Sale</Typography>
      <Divider sx={{ my: 1.2 }} />
      <Stack spacing={0.9}>
        {rows.map((row, idx) => (
          <Box key={`${row.label}-${idx}`} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
            <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
              <Typography variant="body2">{row.label}</Typography>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(row.price)}</Typography>
                {row.href ? <Button onClick={() => window.open(row.href!, "_blank", "noopener,noreferrer")} sx={FIGMA_OPEN_BUTTON_SX}>Open</Button> : null}
              </Stack>
            </Stack>
          </Box>
        ))}
        {rows.length === 0 ? <Typography variant="body2" color="text.secondary">No active listings.</Typography> : null}
      </Stack>
    </CardContent></Card>
  );
}

function ConditionPriceImpact({ conditionScore }: { conditionScore: number | null | undefined }) {
  const score = typeof conditionScore === "number" ? Math.max(0, Math.min(1, conditionScore)) : 0.65;
  const delta = Math.round((score - 0.7) * 120);
  return (
    <Card><CardContent>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Condition Scale / Price Effect</Typography>
      <Divider sx={{ my: 1.2 }} />
      <Typography variant="body2" color="text.secondary">Condition score: {score.toFixed(2)}</Typography>
      <Slider value={Math.round(score * 100)} min={0} max={100} marks />
      <Typography variant="caption" color="text.secondary">
        Estimated effect: {delta >= 0 ? "+" : ""}{delta}% vs median comp.
      </Typography>
    </CardContent></Card>
  );
}

function OriginMap({ madeIn }: { madeIn?: string | null }) {
  return (
    <Card><CardContent>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Manufacture Origin Map</Typography>
      <Divider sx={{ my: 1.2 }} />
      <Box sx={{ p: 1.2, border: "1px dashed", borderColor: "divider", borderRadius: 1.4, minHeight: 170, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">[Map Placeholder] Origin: {madeIn || "Unknown"}</Typography>
      </Box>
    </CardContent></Card>
  );
}

function SalesHistory({ rows }: { rows: Array<{ date: string; price: number; timeToSellDays?: number }> }) {
  const [windowDays, setWindowDays] = useState<5 | 30 | 60 | 90 | 120>(30);
  const dayOptions: Array<5 | 30 | 60 | 90 | 120> = [5, 30, 60, 90, 120];

  const filteredRows = useMemo(() => {
    if (!rows.length) return rows;
    const parsed = rows
      .map((row) => ({ ...row, parsedDate: new Date(row.date) }))
      .filter((row) => Number.isFinite(row.parsedDate.getTime()));
    if (!parsed.length) return rows;
    const anchorMs = parsed.reduce((max, row) => Math.max(max, row.parsedDate.getTime()), 0);
    const cutoff = anchorMs - windowDays * 24 * 60 * 60 * 1000;
    const inWindow = parsed.filter((row) => row.parsedDate.getTime() >= cutoff);
    return (inWindow.length ? inWindow : parsed)
      .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime())
      .map(({ parsedDate, ...rest }) => rest);
  }, [rows, windowDays]);

  const averagePrice = useMemo(() => {
    if (!filteredRows.length) return 0;
    const total = filteredRows.reduce((sum, row) => sum + Number(row.price || 0), 0);
    return total / filteredRows.length;
  }, [filteredRows]);

  const averageSellDays = useMemo(() => {
    const withDays = filteredRows.filter((row) => typeof row.timeToSellDays === "number") as Array<{ timeToSellDays: number }>;
    if (!withDays.length) return null;
    return withDays.reduce((sum, row) => sum + row.timeToSellDays, 0) / withDays.length;
  }, [filteredRows]);

  const miniBars = useMemo(() => {
    const sample = filteredRows.slice(0, 12).reverse();
    const max = Math.max(1, ...sample.map((row) => Number(row.price || 0)));
    return sample.map((row) => ({ label: row.date, value: Math.round((Number(row.price || 0) / max) * 100) }));
  }, [filteredRows]);

  return (
    <Card><CardContent>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Sales History</Typography>
      <Divider sx={{ my: 1.2 }} />
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.8 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Average ({windowDays}d)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>{money(averagePrice)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {averageSellDays == null ? "Time to sell n/a" : `${Math.round(averageSellDays)} day avg time to sell`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
            {dayOptions.map((days) => (
              <Button
                key={days}
                onClick={() => setWindowDays(days)}
                sx={{
                  ...FIGMA_OPEN_BUTTON_SX,
                  minWidth: 50,
                  px: 1.1,
                  bgcolor: days === windowDays ? alpha("#0A84FF", 0.2) : "transparent",
                  border: "1px solid",
                  borderColor: days === windowDays ? alpha("#0A84FF", 0.7) : "divider",
                }}
              >
                {days}d
              </Button>
            ))}
          </Stack>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", alignItems: "end", gap: 0.35, height: 54 }}>
          {miniBars.map((bar, idx) => (
            <Box
              key={`${bar.label}-${idx}`}
              title={`${bar.label}: ${bar.value}%`}
              sx={{
                borderRadius: 0.6,
                minHeight: 6,
                height: `${Math.max(10, bar.value)}%`,
                backgroundColor: alpha("#0A84FF", 0.75),
              }}
            />
          ))}
          {!miniBars.length ? <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>No chart data.</Typography> : null}
        </Box>
      </Stack>
      <Divider sx={{ my: 1.2 }} />
      <Stack spacing={0.8}>
        {filteredRows.slice(0, 10).map((row, idx) => (
          <Box key={`${row.date}-${idx}`} sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
            <Typography variant="body2">{row.date} • {money(row.price)}</Typography>
            {typeof row.timeToSellDays === "number" ? <Typography variant="caption" color="text.secondary">Time to sell: {row.timeToSellDays} days</Typography> : null}
          </Box>
        ))}
        {filteredRows.length === 0 ? <Typography variant="body2" color="text.secondary">No sales yet.</Typography> : null}
      </Stack>
    </CardContent></Card>
  );
}

function SalesHeatmapWorldwide({
  rows,
}: {
  rows: Array<{ country: string; salesCount: number; fill: string }>;
}) {
  return (
    <Card><CardContent>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Sales Heatmap Worldwide</Typography>
      <Divider sx={{ my: 1.2 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 0.8 }}>
        {rows.map((row) => (
          <Box
            key={row.country}
            sx={{
              borderRadius: 1.1,
              p: 0.9,
              backgroundColor: row.fill,
              minHeight: 66,
              border: "1px solid",
              borderColor: alpha("#ffffff", 0.12),
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{row.country}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{row.salesCount}</Typography>
          </Box>
        ))}
      </Box>
    </CardContent></Card>
  );
}

function GlobalStatisticsDialog({
  open,
  onClose,
  gloves,
  sales,
}: {
  open: boolean;
  onClose: () => void;
  gloves: Artifact[];
  sales: SaleRecord[];
}) {
  const byCountry = useMemo(() => {
    const counts = new Map<string, number>();
    for (const glove of gloves) {
      const key = (glove.made_in || "Unknown").trim() || "Unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const total = Math.max(1, gloves.length);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({ country, count, share: Math.round((count / total) * 100) }));
  }, [gloves]);

  const heatmap = useMemo(() => {
    const rows = byCountry.slice(0, 8).map((row, idx) => ({
      country: row.country,
      salesCount: row.count,
      fill: alpha("#0A84FF", 0.18 + idx * 0.06),
    }));
    if (rows.length >= 8) return rows;
    return [...rows, ...["US-East", "US-West", "EU", "APAC"].slice(0, 8 - rows.length).map((country, idx) => ({
      country,
      salesCount: 20 + idx * 9,
      fill: alpha("#0A84FF", 0.28 + idx * 0.06),
    }))];
  }, [byCountry]);

  const salesRows = useMemo(
    () => sales.slice(0, 10).map((s) => ({ date: s.sale_date, price: s.price_usd, timeToSellDays: 4 + (Number(s.price_usd) % 28) })),
    [sales],
  );

  const currentForSaleRows = useMemo(
    () => gloves.filter((g) => g.listing_url).slice(0, 8).map((g) => ({ label: `${g.brand_key || "Unknown"} ${g.model_code || g.id}`, price: Number(g.valuation_estimate || g.valuation_high || g.valuation_low || 0), href: g.listing_url })),
    [gloves],
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Global Baseball Statistics</Typography>
            <Typography variant="caption" color="text.secondary">Market intelligence overview by country of origin and sales behavior.</Typography>
          </Stack>
          <Button onClick={onClose} startIcon={<CloseIcon />}>Close</Button>
        </Stack>
        <Divider sx={{ my: 1.25 }} />
        <DashboardLayout
          left={(
            <Card><CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Global Market Share by Country of Origin</Typography>
              <Divider sx={{ my: 1.2 }} />
              <Stack spacing={0.9}>
                {byCountry.map((row) => (
                  <Box key={row.country}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">{row.country}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.share}%</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.4, height: 7, borderRadius: 999, backgroundColor: alpha("#ffffff", 0.1), overflow: "hidden" }}>
                      <Box sx={{ width: `${row.share}%`, height: "100%", backgroundColor: "primary.main" }} />
                    </Box>
                  </Box>
                ))}
                {!byCountry.length ? <Typography variant="body2" color="text.secondary">No country-of-origin data available.</Typography> : null}
              </Stack>
            </CardContent></Card>
          )}
          currentListings={<CurrentListings rows={currentForSaleRows} />}
          conditionImpact={<SalesHeatmapWorldwide rows={heatmap} />}
          originMap={(
            <Card><CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Worldwide Listings Snapshot</Typography>
              <Divider sx={{ my: 1.2 }} />
              <Box sx={{ p: 1.2, borderRadius: 1.4, border: "1px dashed", borderColor: "divider", minHeight: 170, display: "grid", placeItems: "center" }}>
                <Typography variant="body2" color="text.secondary">[Global map placeholder] Country and region listing density.</Typography>
              </Box>
            </CardContent></Card>
          )}
          salesHistory={<SalesHistory rows={salesRows} />}
        />
      </Box>
    </Dialog>
  );
}

function SearchResultsPage({
  variants,
  gloves,
  sales,
  onNavigate,
}: {
  variants: VariantRecord[];
  gloves: Artifact[];
  sales: SaleRecord[];
  onNavigate: (route: Route) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [iqOpen, setIqOpen] = useState(false);
  const [globalStatsOpen, setGlobalStatsOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");

  const manufacturers = useMemo(
    () => FULL_BRAND_SEEDS.map((brand) => brand.display_name).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const rows = useMemo<SearchResult[]>(() => {
    const variantRows: SearchResult[] = variants.slice(0, 80).map((v) => ({
      id: v.variant_id,
      record_type: "variant",
      title: v.display_name,
      subtitle: `${v.brand_key} • ${v.model_code || "model n/a"}`,
      chips: [v.brand_key, v.model_code || "—", v.web || "web ?", v.made_in || "origin ?", String(v.year || "")].filter(Boolean),
    }));
    const gloveRows: SearchResult[] = gloves.slice(0, 120).map((g) => ({
      id: g.id,
      record_type: "glove",
      title: g.model_code || g.id,
      subtitle: `${g.brand_key || "Unknown"} • ${g.source || "source"}`,
      chips: [g.brand_key || "Unknown", g.model_code || "—", g.position || "position ?", g.size_in ? String(g.size_in) : "size ?", g.source || ""].filter(Boolean),
      thumbnail: g.photos?.[0]?.url,
    }));
    const merged = [...variantRows, ...gloveRows];
    if (!merged.length) return MOCK_SEARCH_RESULTS;
    return merged;
  }, [variants, gloves]);

  const suggestions = useMemo(() => rows.map((r) => r.title).slice(0, 80), [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const manufacturerMatches = !selectedManufacturer || `${r.title} ${r.subtitle} ${r.chips.join(" ")}`.toLowerCase().includes(selectedManufacturer.toLowerCase());
      if (!manufacturerMatches) return false;
      if (!q) return true;
      return `${r.title} ${r.subtitle} ${r.chips.join(" ")}`.toLowerCase().includes(q);
    });
  }, [query, rows, selectedManufacturer]);

  const selectedVariant = useMemo<VariantProfileRecord | null>(() => {
    const selected = variants.find((v) => v.variant_id === selectedId) || variants[0];
    if (!selected) return null;
    return {
      id: selected.variant_id,
      title: selected.display_name,
      subtitle: `${selected.brand_key} • ${selected.variant_id}`,
      brand: selected.brand_key,
      model: selected.model_code || "Unknown",
      pattern: selected.pattern_id || "Unknown",
      hand: selected.variant_label || "Unknown",
      size: "Unknown",
      web: selected.web || "Unknown",
      throwSide: "UNK",
      year: selected.year,
    };
  }, [selectedId, variants]);

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <SearchHeader
          value={query}
          onChange={setQuery}
          onSearch={() => {}}
          onOpenIq={() => setIqOpen(true)}
          onOpenGlobalStats={() => setGlobalStatsOpen(true)}
          manufacturers={manufacturers}
          selectedManufacturer={selectedManufacturer}
          onSelectManufacturer={setSelectedManufacturer}
          suggestions={suggestions}
        />
        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Results</Typography>
            <Chip label={`${filtered.length} records`} />
          </Stack>
          <Divider sx={{ my: 1.2 }} />
          <ResultsGrid
            rows={filtered}
            selectedId={selectedId}
            onSelect={(row) => {
              setSelectedId(row.id);
              onNavigate(routeForSearchResult(row));
            }}
          />
        </CardContent></Card>
      </Stack>
      <IdentifierModal open={iqOpen} onClose={() => setIqOpen(false)} record={selectedVariant} />
      <GlobalStatisticsDialog
        open={globalStatsOpen}
        onClose={() => setGlobalStatsOpen(false)}
        gloves={gloves}
        sales={sales}
      />
    </Container>
  );
}

function VariantProfilePage({
  variant,
  relatedGloves,
  sales,
}: {
  variant: VariantRecord;
  relatedGloves: Artifact[];
  sales: SaleRecord[];
}) {
  const listingRows = relatedGloves.filter((g) => g.listing_url).slice(0, 10).map((g) => ({ label: g.id, price: Number(g.valuation_estimate || 0), href: g.listing_url }));
  const salesRows = sales.filter((s) => s.variant_id === variant.variant_id).slice(0, 10).map((s) => ({ date: s.sale_date, price: s.price_usd, timeToSellDays: 6 + (parseInt((s.sale_id || "0").replace(/\D/g, "").slice(-4) || "17", 10) % 70) }));

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <DashboardLayout
        left={
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Variant Profile</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>{variant.display_name}</Typography>
            <Typography variant="body2" color="text.secondary">{variant.brand_key} • {variant.variant_id} • {variant.model_code || "model n/a"}</Typography>
            <Stack direction="row" spacing={0.7} sx={{ mt: 1.1, flexWrap: "wrap" }}>
              {[variant.brand_key, variant.model_code || "—", variant.pattern_id || "—", variant.web || "—", variant.leather || "—", variant.made_in || "—", String(variant.year || "")]
                .filter(Boolean)
                .map((chip) => <Chip key={chip} size="small" label={chip} />)}
            </Stack>
          </CardContent></Card>
        }
        currentListings={<CurrentListings rows={listingRows} />}
        conditionImpact={<ConditionPriceImpact conditionScore={relatedGloves[0]?.condition_score} />}
        originMap={<OriginMap madeIn={variant.made_in} />}
        salesHistory={<SalesHistory rows={salesRows} />}
      />
    </Container>
  );
}

function GloveProfilePage({
  glove,
  relatedVariants,
  sales,
}: {
  glove: Artifact;
  relatedVariants: VariantRecord[];
  sales: SaleRecord[];
}) {
  const listingRows = [glove].filter((g) => g.listing_url).map((g) => ({ label: g.id, price: Number(g.valuation_estimate || 0), href: g.listing_url }));
  const variantIds = new Set(relatedVariants.map((v) => v.variant_id));
  const salesRows = sales.filter((s) => variantIds.has(s.variant_id)).slice(0, 10).map((s) => ({ date: s.sale_date, price: s.price_usd, timeToSellDays: 6 + (parseInt((s.sale_id || "0").replace(/\D/g, "").slice(-4) || "17", 10) % 70) }));
  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <DashboardLayout
        left={
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Glove Profile</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>{glove.model_code || glove.id}</Typography>
            <Typography variant="body2" color="text.secondary">{glove.brand_key || "Unknown"} • {glove.id}</Typography>
            <Stack direction="row" spacing={0.7} sx={{ mt: 1.1, flexWrap: "wrap" }}>
              {[glove.brand_key || "Unknown", glove.model_code || "—", glove.position || "—", glove.size_in ? String(glove.size_in) : "—", glove.source || "—"]
                .filter(Boolean)
                .map((chip) => <Chip key={chip} size="small" label={chip} />)}
            </Stack>
          </CardContent></Card>
        }
        currentListings={<CurrentListings rows={listingRows} />}
        conditionImpact={<ConditionPriceImpact conditionScore={glove.condition_score} />}
        originMap={<OriginMap madeIn={glove.made_in} />}
        salesHistory={<SalesHistory rows={salesRows} />}
      />
    </Container>
  );
}

function SearchScreen({
  locale,
  brands,
  families,
  patterns,
  onOpenArtifact,
}: {
  locale: Locale;
  brands: BrandConfig[];
  families: FamilyRecord[];
  patterns: PatternRecord[];
  onOpenArtifact: (id: string) => void;
}) {
  const [homeSalesRows, setHomeSalesRows] = useState<SaleRecord[]>([]);
  const [homeArtifactRows, setHomeArtifactRows] = useState<Artifact[]>([]);
  const [homeVariantRows, setHomeVariantRows] = useState<VariantRecord[]>([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeErr, setHomeErr] = useState<string | null>(null);
  const [homeBrandDetailOpen, setHomeBrandDetailOpen] = useState<BrandHierarchyNode | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setHomeLoading(true);
      setHomeErr(null);
      try {
        const [sales, artifacts, variants] = await Promise.all([
          api.sales(),
          api.artifacts(undefined, { photoMode: "none" }),
          api.variants(),
        ]);
        if (cancelled) return;
        setHomeSalesRows(sales);
        setHomeArtifactRows(artifacts);
        setHomeVariantRows(variants);
      } catch (e: any) {
        if (!cancelled) setHomeErr(String(e?.message || e));
      } finally {
        if (!cancelled) setHomeLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const homeMonthlySales = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      labels.push(month);
      values.push(homeSalesRows.filter((s) => String(s.sale_date).startsWith(month)).length);
    }
    return { labels, values };
  }, [homeSalesRows]);

  const homeCatalogBySource = useMemo(() => {
    const bySource = new Map<string, number>();
    for (const row of homeArtifactRows) {
      const source = row.source || String(row.id || "").split(":")[0] || "UNKNOWN";
      bySource.set(source, (bySource.get(source) || 0) + 1);
    }
    return Array.from(bySource.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [homeArtifactRows]);

  const homeReleasesByYear = useMemo(() => {
    const byYear = new Map<number, number>();
    for (const row of homeVariantRows) byYear.set(row.year, (byYear.get(row.year) || 0) + 1);
    return Array.from(byYear.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year)
      .slice(0, 6)
      .reverse();
  }, [homeVariantRows]);

  const homeTimeToSellBuckets = useMemo(() => {
    const toDays = (sale: SaleRecord) => {
      const seed = parseInt((sale.sale_id || "0").replace(/\D/g, "").slice(-4) || "17", 10);
      return 5 + (seed % 70);
    };
    const buckets = [
      { label: "<14d", min: 0, max: 13, count: 0 },
      { label: "14-30d", min: 14, max: 30, count: 0 },
      { label: "31-45d", min: 31, max: 45, count: 0 },
      { label: "46+d", min: 46, max: 9999, count: 0 },
    ];
    for (const sale of homeSalesRows) {
      const days = toDays(sale);
      const match = buckets.find((b) => days >= b.min && days <= b.max);
      if (match) match.count += 1;
    }
    return buckets;
  }, [homeSalesRows]);

  const homeMarketVolume = homeSalesRows.length;
  const homeMarketValue = homeSalesRows.reduce((sum, row) => sum + Number(row.price_usd || 0), 0);
  const homeBrandHierarchy: BrandHierarchyNode[] = brands
    .map((brand) => {
      const relatedFamilies = families.filter((family) => family.brand_key === brand.brand_key);
      const withPatterns = relatedFamilies.map((family) => ({
        family,
        patterns: patterns.filter((pattern) => pattern.family_id === family.family_id),
      }));
      return {
        brand,
        details: BRAND_COMPANY_INFO[brand.brand_key] || { company: brand.display_name, contact: "Contact unavailable" },
        families: withPatterns,
      };
    })
    .filter((entry) => entry.families.length > 0 || brands.some((b) => b.brand_key === entry.brand.brand_key));

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.search")}</Typography>
              <Typography variant="body2" color="text.secondary">Market dashboard and catalog pulse.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label={`Sales ${homeSalesRows.length}`} />
              <Chip label={`Cataloged ${homeArtifactRows.length}`} />
              <Chip label={`Variants ${homeVariantRows.length}`} />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1.4, flexWrap: "wrap" }}>
            {brands.slice(0, 8).map((brand) => <Chip key={brand.brand_key} size="small" label={brand.display_name} />)}
          </Stack>
          {homeLoading ? <LinearProgress sx={{ mt: 2 }} /> : null}
          {homeErr ? <Typography sx={{ mt: 2 }} color="error">{homeErr}</Typography> : null}
        </CardContent></Card>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5 }}>
          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Time to Sell</Typography>
            <Divider sx={{ my: 1.4 }} />
            <Stack spacing={1}>
              {homeTimeToSellBuckets.map((bucket) => {
                const max = Math.max(1, ...homeTimeToSellBuckets.map((b) => b.count));
                const widthPct = Math.max(8, Math.round((bucket.count / max) * 100));
                return (
                  <Box key={bucket.label}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption">{bucket.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{bucket.count}</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.4, height: 8, borderRadius: 999, bgcolor: "action.hover", overflow: "hidden" }}>
                      <Box sx={{ width: `${widthPct}%`, height: "100%", bgcolor: "primary.main" }} />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </CardContent></Card>

          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Recently Cataloged Gloves</Typography>
            <Divider sx={{ my: 1.4 }} />
            <Stack spacing={1}>
              {homeCatalogBySource.map((row) => (
                <Stack key={row.source} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{row.source}</Typography>
                  <Chip size="small" label={row.count} />
                </Stack>
              ))}
              {homeCatalogBySource.length === 0 ? <Typography variant="body2" color="text.secondary">No catalog data yet.</Typography> : null}
            </Stack>
          </CardContent></Card>

          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Glove Market (All Sales)</Typography>
            <Divider sx={{ my: 1.4 }} />
            <Typography variant="h5" sx={{ fontWeight: 900 }}>{money(homeMarketValue)}</Typography>
            <Typography variant="body2" color="text.secondary">{homeMarketVolume} tracked sales</Typography>
            <Stack direction="row" spacing={0.6} sx={{ mt: 1.25, alignItems: "flex-end", height: 96 }}>
              {homeMonthlySales.values.map((value, idx) => {
                const max = Math.max(1, ...homeMonthlySales.values);
                const h = Math.max(8, Math.round((value / max) * 100));
                return (
                  <Tooltip key={homeMonthlySales.labels[idx]} title={`${homeMonthlySales.labels[idx]} • ${value} sales`}>
                    <Box sx={{ flex: 1, height: `${h}%`, borderRadius: 0.9, bgcolor: alpha("#0A84FF", 0.75) }} />
                  </Tooltip>
                );
              })}
            </Stack>
          </CardContent></Card>

          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>New Releases</Typography>
            <Divider sx={{ my: 1.4 }} />
            <Stack spacing={1}>
              {homeReleasesByYear.map((row) => (
                <Stack key={row.year} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{row.year}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.count} variants</Typography>
                </Stack>
              ))}
              {homeReleasesByYear.length === 0 ? <Typography variant="body2" color="text.secondary">No release-year data yet.</Typography> : null}
            </Stack>
          </CardContent></Card>
        </Box>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Brand Seeds</Typography>
            <Chip label={`${homeBrandHierarchy.length} brands`} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.25 }}>
            {homeBrandHierarchy.map((entry) => {
              const supportLabel = entry.brand.supports_variant_ai ? "Variant AI ready" : "Rule-only";
              const logoSrc = brandLogoSrc(entry.details.contact);
              return (
                <Box key={entry.brand.brand_key} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <Avatar
                      src={logoSrc || undefined}
                      alt={`${entry.brand.display_name} logo`}
                      sx={{ width: 34, height: 34, bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", fontWeight: 700, fontSize: 12 }}
                      imgProps={{ referrerPolicy: "no-referrer" }}
                    >
                      {!logoSrc ? brandLogoMark(entry.brand.display_name) : null}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>{entry.brand.display_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.details.company} • {entry.details.contact}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.8} sx={{ mt: 1.1, flexWrap: "wrap" }}>
                    <Chip size="small" label={supportLabel} color={entry.brand.supports_variant_ai ? "success" : "default"} />
                    <Chip size="small" label={entry.brand.country_hint || "Country unknown"} />
                    <Chip size="small" label={`${entry.families.length} families`} />
                  </Stack>
                  <Button
                    fullWidth
                    endIcon={<KeyboardArrowRightIcon />}
                    sx={{ mt: 1.1 }}
                    disabled={entry.families.length === 0}
                    onClick={() => setHomeBrandDetailOpen(entry)}
                  >
                    Open brand profile
                  </Button>
                </Box>
              );
            })}
          </Box>
        </CardContent></Card>

        <Dialog
          open={Boolean(homeBrandDetailOpen)}
          onClose={() => setHomeBrandDetailOpen(null)}
          fullScreen
        >
          {homeBrandDetailOpen ? (
            <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100%", bgcolor: "background.default" }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{homeBrandDetailOpen.brand.display_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {homeBrandDetailOpen.details.company} • {homeBrandDetailOpen.details.contact}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`${homeBrandDetailOpen.families.length} families`} />
                    <Chip size="small" label={homeBrandDetailOpen.brand.supports_variant_ai ? "Variant AI ready" : "Rule-only"} />
                    <Button onClick={() => setHomeBrandDetailOpen(null)}>Close</Button>
                  </Stack>
                </Stack>
                <Divider />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 1.25 }}>
                  {homeBrandDetailOpen.families.map((familyNode) => (
                    <Card key={familyNode.family.family_id}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{familyNode.family.display_name}</Typography>
                          <Chip size="small" label={`${familyNode.patterns.length} patterns`} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {familyNode.family.family_key} • tier {familyNode.family.tier}
                        </Typography>
                        <Divider sx={{ my: 1.2 }} />
                        <Stack spacing={0.8}>
                          {familyNode.patterns.map((pattern) => (
                            <Box key={pattern.pattern_id} sx={{ p: 1, borderRadius: 1.3, border: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
                              <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                                {pattern.pattern_code} • {pattern.canonical_position}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {pattern.pattern_system} • size {pattern.canonical_size_in || "—"} • web {pattern.canonical_web || "—"}
                              </Typography>
                            </Box>
                          ))}
                          {familyNode.patterns.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No patterns linked to this family yet.</Typography>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Stack>
            </Box>
          ) : null}
        </Dialog>
      </Stack>
    </Container>
  );

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Artifact[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "cataloged" | "artifact">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [brandFilter, setBrandFilter] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "value_desc" | "value_asc" | "condition_desc">("relevance");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [brandDetailOpen, setBrandDetailOpen] = useState<BrandHierarchyNode | null>(null);
  const [resultsFilterInput, setResultsFilterInput] = useState("");
  const [resultsExpanded, setResultsExpanded] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);

  async function refresh(query?: string) {
    setLoading(true); setErr(null);
    try { setRows(await api.artifacts(query)); }
    catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(""); }, []);
  useEffect(() => { setResultsPage(1); }, [q, typeFilter, verificationFilter, brandFilter, sortBy, resultsExpanded, resultsFilterInput]);

  const quickQueries = ["PRO1000", "A2000", "Japan", "Unverified", "Artifact"];
  const requiredP0: Array<"BACK" | "PALM"> = ["BACK", "PALM"];

  function readiness(row: Artifact) {
    const kinds = new Set((row.photos || []).map((p) => p.kind));
    const missing = requiredP0.filter((k) => !kinds.has(k));
    return { p0Ready: missing.length === 0, missing };
  }

  function isVerified(row: Artifact) {
    return String(row.verification_status ?? "").toLowerCase().includes("verified");
  }

  const filtered = rows
    .filter((row) => {
      const query = q.trim().toLowerCase();
      const hay = `${row.id} ${row.brand_key ?? ""} ${row.family ?? ""} ${row.model_code ?? ""} ${row.verification_status ?? ""} ${row.made_in ?? ""}`.toLowerCase();
      const queryOk = query.length === 0 || hay.includes(query);
      if (!queryOk) return false;

      if (typeFilter === "cataloged" && row.object_type !== "CATALOGED_MODEL") return false;
      if (typeFilter === "artifact" && row.object_type !== "ARTIFACT") return false;

      const verified = isVerified(row);
      if (verificationFilter === "verified" && !verified) return false;
      if (verificationFilter === "unverified" && verified) return false;

      if (brandFilter !== "all" && (row.brand_key || "UNKNOWN") !== brandFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "value_desc") return (b.valuation_estimate ?? -1) - (a.valuation_estimate ?? -1);
      if (sortBy === "value_asc") return (a.valuation_estimate ?? Number.MAX_SAFE_INTEGER) - (b.valuation_estimate ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === "condition_desc") return (b.condition_score ?? -1) - (a.condition_score ?? -1);
      return a.id.localeCompare(b.id);
    });

  const total = rows.length;
  const verifiedCount = rows.filter(isVerified).length;
  const p0ReadyCount = rows.filter((row) => readiness(row).p0Ready).length;
  const valuationReadyCount = rows.filter((row) => readiness(row).p0Ready && row.valuation_estimate != null).length;
  const averageEstimate =
    rows.filter((row) => row.valuation_estimate != null).reduce((sum, row) => sum + Number(row.valuation_estimate || 0), 0) /
    Math.max(1, rows.filter((row) => row.valuation_estimate != null).length);
  const seededBrands = useMemo(() => {
    const byKey = new Map<string, BrandConfig>();
    for (const b of FULL_BRAND_SEEDS) byKey.set(b.brand_key, b);
    for (const b of brands) byKey.set(b.brand_key, b);
    return Array.from(byKey.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [brands]);
  const resultAutocompleteOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of filtered) {
      values.add(row.id);
      if (row.brand_key) values.add(row.brand_key);
      if (row.family) values.add(row.family);
      if (row.model_code) values.add(row.model_code);
      if (row.made_in) values.add(row.made_in);
      if (row.verification_status) values.add(String(row.verification_status));
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b)).slice(0, 50);
  }, [filtered]);
  const suggestedResultFilters = resultAutocompleteOptions.slice(0, 6);
  const resultsFilterTerm = resultsFilterInput.trim().toLowerCase();
  const resultsFiltered = filtered.filter((row) => {
    if (!resultsFilterTerm) return true;
    const hay = `${row.id} ${row.brand_key || ""} ${row.family || ""} ${row.model_code || ""} ${row.verification_status || ""} ${row.made_in || ""} ${row.position || ""}`.toLowerCase();
    return hay.includes(resultsFilterTerm);
  });
  const resultsPageSize = 10;
  const resultsCollapsedSize = 5;
  const resultsPageCount = Math.max(1, Math.ceil(resultsFiltered.length / resultsPageSize));
  const visibleResults = resultsExpanded
    ? resultsFiltered.slice((resultsPage - 1) * resultsPageSize, resultsPage * resultsPageSize)
    : resultsFiltered.slice(0, resultsCollapsedSize);
  const brandHierarchy = useMemo(() => {
    const query = q.trim().toLowerCase();
    return seededBrands
      .filter((brand) => (brandFilter === "all" ? true : brand.brand_key === brandFilter))
      .map((brand) => {
        const details = BRAND_COMPANY_INFO[brand.brand_key] || {
          company: `${brand.display_name} Brand Team`,
          contact: "support@brand.example",
        };
        const familyNodes = families
          .filter((family) => family.brand_key === brand.brand_key)
          .map((family) => {
            const familyPatterns = patterns.filter((pattern) => pattern.family_id === family.family_id);
            return { family, patterns: familyPatterns };
          })
          .filter((node) => {
            if (!query) return true;
            const familyHit = `${node.family.display_name} ${node.family.family_key} ${node.family.tier}`.toLowerCase().includes(query);
            const patternHit = node.patterns.some((pattern) =>
              `${pattern.pattern_code} ${pattern.canonical_position} ${pattern.canonical_web || ""}`.toLowerCase().includes(query),
            );
            return familyHit || patternHit;
          });
        const brandHit = `${brand.display_name} ${details.company} ${details.contact} ${brand.country_hint || ""}`.toLowerCase().includes(query);
        if (!brandHit && familyNodes.length === 0) return null;
        return { brand, details, families: familyNodes };
      })
      .filter(Boolean) as BrandHierarchyNode[];
  }, [seededBrands, families, patterns, q, brandFilter]);

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.search")}</Typography>
              <Typography variant="body2" color="text.secondary">High-signal search with verification and valuation gating context.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, "search.placeholder")} aria-label={t(locale, "tab.search")} />
              <Button onClick={() => refresh(q)} sx={{ ...FIGMA_OPEN_BUTTON_SX, minWidth: 74 }}>Search</Button>
              <Button
                color="inherit"
                onClick={() => { setQ(""); refresh(""); }}
                sx={{
                  ...FIGMA_OPEN_BUTTON_SX,
                  minWidth: 66,
                  bgcolor: "transparent",
                  color: "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none !important",
                }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
            {quickQueries.map((qq) => (
              <Chip key={qq} size="small" label={qq} onClick={() => { setQ(qq); refresh(qq); }} clickable />
            ))}
          </Stack>
          <Box sx={{ mt: 1.5, p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "background.paper" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1.1 }}>
              <FormControl size="small" fullWidth>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.4, px: 0.2 }}>Type</Typography>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | "cataloged" | "artifact")}>
                  <MenuItem value="all">All types</MenuItem>
                  <MenuItem value="cataloged">Cataloged only</MenuItem>
                  <MenuItem value="artifact">Artifacts only</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.4, px: 0.2 }}>Verification</Typography>
                <Select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as "all" | "verified" | "unverified")}>
                  <MenuItem value="all">All statuses</MenuItem>
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="unverified">Needs review</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.4, px: 0.2 }}>Brand</Typography>
                <Select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value as "all" | string)}>
                  <MenuItem value="all">Any brand</MenuItem>
                  {seededBrands.map((b) => (
                    <MenuItem key={b.brand_key} value={b.brand_key}>{b.display_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.4, px: 0.2 }}>Sort</Typography>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as "relevance" | "value_desc" | "value_asc" | "condition_desc")}>
                  <MenuItem value="relevance">Sort A-Z</MenuItem>
                  <MenuItem value="value_desc">Value high-low</MenuItem>
                  <MenuItem value="value_asc">Value low-high</MenuItem>
                  <MenuItem value="condition_desc">Condition</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          {loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
          {err ? <Typography sx={{ mt: 2 }} color="error">{err}</Typography> : null}
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Search Snapshot</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.25 }}>
            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Total records</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{total}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Verified</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{verifiedCount}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">P0 evidence ready</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{p0ReadyCount}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Valuation-ready</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{valuationReadyCount}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Avg estimate</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{money(Number.isFinite(averageEstimate) ? averageEstimate : 0)}</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
            <Chip size="small" label={`Families ${families.length}`} />
            <Chip size="small" label={`Patterns ${patterns.length}`} />
          </Stack>
        </CardContent></Card>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "search.results")}</Typography>
            <Chip label={resultsExpanded ? `${visibleResults.length} on page` : `${visibleResults.length} shown`} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.1} sx={{ mb: 1.4 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Autocomplete
                freeSolo
                options={resultAutocompleteOptions}
                inputValue={resultsFilterInput}
                onInputChange={(_event, value) => setResultsFilterInput(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Filter results (type, autocomplete, suggestions)"
                  />
                )}
                sx={{ flex: 1 }}
              />
              <Button color="inherit" sx={FIGMA_OPEN_BUTTON_SX} onClick={() => setResultsFilterInput("")}>
                Clear Filter
              </Button>
            </Stack>
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap" }}>
              {suggestedResultFilters.map((option) => (
                <Chip
                  key={option}
                  size="small"
                  label={option}
                  onClick={() => setResultsFilterInput(option)}
                  clickable
                />
              ))}
              {suggestedResultFilters.length > 0 ? <Chip size="small" label="Suggested" /> : null}
            </Stack>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,0.8fr)", gap: 1, px: 1, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">Artifact</Typography>
            <Typography variant="caption" color="text.secondary">Verification</Typography>
            <Typography variant="caption" color="text.secondary">Valuation</Typography>
            <Typography variant="caption" color="text.secondary" align="right">Action</Typography>
          </Box>
          <Stack spacing={1}>
            {visibleResults.map((a) => {
              const verified = isVerified(a);
              const ready = readiness(a);
              const thumb = a.photos?.[0]?.url || glovePlaceholderImage;
              return (
                <motion.div key={a.id} layout>
                  <Box sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,2.1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,0.8fr)" }, gap: 1.25, alignItems: "center" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Box
                            role="button"
                            tabIndex={0}
                            onClick={() => setPreviewImage({ src: thumb, title: a.id })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setPreviewImage({ src: thumb, title: a.id });
                              }
                            }}
                            sx={{
                              width: 70,
                              height: 52,
                              borderRadius: 1.4,
                              border: "1px solid",
                              borderColor: "divider",
                              flexShrink: 0,
                              position: "relative",
                              overflow: "hidden",
                              cursor: "zoom-in",
                              "&:hover .thumb-overlay": { opacity: 1 },
                            }}
                          >
                            <Box
                              component="img"
                              src={thumb}
                              alt={`${a.id} thumbnail`}
                              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                            <Box
                              className="thumb-overlay"
                              sx={{
                                position: "absolute",
                                inset: 0,
                                display: "grid",
                                placeItems: "center",
                                background: "rgba(15,23,42,0.42)",
                                opacity: { xs: 1, md: 0 },
                                transition: "opacity 140ms ease",
                                color: "#fff",
                              }}
                            >
                              <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                            </Box>
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900 }} noWrap>{a.id}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {(a.brand_key || "Unknown")} • {(a.family || "—")} {(a.model_code || "")} • {(a.size_in ? `${a.size_in}"` : "—")}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          columnGap: { xs: 0.5, md: 0.75 },
                          rowGap: { xs: 0.5, md: 0.75 },
                        }}
                      >
                        <Chip
                          size="small"
                          label={verified ? "Verified" : "Needs review"}
                          sx={{
                            ...FIGMA_TAG_BASE_SX,
                            bgcolor: verified ? alpha("#22C55E", 0.14) : alpha("#F59E0B", 0.16),
                            color: verified ? "#15803D" : "#B45309",
                            border: "1px solid",
                            borderColor: verified ? alpha("#22C55E", 0.34) : alpha("#F59E0B", 0.38),
                          }}
                        />
                        <Chip
                          size="small"
                          label={ready.p0Ready ? "P0 ready" : `Missing ${ready.missing.join(",")}`}
                          sx={{
                            ...FIGMA_TAG_BASE_SX,
                            bgcolor: ready.p0Ready ? alpha("#3B82F6", 0.14) : alpha("#EF4444", 0.14),
                            color: ready.p0Ready ? "#1D4ED8" : "#B91C1C",
                            border: "1px solid",
                            borderColor: ready.p0Ready ? alpha("#3B82F6", 0.34) : alpha("#EF4444", 0.34),
                          }}
                        />
                        <Chip
                          size="small"
                          label={a.object_type === "ARTIFACT" ? "Artifact" : "Cataloged"}
                          sx={{
                            ...FIGMA_TAG_BASE_SX,
                            bgcolor: alpha("#3763E9", 0.12),
                            color: "#314FC7",
                            border: "1px solid",
                            borderColor: alpha("#3763E9", 0.34),
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 900 }}>{a.valuation_estimate != null ? money(a.valuation_estimate) : "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.valuation_low != null && a.valuation_high != null ? `${money(a.valuation_low)}–${money(a.valuation_high)}` : "Range unavailable"}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                        <Button
                          onClick={() => onOpenArtifact(a.id)}
                          sx={FIGMA_OPEN_BUTTON_SX}
                        >
                          Open
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
            {!loading && resultsFiltered.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No records matched your search and filters.</Typography>
            ) : null}
          </Stack>
          {resultsFiltered.length > resultsCollapsedSize ? (
            <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }} alignItems="center">
              <Button
                color="inherit"
                onClick={() => {
                  setResultsExpanded((v) => !v);
                  setResultsPage(1);
                }}
                sx={FIGMA_OPEN_BUTTON_SX}
              >
                {resultsExpanded ? "Collapse" : `Expand (${resultsFiltered.length})`}
              </Button>
              {resultsExpanded && resultsFiltered.length > resultsPageSize ? (
                <>
                  <Button color="inherit" sx={FIGMA_OPEN_BUTTON_SX} disabled={resultsPage <= 1} onClick={() => setResultsPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Chip size="small" label={`Page ${resultsPage} / ${resultsPageCount}`} />
                  <Button
                    color="inherit"
                    sx={FIGMA_OPEN_BUTTON_SX}
                    disabled={resultsPage >= resultsPageCount}
                    onClick={() => setResultsPage((p) => Math.min(resultsPageCount, p + 1))}
                  >
                    Next
                  </Button>
                </>
              ) : null}
            </Stack>
          ) : null}
        </CardContent></Card>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Brand Seeds</Typography>
            <Chip label={`${brandHierarchy.length} shown`} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 1.25 }}>
            {brandHierarchy.map(({ brand, details, families: familyNodes }) => (
              <Box key={brand.brand_key} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 0.6 }}>
                  <Avatar
                    src={brandLogoSrc(details.contact)}
                    imgProps={{ referrerPolicy: "no-referrer" }}
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: "rgba(55,99,233,0.12)",
                      color: "primary.main",
                      border: "1px solid rgba(55,99,233,0.24)",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {brandLogoMark(brand.display_name)}
                  </Avatar>
                  <Typography sx={{ fontWeight: 900 }}>{brand.display_name}</Typography>
                  <Chip size="small" label={`${familyNodes.length} families`} />
                  {familyNodes.length > 0 ? (
                    <Button
                      color="inherit"
                      sx={{ ...FIGMA_OPEN_BUTTON_SX, ml: "auto", minWidth: 0, px: 1.1 }}
                      endIcon={<KeyboardArrowRightIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setBrandDetailOpen({ brand, details, families: familyNodes })}
                    >
                      View
                    </Button>
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">Country hint: {brand.country_hint || "—"}</Typography>
                <Typography variant="body2" color="text.secondary">Company: {details.company}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Contact: {details.contact}</Typography>
                <Stack spacing={1}>
                  {familyNodes.map(({ family, patterns: familyPatterns }) => (
                    <Box key={family.family_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography sx={{ fontWeight: 800 }}>{family.display_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{family.family_key} • {family.tier} • {familyPatterns.length} patterns</Typography>
                    </Box>
                  ))}
                  {familyNodes.length === 0 ? <Typography variant="body2" color="text.secondary">No matching families or patterns.</Typography> : null}
                </Stack>
              </Box>
            ))}
          </Box>
          {brandHierarchy.length === 0 ? <Typography variant="body2" color="text.secondary">No brand seeds match current search.</Typography> : null}
        </CardContent></Card>
        <Dialog
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          maxWidth="md"
          fullWidth
        >
          {previewImage ? (
            <Box sx={{ p: 1.2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                {previewImage!.title}
              </Typography>
              <Box
                component="img"
                src={previewImage!.src}
                alt={`${previewImage!.title} preview`}
                sx={{ width: "100%", borderRadius: 1.5, border: "1px solid", borderColor: "divider", display: "block", maxHeight: "72vh", objectFit: "contain" }}
              />
            </Box>
          ) : null}
        </Dialog>
        <Dialog
          open={Boolean(brandDetailOpen)}
          onClose={() => setBrandDetailOpen(null)}
          maxWidth="lg"
          fullWidth
        >
          {brandDetailOpen ? (
            <Box sx={{ p: 1.4 }}>
              <Stack direction="row" spacing={1.1} alignItems="center">
                <Avatar
                  src={brandLogoSrc(brandDetailOpen!.details.contact)}
                  imgProps={{ referrerPolicy: "no-referrer" }}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "rgba(55,99,233,0.12)",
                    color: "primary.main",
                    border: "1px solid rgba(55,99,233,0.24)",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {brandLogoMark(brandDetailOpen!.brand.display_name)}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                  {brandDetailOpen!.brand.display_name} • Family & Pattern Catalog
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                Country hint: {brandDetailOpen!.brand.country_hint || "—"} • Company: {brandDetailOpen!.details.company} • Contact: {brandDetailOpen!.details.contact}
              </Typography>
              <Divider sx={{ my: 1.4 }} />
              <Stack spacing={1}>
                {brandDetailOpen!.families.map(({ family, patterns: familyPatterns }) => (
                  <Box key={family.family_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.6 }}>
                    <Typography sx={{ fontWeight: 900 }}>{family.display_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {family.family_key} • {family.tier} • {familyPatterns.length} patterns
                    </Typography>
                    <Stack spacing={0.8} sx={{ mt: 1 }}>
                      {familyPatterns.map((pattern) => (
                        <Box key={pattern.pattern_id} sx={{ p: 0.9, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                          <Typography sx={{ fontWeight: 800 }}>{pattern.pattern_code}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {pattern.canonical_position} • {pattern.canonical_size_in ? `${pattern.canonical_size_in}"` : "size n/a"}
                            {pattern.canonical_web ? ` • ${pattern.canonical_web}` : ""}
                          </Typography>
                        </Box>
                      ))}
                      {familyPatterns.length === 0 ? <Typography variant="caption" color="text.secondary">No patterns seeded for this family.</Typography> : null}
                    </Stack>
                  </Box>
                ))}
                {brandDetailOpen!.families.length === 0 ? <Typography variant="body2" color="text.secondary">No families found for this brand.</Typography> : null}
              </Stack>
            </Box>
          ) : null}
        </Dialog>
      </Stack>
    </Container>
  );
}

type AppraisalResult = {
  mode: "MODE_DISABLED" | "MODE_RANGE_ONLY" | "MODE_ESTIMATE_AND_RANGE" | "DEFER_TO_HUMAN";
  reason: string;
  confidenceLabel: "Low" | "Medium" | "High";
  confidenceScore: number;
  brand: string;
  family: string;
  model: string;
  pattern: string;
  size: string;
  throwSide: string;
  web: string;
  leather: string;
  madeIn: string;
  valuation: { point: number | null; low: number | null; high: number | null };
  compsUsed: number;
  salesSource: "variant" | "brand_fallback" | "insufficient";
  requiredPhotosPresent: boolean;
  p1PhotoCount: number;
  requestedRoles: string[];
  needsMoreInputMessage: string;
  qualityIssues: string[];
  photoRoles: Array<{ name: string; role: string; usable: boolean }>;
  recommendation?: {
    suggestedListPrice: number | null;
    liquidityScore: number;
    compareAgainst: Array<{ sale_id: string; variant_id: string; price_usd: number; sale_date: string; source: string }>;
    vectorNeighbors: Array<{ variant_id: string; score: number; model_code?: string | null; brand_key?: string | null }>;
  };
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((v) => v.trim())
    .filter((v) => v.length >= 2);
}

function confidenceLabelFromScore(score: number): "Low" | "Medium" | "High" {
  if (score >= 0.78) return "High";
  if (score >= 0.52) return "Medium";
  return "Low";
}

type AppraisalMode =
  | "MODE_DISABLED"
  | "MODE_RANGE_ONLY"
  | "MODE_ESTIMATE_AND_RANGE"
  | "DEFER_TO_HUMAN";

type AppraisalModeInput = {
  idConfidence: number;
  variantConfirmed: boolean;
  conditionConfidence: number;
  compsCount: number;
  requiredPhotosPresent: boolean;
  conflictingBrandSignals: boolean;
};

function determineAppraisalMode(input: AppraisalModeInput): { mode: AppraisalMode; reason: string } {
  if (input.idConfidence < 0.5) {
    return { mode: "DEFER_TO_HUMAN", reason: "Low ID confidence (<0.50)." };
  }
  if (input.conflictingBrandSignals) {
    return { mode: "MODE_DISABLED", reason: "Conflicting brand signals detected in evidence." };
  }
  if (!input.requiredPhotosPresent || input.compsCount < 5) {
    return { mode: "MODE_DISABLED", reason: "Insufficient evidence (P0 photos) or comps (<5)." };
  }
  if (
    input.idConfidence >= 0.85 &&
    input.variantConfirmed &&
    input.compsCount >= 12 &&
    input.conditionConfidence >= 0.75
  ) {
    return { mode: "MODE_ESTIMATE_AND_RANGE", reason: "High confidence with strong comps and condition confidence." };
  }
  return { mode: "MODE_RANGE_ONLY", reason: "Moderate confidence and/or limited comps." };
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function familyLabelFromId(familyId: string | null) {
  if (!familyId) return "Unknown";
  return familyId.replace(/^fam_/, "").replace(/_/g, " ");
}

function pseudoScore(seed: string) {
  let out = 0;
  for (let i = 0; i < seed.length; i += 1) out = (out * 31 + seed.charCodeAt(i)) % 1000003;
  return out;
}

function classifyPhotoRole(name: string) {
  const n = name.toLowerCase();
  if (/\bpalm|pocket\b/.test(n)) return "PALM";
  if (/\bback|backhand\b/.test(n)) return "BACK";
  if (/\bliner|inside|interior\b/.test(n)) return "LINER";
  if (/\bwrist|patch\b/.test(n)) return "WRIST_PATCH";
  if (/\bstamp|emboss|serial|logo\b/.test(n)) return "STAMPS";
  if (/\bheel\b/.test(n)) return "HEEL";
  if (/\bthumb\b/.test(n)) return "THUMB_SIDE";
  if (/\bpinky\b/.test(n)) return "PINKY_LOOP";
  return "OTHER";
}

function qualityForFile(file: File) {
  const s = pseudoScore(`${file.name}_${file.size}`);
  const blurScore = (s % 100) / 100;
  const glareScore = (Math.floor(s / 13) % 100) / 100;
  const cropScore = (Math.floor(s / 97) % 100) / 100;
  const issues: string[] = [];
  if (blurScore > 0.65) issues.push("blur");
  if (glareScore > 0.7) issues.push("glare");
  if (cropScore > 0.7) issues.push("crop");
  return { blurScore, glareScore, cropScore, usable: issues.length === 0, issues };
}

function detectPhotoRoleCoverage(files: File[]) {
  const rolePredictions = files.map((file) => {
    const role = classifyPhotoRole(file.name);
    const quality = qualityForFile(file);
    return { file, role, quality };
  });
  const presentUsable = new Set(rolePredictions.filter((r) => r.quality.usable).map((r) => r.role));
  const requiredRoles = ["BACK", "PALM"];
  const recommendedRoles = ["LINER", "WRIST_PATCH", "STAMPS"];
  const missingP0 = requiredRoles.filter((role) => !presentUsable.has(role));
  const missingP1 = recommendedRoles.filter((role) => !presentUsable.has(role));
  const requestedRoles = missingP0.length > 0 ? missingP0 : missingP1;
  const message = missingP0.length > 0
    ? `Please add: ${missingP0.join(", ")} to unlock appraisal.`
    : missingP1.length > 0
      ? `Recommended: ${missingP1.join(", ")} for tighter confidence.`
      : "All recommended photo roles provided.";
  return {
    requiredPhotosPresent: missingP0.length === 0,
    p1Count: recommendedRoles.length - missingP1.length,
    requestedRoles,
    message,
    qualityIssues: rolePredictions.flatMap((r) => r.quality.issues.map((issue) => `${r.file.name}:${issue}`)),
    photoRoles: rolePredictions.map((r) => ({ name: r.file.name, role: r.role, usable: r.quality.usable })),
    hasLinerUsable: presentUsable.has("LINER"),
  };
}

function detectConflictingBrands(evidenceTokens: Set<string>) {
  const matched = FULL_BRAND_SEEDS.filter((brand) => {
    const key = brand.brand_key.toLowerCase();
    const displayParts = brand.display_name.toLowerCase().split(/\s+/);
    return evidenceTokens.has(key) || displayParts.some((part) => part.length > 2 && evidenceTokens.has(part));
  });
  return matched.length > 1;
}

function inferAppraisalFromEvidence({
  files,
  hint,
  variants,
  sales,
}: {
  files: File[];
  hint: string;
  variants: VariantRecord[];
  sales: SaleRecord[];
}): AppraisalResult {
  const evidenceTokens = tokenize(`${hint} ${files.map((f) => f.name).join(" ")}`);
  const evidenceSet = new Set(evidenceTokens);

  const scoredVariants = variants.map((variant) => {
    const variantTokens = new Set(
      tokenize(
        [
          variant.variant_id,
          variant.brand_key,
          variant.display_name,
          variant.model_code || "",
          variant.pattern_id || "",
          variant.family_id || "",
          variant.web || "",
          variant.leather || "",
          variant.made_in || "",
          String(variant.year || ""),
        ].join(" "),
      ),
    );
    let score = 0;
    for (const token of evidenceSet) {
      if (variantTokens.has(token)) score += token.length >= 4 ? 2 : 1;
      if ((variant.model_code || "").toLowerCase() === token) score += 3;
      if ((variant.brand_key || "").toLowerCase() === token) score += 2;
    }
    if (evidenceSet.size === 0) score = 0;
    return { variant, score };
  }).sort((a, b) => b.score - a.score);

  const top = scoredVariants[0];
  const second = scoredVariants[1];
  const margin = Math.max(0, (top?.score || 0) - (second?.score || 0));
  const photoFactor = Math.min(0.28, files.length * 0.06);
  const scoreFactor = Math.min(0.5, (top?.score || 0) * 0.035);
  const marginFactor = Math.min(0.2, margin * 0.035);
  const confidenceScore = Math.max(0.08, Math.min(0.97, 0.16 + photoFactor + scoreFactor + marginFactor));
  const confidenceLabel = confidenceLabelFromScore(confidenceScore);
  const roleCoverage = detectPhotoRoleCoverage(files);
  const conflictingBrandSignals = detectConflictingBrands(evidenceSet);

  const matched = top?.variant;
  const needsReview = !matched || files.length < 2 || (top?.score || 0) < 2 || confidenceLabel === "Low";
  if (!matched) {
    return {
      mode: "DEFER_TO_HUMAN",
      reason: "No viable variant candidate found from current photo evidence.",
      confidenceLabel: "Low",
      confidenceScore: 0.1,
      brand: "Unknown",
      family: "Unknown",
      model: "Unknown",
      pattern: "Unknown",
      size: "Unknown",
      throwSide: "Unknown",
      web: "Unknown",
      leather: "Unknown",
      madeIn: "Unknown",
      valuation: { point: null, low: null, high: null },
      compsUsed: 0,
      salesSource: "insufficient",
      requiredPhotosPresent: roleCoverage.requiredPhotosPresent,
      p1PhotoCount: roleCoverage.p1Count,
      requestedRoles: roleCoverage.requestedRoles,
      needsMoreInputMessage: roleCoverage.message,
      qualityIssues: roleCoverage.qualityIssues,
      photoRoles: roleCoverage.photoRoles,
    };
  }

  const directSales = sales.filter((s) => s.variant_id === matched.variant_id).map((s) => s.price_usd);
  const brandSales = sales.filter((s) => s.brand_key === matched.brand_key).map((s) => s.price_usd);
  const pricingSource = directSales.length >= 3 ? directSales : brandSales;
  const salesSource: AppraisalResult["salesSource"] = directSales.length >= 3 ? "variant" : brandSales.length >= 4 ? "brand_fallback" : "insufficient";
  const point = pricingSource.length ? Math.round(median(pricingSource)) : (matched.msrp_usd || 320);
  const p20 = pricingSource.length ? Math.round(percentile(pricingSource, 0.2)) : Math.round(point * 0.78);
  const p80 = pricingSource.length ? Math.round(percentile(pricingSource, 0.8)) : Math.round(point * 1.22);
  const spreadAdj = confidenceLabel === "High" ? 0.9 : confidenceLabel === "Medium" ? 1.08 : 1.22;
  const low = Math.max(60, Math.round(p20 / spreadAdj));
  const high = Math.round(p80 * spreadAdj);
  const variantConfirmed = (top?.score || 0) >= 5 && margin >= 2;
  const conditionConfidenceRaw = Math.max(0.4, Math.min(0.95, 0.52 + files.length * 0.05 + roleCoverage.p1Count * 0.06));
  const conditionConfidence = roleCoverage.hasLinerUsable ? conditionConfidenceRaw : Math.min(0.75, conditionConfidenceRaw);
  const route = determineAppraisalMode({
    idConfidence: confidenceScore,
    variantConfirmed,
    conditionConfidence,
    compsCount: pricingSource.length,
    requiredPhotosPresent: roleCoverage.requiredPhotosPresent,
    conflictingBrandSignals,
  });
  const showPoint = route.mode === "MODE_ESTIMATE_AND_RANGE";
  const showRange = route.mode === "MODE_RANGE_ONLY" || route.mode === "MODE_ESTIMATE_AND_RANGE";
  const forceUnknownIdentity = route.mode === "DEFER_TO_HUMAN";

  return {
    mode: route.mode,
    reason: needsReview && route.mode === "MODE_RANGE_ONLY"
      ? "Evidence remains ambiguous; range only until clearer identity cues are provided."
      : route.reason,
    confidenceLabel,
    confidenceScore,
    brand: forceUnknownIdentity ? "Unknown" : matched.brand_key,
    family: forceUnknownIdentity ? "Unknown" : familyLabelFromId(matched.family_id),
    model: forceUnknownIdentity ? "Unknown" : (matched.model_code || matched.display_name),
    pattern: forceUnknownIdentity ? "Unknown" : (matched.pattern_id || "Unknown"),
    size: forceUnknownIdentity ? "Unknown" : (matched.display_name.match(/\b(1[01-3]\.\d)\b/)?.[1] ? `${matched.display_name.match(/\b(1[01-3]\.\d)\b/)?.[1]}"` : "Unknown"),
    throwSide: forceUnknownIdentity ? "Unknown" : (/-lht\b/i.test(matched.variant_id) ? "LHT" : /-rht\b/i.test(matched.variant_id) ? "RHT" : "Unknown"),
    web: forceUnknownIdentity ? "Unknown" : (matched.web || "Unknown"),
    leather: forceUnknownIdentity ? "Unknown" : (matched.leather || "Unknown"),
    madeIn: forceUnknownIdentity ? "Unknown" : (matched.made_in || "Unknown"),
    valuation: {
      point: showPoint ? point : null,
      low: showRange ? low : null,
      high: showRange ? high : null,
    },
    compsUsed: pricingSource.length,
    salesSource,
    requiredPhotosPresent: roleCoverage.requiredPhotosPresent,
    p1PhotoCount: roleCoverage.p1Count,
    requestedRoles: roleCoverage.requestedRoles,
    needsMoreInputMessage: roleCoverage.message,
    qualityIssues: roleCoverage.qualityIssues,
    photoRoles: roleCoverage.photoRoles,
  };
}

function AppraisalIntakeWidget({ locale }: { locale: Locale }) {
  const [files, setFiles] = useState<File[]>([]);
  const [analysisHint, setAnalysisHint] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [uploadReceipts, setUploadReceipts] = useState<Array<{ name: string; photoId: string; deduped: boolean }>>([]);
  const [result, setResult] = useState<AppraisalResult | null>(null);
  const [stageOutput, setStageOutput] = useState<Record<string, any> | null>(null);

  async function analyze() {
    if (!files.length) return;
    setAnalyzing(true);
    setAnalysisErr(null);
    setResult(null);
    try {
      const out = await api.appraisalAnalyze(files, analysisHint);
      setUploadReceipts(out.uploads);
      setResult(out.appraisal as AppraisalResult);
      setStageOutput(out.stages || null);
    } catch (e: any) {
      const fallbackErr = String(e?.message || e);
      setAnalysisErr(`${fallbackErr} Falling back to local heuristic.`);
      try {
        const [variants, sales] = await Promise.all([api.variants(), api.sales()]);
        const uploaded = await Promise.all(
          files.map(async (file) => {
            const u = await api.uploadPhoto(file);
            return { name: file.name, photoId: u.photo_id, deduped: u.deduped };
          }),
        );
        setUploadReceipts(uploaded);
        setResult(inferAppraisalFromEvidence({ files, hint: analysisHint, variants, sales }));
        setStageOutput(null);
      } catch {
        // keep original error
      }
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Instant Appraisal</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Upload multiple glove photos and GloveIQ returns glove specifications and appraised market value in one pass.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1.2}>
          <TextField
            size="small"
            label="Optional hint (brand/model/pattern)"
            placeholder="e.g. Rawlings PRO204 H-Web"
            value={analysisHint}
            onChange={(e) => setAnalysisHint(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="Upload glove photos"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip size="small" label={`${files.length} selected`} />
            {files.slice(0, 5).map((f) => <Chip key={f.name} size="small" label={f.name} />)}
            {files.length > 5 ? <Chip size="small" label={`+${files.length - 5} more`} /> : null}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button onClick={analyze} disabled={!files.length || analyzing}>
              {analyzing ? "Analyzing..." : "Analyze Glove"}
            </Button>
            <Button color="inherit" onClick={() => { setFiles([]); setUploadReceipts([]); setResult(null); setAnalysisErr(null); setAnalysisHint(""); setStageOutput(null); }}>
              Reset
            </Button>
          </Stack>
          {analyzing ? <LinearProgress /> : null}
          {analysisErr ? <Typography color="error">{analysisErr}</Typography> : null}
        </Stack>
      </CardContent></Card>

      {uploadReceipts.length > 0 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Uploaded Photos</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={0.8}>
            {uploadReceipts.map((r) => (
              <Box key={`${r.name}_${r.photoId}`} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.name}</Typography>
                <Typography variant="caption" color="text.secondary">{r.photoId} • {r.deduped ? "Deduped" : "Uploaded"}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent></Card>
      ) : null}

      {result ? (
        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>GloveIQ Appraisal Result</Typography>
            <Chip
              label={`Confidence: ${result.confidenceLabel} (${Math.round(result.confidenceScore * 100)}%)`}
              color={result.confidenceLabel === "High" ? "success" : result.confidenceLabel === "Medium" ? "warning" : "default"}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 0.6, flexWrap: "wrap" }}>
            <Chip size="small" label={result.mode} color={result.mode === "MODE_ESTIMATE_AND_RANGE" ? "success" : result.mode === "MODE_RANGE_ONLY" ? "warning" : "default"} />
            <Chip size="small" label={`P0 photos: ${result.requiredPhotosPresent ? "OK" : "Missing"}`} color={result.requiredPhotosPresent ? "success" : "warning"} />
            <Chip size="small" label={`P1 photos: ${result.p1PhotoCount}/3`} />
          </Stack>
          <Typography variant="body2" color={result.mode === "DEFER_TO_HUMAN" ? "warning.main" : "text.secondary"} sx={{ mt: 0.8 }}>
            {result.reason}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.6 }}>
            {result.needsMoreInputMessage}
          </Typography>
          {result.requestedRoles.length ? (
            <Stack direction="row" spacing={0.8} sx={{ mt: 0.7, flexWrap: "wrap" }}>
              {result.requestedRoles.map((role) => <Chip key={role} size="small" label={`Need ${role}`} color="warning" />)}
            </Stack>
          ) : null}
          {result.qualityIssues.length ? (
            <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.7 }}>
              Quality flags: {result.qualityIssues.slice(0, 6).join(", ")}{result.qualityIssues.length > 6 ? "…" : ""}
            </Typography>
          ) : null}
          <Divider sx={{ my: 1.8 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.1 }}>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Brand</Typography><Typography sx={{ fontWeight: 800 }}>{result.brand}</Typography></Box>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Family</Typography><Typography sx={{ fontWeight: 800 }}>{result.family}</Typography></Box>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Model</Typography><Typography sx={{ fontWeight: 800 }}>{result.model}</Typography></Box>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Pattern</Typography><Typography sx={{ fontWeight: 800 }}>{result.pattern}</Typography></Box>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Size / Throw</Typography><Typography sx={{ fontWeight: 800 }}>{result.size} • {result.throwSide}</Typography></Box>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Web / Leather</Typography><Typography sx={{ fontWeight: 800 }}>{result.web} • {result.leather}</Typography></Box>
            <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">Made In</Typography><Typography sx={{ fontWeight: 800 }}>{result.madeIn}</Typography></Box>
          </Box>
          <Divider sx={{ my: 1.8 }} />
          <Typography variant="caption" color="text.secondary">Appraised market value</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {result.valuation.low != null && result.valuation.high != null ? `${money(result.valuation.low)} – ${money(result.valuation.high)}` : "Valuation unavailable"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Point estimate: {result.valuation.point != null ? money(result.valuation.point) : "Not available in current mode"}
          </Typography>
          <Typography variant="caption" color="text.secondary">Comps used: {result.compsUsed} • Source: {result.salesSource}</Typography>
          {result.recommendation ? (
            <>
              <Divider sx={{ my: 1.8 }} />
              <Typography variant="caption" color="text.secondary">Market recommendation</Typography>
              <Typography sx={{ fontWeight: 900 }}>
                Suggested list price: {result.recommendation.suggestedListPrice != null ? money(result.recommendation.suggestedListPrice) : "Not available"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Liquidity score: {result.recommendation.liquidityScore}/100
              </Typography>
              <Stack spacing={0.7} sx={{ mt: 1 }}>
                {result.recommendation.compareAgainst.slice(0, 5).map((comp) => (
                  <Box key={comp.sale_id} sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{comp.sale_id}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {comp.variant_id} • {money(comp.price_usd)} • {comp.sale_date} • {comp.source}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </>
          ) : null}
          <Divider sx={{ my: 1.8 }} />
          <Typography variant="caption" color="text.secondary">Photo role classification</Typography>
          <Stack spacing={0.7} sx={{ mt: 0.8 }}>
            {result.photoRoles.map((photo) => (
              <Box key={photo.name} sx={{ p: 0.85, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{photo.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {photo.role} • {photo.usable ? "Usable" : "Needs re-upload"}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent></Card>
      ) : null}

      {stageOutput ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Service Layer Output</Typography>
          <Divider sx={{ my: 1.3 }} />
          <Box
            component="pre"
            sx={{
              p: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.25,
              bgcolor: "background.default",
              fontSize: 11,
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            {JSON.stringify(stageOutput, null, 2)}
          </Box>
        </CardContent></Card>
      ) : null}
    </Stack>
  );
}

function ArtifactsScreen({ locale, onOpenArtifact }: { locale: Locale; onOpenArtifact: (id: string) => void; }) {
  const [rows, setRows] = useState<Artifact[]>([]);
  const [brandRows, setBrandRows] = useState<BrandConfig[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRecord[]>([]);
  const [familyRows, setFamilyRows] = useState<FamilyRecord[]>([]);
  const [patternRows, setPatternRows] = useState<PatternRecord[]>([]);
  const [compRows, setCompRows] = useState<CompRecord[]>([]);
  const [saleRows, setSaleRows] = useState<SaleRecord[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "verified" | "unverified">("all");
  const [objectTypeFilter, setObjectTypeFilter] = useState<"all" | "ARTIFACT" | "CATALOGED_MODEL">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [hasValuationFilter, setHasValuationFilter] = useState<"all" | "yes" | "no">("all");
  const [hasPhotosFilter, setHasPhotosFilter] = useState<"all" | "yes" | "no">("all");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [valuationMin, setValuationMin] = useState("");
  const [valuationMax, setValuationMax] = useState("");
  const [conditionMin, setConditionMin] = useState("");
  const [compMethodFilter, setCompMethodFilter] = useState<string>("all");
  const [compMinSales, setCompMinSales] = useState("");
  const [salesBrandFilter, setSalesBrandFilter] = useState<string>("all");
  const [salesSourceFilter, setSalesSourceFilter] = useState<string>("all");
  const [salesReferralFilter, setSalesReferralFilter] = useState<"all" | "referral" | "direct">("all");
  const [salesMinPrice, setSalesMinPrice] = useState("");
  const [salesMaxPrice, setSalesMaxPrice] = useState("");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [madeInFilter, setMadeInFilter] = useState<string>("all");
  const [leatherFilter, setLeatherFilter] = useState<string>("all");
  const [webFilter, setWebFilter] = useState<string>("all");
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "catalog" | "verification">("catalog");
  const [artifactExpanded, setArtifactExpanded] = useState(false);
  const [artifactPage, setArtifactPage] = useState(1);
  const [compsExpanded, setCompsExpanded] = useState(false);
  const [compsPage, setCompsPage] = useState(1);
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [thumbByArtifactId, setThumbByArtifactId] = useState<Record<string, string>>({});
  const [variantBrandDetailOpen, setVariantBrandDetailOpen] = useState<BrandHierarchyNode | null>(null);
  const [variantPreviewImage, setVariantPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [verificationStep, setVerificationStep] = useState(0);
  const [submittedVerificationSummary, setSubmittedVerificationSummary] = useState<Record<string, unknown> | null>(null);
  const [listingLink, setListingLink] = useState("");
  const [evidenceChecklist, setEvidenceChecklist] = useState({
    palm: false,
    back: false,
    web: false,
    heelStamp: false,
    linerStamp: false,
  });
  const [identityInput, setIdentityInput] = useState({
    brand: "",
    model: "",
    pattern: "",
    size: "",
    throwSide: "",
    web: "",
  });
  const [provenanceInput, setProvenanceInput] = useState({
    origin: "",
    era: "",
    leather: "",
    stampPatch: "",
  });
  const [conditionInput, setConditionInput] = useState({
    relaced: false,
    repairs: false,
    palmIntegrity: 55,
    structureRetention: 62,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh(query?: string) {
    setLoading(true); setErr(null);
    try {
      setRows(await api.artifacts(query, { photoMode: "none" }));
      setThumbByArtifactId({});
    }
    catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(""); }, []);
  useEffect(() => {
    api.brands().then(setBrandRows).catch(() => setBrandRows([]));
    api.variants().then(setVariantRows).catch(() => setVariantRows([]));
    api.families().then(setFamilyRows).catch(() => setFamilyRows([]));
    api.patterns().then(setPatternRows).catch(() => setPatternRows([]));
    api.comps().then(setCompRows).catch(() => setCompRows([]));
    api.sales().then(setSaleRows).catch(() => setSaleRows([]));
  }, []);

  const topSearchOptions = useMemo(() => {
    const pool = new Set<string>();
    for (const row of rows) {
      if (row.brand_key) pool.add(`Brand • ${row.brand_key}`);
      if (row.family) pool.add(`Line • ${row.family}`);
      if (row.model_code) pool.add(`Artifact • ${row.model_code}`);
      pool.add(`Artifact • ${row.id}`);
    }
    for (const pattern of patternRows) pool.add(`Pattern • ${pattern.pattern_code}`);
    for (const variant of variantRows) pool.add(`Variant • ${variant.display_name}`);
    return Array.from(pool).sort((a, b) => a.localeCompare(b)).slice(0, 200);
  }, [rows, patternRows, variantRows]);

  const toNumber = (value: string) => {
    const raw = value.trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const sizeMinValue = toNumber(sizeMin);
  const sizeMaxValue = toNumber(sizeMax);
  const valuationMinValue = toNumber(valuationMin);
  const valuationMaxValue = toNumber(valuationMax);
  const conditionMinValue = toNumber(conditionMin);
  const compMinSalesValue = toNumber(compMinSales);
  const salesMinPriceValue = toNumber(salesMinPrice);
  const salesMaxPriceValue = toNumber(salesMaxPrice);

  const artifactBrandOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.brand_key || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const artifactPositionOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.position || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const artifactSourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map((r) => {
            const source = String(r.id || "").split(":")[0];
            return source || "UNKNOWN";
          }),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const compMethodOptions = useMemo(
    () => Array.from(new Set(compRows.map((c) => c.method || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [compRows],
  );
  const salesBrandOptions = useMemo(
    () => Array.from(new Set(saleRows.map((s) => s.brand_key || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [saleRows],
  );
  const salesSourceOptions = useMemo(
    () => Array.from(new Set(saleRows.map((s) => s.source || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [saleRows],
  );
  const madeInOptions = useMemo(
    () => Array.from(new Set(variantRows.map((v) => v.made_in || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [variantRows],
  );
  const leatherOptions = useMemo(
    () => Array.from(new Set(variantRows.map((v) => v.leather || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [variantRows],
  );
  const webOptions = useMemo(
    () => Array.from(new Set(variantRows.map((v) => v.web || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [variantRows],
  );
  const variantBrandHierarchy: BrandHierarchyNode[] = brandRows
    .map((brand) => {
      const relatedFamilies = familyRows.filter((family) => family.brand_key === brand.brand_key);
      const withPatterns = relatedFamilies.map((family) => ({
        family,
        patterns: patternRows.filter((pattern) => pattern.family_id === family.family_id),
      }));
      return {
        brand,
        details: BRAND_COMPANY_INFO[brand.brand_key] || { company: brand.display_name, contact: "Contact unavailable" },
        families: withPatterns,
      };
    })
    .filter((entry) => entry.families.length > 0 || brandRows.some((b) => b.brand_key === entry.brand.brand_key));
  const brandListingRows = useMemo(
    () =>
      artifactBrandOptions
        .map((brand) => {
          const artifactsForBrand = rows.filter((row) => (row.brand_key || "Unknown") === brand);
          const linesForBrand = familyRows.filter((line) => line.brand_key === brand);
          const firstArtifact = artifactsForBrand[0];
          return {
            brand,
            artifactCount: artifactsForBrand.length,
            lineCount: linesForBrand.length,
            firstArtifactId: firstArtifact?.id || null,
          };
        })
        .filter((entry) => {
          if (!q.trim()) return true;
          const query = q.trim().toLowerCase();
          return `${entry.brand} ${entry.artifactCount} ${entry.lineCount}`.toLowerCase().includes(query);
        }),
    [artifactBrandOptions, rows, familyRows, q],
  );
  const filteredPatterns = patternRows
    .filter((p) => {
      const query = q.trim().toLowerCase();
      const queryOk = !query || `${p.pattern_id} ${p.pattern_code} ${p.canonical_position} ${p.pattern_system}`.toLowerCase().includes(query);
      if (!queryOk) return false;
      if (brandFilter !== "all" && p.brand_key !== brandFilter) return false;
      return true;
    })
    .slice(0, 20);

  const normalizeModelToken = (value: string | null | undefined) =>
    String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  const filteredArtifacts = rows.filter((row) => {
    const query = q.trim().toLowerCase();
    const hay = `${row.id} ${row.brand_key ?? ""} ${row.family ?? ""} ${row.model_code ?? ""} ${row.verification_status ?? ""}`.toLowerCase();
    const queryOk = query.length === 0 || hay.includes(query);
    if (!queryOk) return false;
    const isVerified = String(row.verification_status ?? "").toLowerCase().includes("verified");
    if (status === "verified" && !isVerified) return false;
    if (status === "unverified" && isVerified) return false;

    if (objectTypeFilter !== "all" && row.object_type !== objectTypeFilter) return false;
    if (brandFilter !== "all" && (row.brand_key || "Unknown") !== brandFilter) return false;
    if (positionFilter !== "all" && (row.position || "Unknown") !== positionFilter) return false;

    const rowSource = String(row.id || "").split(":")[0] || "UNKNOWN";
    if (sourceFilter !== "all" && rowSource !== sourceFilter) return false;

    const hasValuation = row.valuation_estimate != null;
    if (hasValuationFilter === "yes" && !hasValuation) return false;
    if (hasValuationFilter === "no" && hasValuation) return false;

    const hasPhotos = Boolean(row.photos?.length);
    if (hasPhotosFilter === "yes" && !hasPhotos) return false;
    if (hasPhotosFilter === "no" && hasPhotos) return false;

    if (sizeMinValue != null && (row.size_in == null || row.size_in < sizeMinValue)) return false;
    if (sizeMaxValue != null && (row.size_in == null || row.size_in > sizeMaxValue)) return false;
    if (valuationMinValue != null && (row.valuation_estimate == null || row.valuation_estimate < valuationMinValue)) return false;
    if (valuationMaxValue != null && (row.valuation_estimate == null || row.valuation_estimate > valuationMaxValue)) return false;
    if (conditionMinValue != null && (row.condition_score == null || row.condition_score < conditionMinValue)) return false;

    return true;
  });
  const artifactsByVariant = useMemo(() => {
    const index = new Map<string, Artifact[]>();
    for (const row of filteredArtifacts) {
      const key = `${row.brand_key || "Unknown"}|${normalizeModelToken(row.model_code)}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key)?.push(row);
    }
    const out = new Map<string, Artifact[]>();
    for (const variant of variantRows) {
      const key = `${variant.brand_key || "Unknown"}|${normalizeModelToken(variant.model_code)}`;
      out.set(variant.variant_id, index.get(key) || []);
    }
    return out;
  }, [filteredArtifacts, variantRows]);

  const yearMinValue = toNumber(yearMin);
  const yearMaxValue = toNumber(yearMax);
  const filteredVariants = variantRows
    .filter((v) => {
      const query = q.trim().toLowerCase();
      const queryOk = !query || `${v.display_name} ${v.variant_id} ${v.model_code || ""} ${v.brand_key} ${v.year}`.toLowerCase().includes(query);
      if (!queryOk) return false;
      if (brandFilter !== "all" && v.brand_key !== brandFilter) return false;
      if (yearMinValue != null && v.year < yearMinValue) return false;
      if (yearMaxValue != null && v.year > yearMaxValue) return false;
      if (madeInFilter !== "all" && (v.made_in || "Unknown") !== madeInFilter) return false;
      if (leatherFilter !== "all" && (v.leather || "Unknown") !== leatherFilter) return false;
      if (webFilter !== "all" && (v.web || "Unknown") !== webFilter) return false;
      if (selectedPatternId && v.pattern_id !== selectedPatternId) return false;

      const related = artifactsByVariant.get(v.variant_id) || [];
      if (status !== "all") {
        const hasVerified = related.some((r) => String(r.verification_status ?? "").toLowerCase().includes("verified"));
        if (status === "verified" && !hasVerified) return false;
        if (status === "unverified" && hasVerified && related.length > 0) return false;
      }
      if (objectTypeFilter !== "all" && !related.some((r) => r.object_type === objectTypeFilter)) return false;
      if (positionFilter !== "all" && !related.some((r) => (r.position || "Unknown") === positionFilter)) return false;
      if (sourceFilter !== "all" && !related.some((r) => (String(r.id || "").split(":")[0] || "UNKNOWN") === sourceFilter)) return false;

      const hasValuation = related.some((r) => r.valuation_estimate != null);
      if (hasValuationFilter === "yes" && !hasValuation) return false;
      if (hasValuationFilter === "no" && hasValuation) return false;
      const hasPhotos = related.some((r) => Boolean(r.photos?.length));
      if (hasPhotosFilter === "yes" && !hasPhotos) return false;
      if (hasPhotosFilter === "no" && hasPhotos) return false;
      if (sizeMinValue != null && !related.some((r) => r.size_in != null && r.size_in >= sizeMinValue)) return false;
      if (sizeMaxValue != null && !related.some((r) => r.size_in != null && r.size_in <= sizeMaxValue)) return false;
      if (valuationMinValue != null && !related.some((r) => r.valuation_estimate != null && r.valuation_estimate >= valuationMinValue)) return false;
      if (valuationMaxValue != null && !related.some((r) => r.valuation_estimate != null && r.valuation_estimate <= valuationMaxValue)) return false;
      if (conditionMinValue != null && !related.some((r) => r.condition_score != null && r.condition_score >= conditionMinValue)) return false;
      return true;
    })
    .sort((a, b) => b.year - a.year);
  const filteredComps = compRows
    .filter((c) => {
      const query = q.trim().toLowerCase();
      const queryOk = !query || `${c.comp_set_id} ${c.artifact_id} ${c.method}`.toLowerCase().includes(query);
      if (!queryOk) return false;
      if (compMethodFilter !== "all" && c.method !== compMethodFilter) return false;
      if (compMinSalesValue != null && c.sales_ids.length < compMinSalesValue) return false;
      return true;
    })
    .sort((a, b) => b.sales_ids.length - a.sales_ids.length);
  const filteredSales = saleRows
    .filter((s) => {
      const query = q.trim().toLowerCase();
      const queryOk = !query || `${s.sale_id} ${s.variant_id} ${s.brand_key} ${s.source}`.toLowerCase().includes(query);
      if (!queryOk) return false;
      if (salesBrandFilter !== "all" && s.brand_key !== salesBrandFilter) return false;
      if (salesSourceFilter !== "all" && s.source !== salesSourceFilter) return false;
      if (salesReferralFilter === "referral" && !s.is_referral) return false;
      if (salesReferralFilter === "direct" && s.is_referral) return false;
      if (salesMinPriceValue != null && s.price_usd < salesMinPriceValue) return false;
      if (salesMaxPriceValue != null && s.price_usd > salesMaxPriceValue) return false;
      if (salesDateFrom && s.sale_date < salesDateFrom) return false;
      if (salesDateTo && s.sale_date > salesDateTo) return false;
      return true;
    })
    .sort((a, b) => b.sale_date.localeCompare(a.sale_date));

  const collapsedSize = 5;
  const pageSize = 20;
  const artifactPageCount = Math.max(1, Math.ceil(filteredVariants.length / pageSize));
  const compsPageCount = Math.max(1, Math.ceil(filteredComps.length / pageSize));
  const salesPageCount = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const visibleArtifacts = artifactExpanded
    ? filteredVariants.slice((artifactPage - 1) * pageSize, artifactPage * pageSize)
    : filteredVariants.slice(0, collapsedSize);
  const visibleComps = compsExpanded
    ? filteredComps.slice((compsPage - 1) * pageSize, compsPage * pageSize)
    : filteredComps.slice(0, collapsedSize);
  const visibleSales = salesExpanded
    ? filteredSales.slice((salesPage - 1) * pageSize, salesPage * pageSize)
    : filteredSales.slice(0, collapsedSize);

  useEffect(() => {
    const neededIds = visibleArtifacts
      .map((variant) => (artifactsByVariant.get(variant.variant_id) || [])[0]?.id)
      .filter((id): id is string => Boolean(id))
      .filter((id) => !thumbByArtifactId[id]);
    if (!neededIds.length) return;

    let cancelled = false;
    Promise.all(
      neededIds.map(async (id) => {
        try {
          const detail = await api.artifact(id);
          const thumb = detail.photos?.[0]?.url;
          return thumb ? { id, thumb } : null;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const updates = results.filter((entry): entry is { id: string; thumb: string } => Boolean(entry));
      if (!updates.length) return;
      setThumbByArtifactId((prev) => {
        const next = { ...prev };
        for (const item of updates) next[item.id] = item.thumb;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [visibleArtifacts, artifactsByVariant, thumbByArtifactId]);

  useEffect(() => {
    setArtifactPage(1);
  }, [q, status, objectTypeFilter, brandFilter, positionFilter, sourceFilter, hasValuationFilter, hasPhotosFilter, sizeMin, sizeMax, valuationMin, valuationMax, conditionMin, yearMin, yearMax, madeInFilter, leatherFilter, webFilter, artifactExpanded]);
  useEffect(() => {
    setCompsPage(1);
  }, [q, compMethodFilter, compMinSales, compsExpanded]);
  useEffect(() => {
    setSalesPage(1);
  }, [q, salesBrandFilter, salesSourceFilter, salesReferralFilter, salesMinPrice, salesMaxPrice, salesDateFrom, salesDateTo, salesExpanded]);

  const clearCatalogFilters = () => {
    setStatus("all");
    setObjectTypeFilter("all");
    setBrandFilter("all");
    setPositionFilter("all");
    setSourceFilter("all");
    setHasValuationFilter("all");
    setHasPhotosFilter("all");
    setSizeMin("");
    setSizeMax("");
    setValuationMin("");
    setValuationMax("");
    setConditionMin("");
    setCompMethodFilter("all");
    setCompMinSales("");
    setSalesBrandFilter("all");
    setSalesSourceFilter("all");
    setSalesReferralFilter("all");
    setSalesMinPrice("");
    setSalesMaxPrice("");
    setSalesDateFrom("");
    setSalesDateTo("");
    setYearMin("");
    setYearMax("");
    setMadeInFilter("all");
    setLeatherFilter("all");
    setWebFilter("all");
    setSelectedPatternId(null);
  };

  const requiredP0: Array<"BACK" | "PALM"> = ["BACK", "PALM"];
  const recommendedP1: Array<"LINER" | "WRIST_PATCH" | "STAMPS"> = ["LINER", "WRIST_PATCH", "STAMPS"];

  function evidenceGap(row: Artifact) {
    const kinds = new Set((row.photos || []).map((p) => p.kind));
    const missingP0 = requiredP0.filter((k) => !kinds.has(k));
    const missingP1 = recommendedP1.filter((k) => !kinds.has(k));
    return { missingP0, missingP1 };
  }

  function isVerified(row: Artifact) {
    return String(row.verification_status ?? "").toLowerCase().includes("verified");
  }

  const verifiedCount = rows.filter((r) => String(r.verification_status ?? "").toLowerCase().includes("verified")).length;
  const estimatedCount = rows.filter((r) => r.valuation_estimate != null).length;
  const artifactOnlyCount = rows.filter((r) => r.object_type === "ARTIFACT").length;
  const p0ReadyCount = rows.filter((r) => evidenceGap(r).missingP0.length === 0).length;
  const valuationReadyCount = rows.filter((r) => evidenceGap(r).missingP0.length === 0 && r.valuation_estimate != null).length;

  const verificationQueue = rows
    .map((r) => {
      const gaps = evidenceGap(r);
      const blockedByEvidence = gaps.missingP0.length > 0;
      const blockedByValuation = r.valuation_estimate == null;
      const priority = blockedByEvidence ? "P0" : blockedByValuation ? "P1" : "Ready";
      const reason = blockedByEvidence
        ? `Missing required photos: ${gaps.missingP0.join(", ")}`
        : blockedByValuation
          ? "Needs stronger comp depth before estimate"
          : "Verification + valuation conditions met";
      return { row: r, gaps, blockedByEvidence, blockedByValuation, priority, reason };
    })
    .sort((a, b) => {
      const rank = (x: string) => (x === "P0" ? 0 : x === "P1" ? 1 : 2);
      return rank(a.priority) - rank(b.priority);
    });
  const verificationStepMeta = [
    {
      label: "Add evidence",
      why: "Evidence completeness is the fastest way to reduce ambiguity in model and condition signals.",
      impact: "Adds confidence by confirming required visual checkpoints.",
    },
    {
      label: "Confirm identity fields",
      why: "Identity fields anchor the glove to a specific model family and spec profile.",
      impact: "Improves precision and decreases model mismatch risk.",
    },
    {
      label: "Provenance & variant cues",
      why: "Origin and variant cues narrow era/line and distinguish near-identical models.",
      impact: "Raises confidence for variant-level classification.",
    },
    {
      label: "Condition assessment",
      why: "Condition data drives value realism and verification confidence.",
      impact: "Converts broad estimates into tighter confidence bands.",
    },
    {
      label: "Review & submit",
      why: "A final audit prevents contradictory inputs and creates a verifiable trail.",
      impact: "Locks evidence trail and final confidence state for review.",
    },
  ] as const;
  const stepDurationsMin = [3, 3, 2, 3, 2];
  const localizedTimeRemaining = (() => {
    const mins = stepDurationsMin.slice(verificationStep).reduce((sum, v) => sum + v, 0);
    return locale === "ja" ? `残り約${mins}分` : `~${mins} min left`;
  })();
  const stepProgress = ((verificationStep + 1) / verificationStepMeta.length) * 100;
  const systemSuggestion = {
    brand: "Rawlings",
    model: "PRO1000",
    pattern: "NP5",
    size: '11.5"',
    throwSide: "RHT",
    web: "I-Web",
  };
  const evidenceCompletion = Object.values(evidenceChecklist).filter(Boolean).length / Object.keys(evidenceChecklist).length;
  const identityCompletion = Object.values(identityInput).filter((v) => String(v).trim().length > 0).length / Object.keys(identityInput).length;
  const provenanceCompletion = Object.values(provenanceInput).filter((v) => String(v).trim().length > 0).length / Object.keys(provenanceInput).length;
  const conditionCompletion = ((conditionInput.palmIntegrity + conditionInput.structureRetention) / 200) * (conditionInput.relaced || conditionInput.repairs ? 0.9 : 1);
  const confidenceBeforeScore = 0.56;
  const confidenceAfterScore = Math.min(0.95, 0.34 + evidenceCompletion * 0.26 + identityCompletion * 0.18 + provenanceCompletion * 0.14 + conditionCompletion * 0.16);
  const confidenceBeforeBand = confidenceBandFromScore(confidenceBeforeScore);
  const confidenceAfterBand = confidenceBandFromScore(confidenceAfterScore);
  const confidenceDeltaText = confidenceBeforeBand === confidenceAfterBand
    ? `${confidenceBeforeBand} (no band change yet)`
    : `${confidenceBeforeBand} → ${confidenceAfterBand}`;
  const reviewExplanation = confidenceAfterBand === "High"
    ? "Required evidence, identity confirmation, and provenance cues are now aligned with condition inputs."
    : "Complete remaining evidence and provenance details to reach high-confidence verification.";

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.artifact")}</Typography>
              <Typography variant="body2" color="text.secondary">Variant catalog and user-submitted gloves with verification and valuation readiness.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              <Autocomplete
                freeSolo
                options={topSearchOptions}
                value={q}
                onInputChange={(_, value) => setQ(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={t(locale, "search.placeholder")}
                    aria-label={t(locale, "tab.artifact")}
                  />
                )}
                sx={{ minWidth: 260, flex: 1 }}
              />
              <Button onClick={() => refresh(q)} startIcon={<SearchIcon />}>Refresh</Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Chip label="Overview" color={view === "overview" ? "primary" : "default"} onClick={() => setView("overview")} clickable />
            <Chip label="Records" color={view === "catalog" ? "primary" : "default"} onClick={() => setView("catalog")} clickable />
            <Chip label="Verification" color={view === "verification" ? "primary" : "default"} onClick={() => setView("verification")} clickable />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip
              label={`All (${rows.length})`}
              color={status === "all" ? "primary" : "default"}
              onClick={() => setStatus("all")}
              clickable
            />
            <Chip
              label={`Verified (${verifiedCount})`}
              color={status === "verified" ? "primary" : "default"}
              onClick={() => setStatus("verified")}
              clickable
            />
            <Chip
              label={`Needs review (${rows.length - verifiedCount})`}
              color={status === "unverified" ? "primary" : "default"}
              onClick={() => setStatus("unverified")}
              clickable
            />
            <Chip label={`Cataloged ${rows.length - artifactOnlyCount}`} />
            <Chip label={`Custom variants ${artifactOnlyCount}`} />
            <Chip label={`P0-ready ${p0ReadyCount}/${rows.length}`} />
            <Chip label={`Valuation-ready ${valuationReadyCount}/${rows.length}`} />
            <Chip label={`Variants ${variantRows.length}`} />
            <Chip label={`Comps ${compRows.length}`} />
            <Chip label={`Sales ${saleRows.length}`} />
          </Stack>
          {loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
          {err ? <Typography sx={{ mt: 2 }} color="error">{err}</Typography> : null}
        </CardContent></Card>

        {view === "overview" ? (
          <>
            <Card><CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Today&apos;s Variant Snapshot</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.25 }}>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Total records</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{rows.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Catalog + custom variants</Typography>
                </Box>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Verified</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{verifiedCount}</Typography>
                  <Typography variant="caption" color="text.secondary">{rows.length ? `${Math.round((verifiedCount / rows.length) * 100)}%` : "0%"} of records</Typography>
                </Box>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">P0 evidence ready</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{p0ReadyCount}</Typography>
                  <Typography variant="caption" color="text.secondary">Back + palm captured</Typography>
                </Box>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Valuation estimate ready</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{estimatedCount}</Typography>
                  <Typography variant="caption" color="text.secondary">Estimate currently available</Typography>
                </Box>
              </Box>
            </CardContent></Card>

            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Verification Queue</Typography>
                <Chip label={`${verificationQueue.filter((qRow) => qRow.priority !== "Ready").length} pending`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.25}>
                {verificationQueue.slice(0, 6).map((qRow) => (
                  <Box key={qRow.row.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>{qRow.row.id}</Typography>
                        <Typography variant="body2" color="text.secondary">{qRow.reason}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={qRow.priority} color={qRow.priority === "P0" ? "warning" : qRow.priority === "P1" ? "info" : "success"} />
                        <Button onClick={() => onOpenArtifact(qRow.row.id)}>Open</Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent></Card>
          </>
        ) : null}

        {view === "catalog" ? (
          <>
            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Brand Seeds</Typography>
                <Chip label={`${variantBrandHierarchy.length} brands`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.25 }}>
                {variantBrandHierarchy.map((entry) => {
                  const supportLabel = entry.brand.supports_variant_ai ? "Variant AI ready" : "Rule-only";
                  const logoSrc = brandLogoSrc(entry.details.contact);
                  return (
                    <Box key={entry.brand.brand_key} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                      <Stack direction="row" spacing={1.1} alignItems="center">
                        <Avatar
                          src={logoSrc || undefined}
                          alt={`${entry.brand.display_name} logo`}
                          sx={{ width: 34, height: 34, bgcolor: "background.paper", color: "text.primary", border: "1px solid", borderColor: "divider", fontWeight: 700, fontSize: 12 }}
                          imgProps={{ referrerPolicy: "no-referrer" }}
                        >
                          {!logoSrc ? brandLogoMark(entry.brand.display_name) : null}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900 }} noWrap>{entry.brand.display_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entry.details.company} • {entry.details.contact}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.8} sx={{ mt: 1.1, flexWrap: "wrap" }}>
                        <Chip size="small" label={supportLabel} color={entry.brand.supports_variant_ai ? "success" : "default"} />
                        <Chip size="small" label={entry.brand.country_hint || "Country unknown"} />
                        <Chip size="small" label={`${entry.families.length} families`} />
                      </Stack>
                      <Button
                        fullWidth
                        endIcon={<KeyboardArrowRightIcon />}
                        sx={{ mt: 1.1 }}
                        disabled={entry.families.length === 0}
                        onClick={() => setVariantBrandDetailOpen(entry)}
                      >
                        Open brand profile
                      </Button>
                    </Box>
                  );
                })}
              </Box>
              {variantBrandHierarchy.length === 0 ? <Typography variant="body2" color="text.secondary">No brand listings match the current search.</Typography> : null}
            </CardContent></Card>

            <Dialog
              open={Boolean(variantBrandDetailOpen)}
              onClose={() => setVariantBrandDetailOpen(null)}
              fullScreen
            >
              {variantBrandDetailOpen ? (
                <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100%", bgcolor: "background.default" }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>{variantBrandDetailOpen.brand.display_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {variantBrandDetailOpen.details.company} • {variantBrandDetailOpen.details.contact}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip size="small" label={`${variantBrandDetailOpen.families.length} families`} />
                        <Chip size="small" label={variantBrandDetailOpen.brand.supports_variant_ai ? "Variant AI ready" : "Rule-only"} />
                        <Button onClick={() => setVariantBrandDetailOpen(null)}>Close</Button>
                      </Stack>
                    </Stack>
                    <Divider />
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 1.25 }}>
                      {variantBrandDetailOpen.families.map((familyNode) => (
                        <Card key={familyNode.family.family_id}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{familyNode.family.display_name}</Typography>
                              <Chip size="small" label={`${familyNode.patterns.length} patterns`} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {familyNode.family.family_key} • tier {familyNode.family.tier}
                            </Typography>
                            <Divider sx={{ my: 1.2 }} />
                            <Stack spacing={0.8}>
                              {familyNode.patterns.map((pattern) => (
                                <Box key={pattern.pattern_id} sx={{ p: 1, borderRadius: 1.3, border: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
                                  <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                                    {pattern.pattern_code} • {pattern.canonical_position}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {pattern.pattern_system} • size {pattern.canonical_size_in || "—"} • web {pattern.canonical_web || "—"}
                                  </Typography>
                                </Box>
                              ))}
                              {familyNode.patterns.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">No patterns linked to this family yet.</Typography>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Stack>
                </Box>
              ) : null}
            </Dialog>

            <Card><CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Filters</Typography>
                <Button onClick={clearCatalogFilters}>Clear all filters</Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1.2 }}>
                <FormControl size="small">
                  <Select value={objectTypeFilter} onChange={(e) => setObjectTypeFilter(e.target.value as typeof objectTypeFilter)}>
                    <MenuItem value="all">Type: all</MenuItem>
                    <MenuItem value="ARTIFACT">Type: artifact</MenuItem>
                    <MenuItem value="CATALOGED_MODEL">Type: cataloged</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={brandFilter} onChange={(e) => setBrandFilter(String(e.target.value))}>
                    <MenuItem value="all">Brand: all</MenuItem>
                    {artifactBrandOptions.map((brand) => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={positionFilter} onChange={(e) => setPositionFilter(String(e.target.value))}>
                    <MenuItem value="all">Position: all</MenuItem>
                    {artifactPositionOptions.map((position) => <MenuItem key={position} value={position}>{position}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={sourceFilter} onChange={(e) => setSourceFilter(String(e.target.value))}>
                    <MenuItem value="all">Source: all</MenuItem>
                    {artifactSourceOptions.map((source) => <MenuItem key={source} value={source}>{source}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={hasValuationFilter} onChange={(e) => setHasValuationFilter(e.target.value as typeof hasValuationFilter)}>
                    <MenuItem value="all">Valuation: all</MenuItem>
                    <MenuItem value="yes">Valuation: yes</MenuItem>
                    <MenuItem value="no">Valuation: no</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={hasPhotosFilter} onChange={(e) => setHasPhotosFilter(e.target.value as typeof hasPhotosFilter)}>
                    <MenuItem value="all">Photos: all</MenuItem>
                    <MenuItem value="yes">Photos: yes</MenuItem>
                    <MenuItem value="no">Photos: no</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" label="Min size (in)" value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} />
                <TextField size="small" label="Max size (in)" value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} />
                <TextField size="small" label="Min valuation (USD)" value={valuationMin} onChange={(e) => setValuationMin(e.target.value)} />
                <TextField size="small" label="Max valuation (USD)" value={valuationMax} onChange={(e) => setValuationMax(e.target.value)} />
                <TextField size="small" label="Min condition score" value={conditionMin} onChange={(e) => setConditionMin(e.target.value)} />
                <TextField size="small" label="Year min" value={yearMin} onChange={(e) => setYearMin(e.target.value)} />
                <TextField size="small" label="Year max" value={yearMax} onChange={(e) => setYearMax(e.target.value)} />
                <FormControl size="small">
                  <Select value={madeInFilter} onChange={(e) => setMadeInFilter(String(e.target.value))}>
                    <MenuItem value="all">Made in: all</MenuItem>
                    {madeInOptions.map((origin) => <MenuItem key={origin} value={origin}>{origin}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={leatherFilter} onChange={(e) => setLeatherFilter(String(e.target.value))}>
                    <MenuItem value="all">Leather: all</MenuItem>
                    {leatherOptions.map((leather) => <MenuItem key={leather} value={leather}>{leather}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={webFilter} onChange={(e) => setWebFilter(String(e.target.value))}>
                    <MenuItem value="all">Web: all</MenuItem>
                    {webOptions.map((web) => <MenuItem key={web} value={web}>{web}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={compMethodFilter} onChange={(e) => setCompMethodFilter(String(e.target.value))}>
                    <MenuItem value="all">Comp method: all</MenuItem>
                    {compMethodOptions.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Comp minimum linked sales" value={compMinSales} onChange={(e) => setCompMinSales(e.target.value)} />
                <FormControl size="small">
                  <Select value={salesBrandFilter} onChange={(e) => setSalesBrandFilter(String(e.target.value))}>
                    <MenuItem value="all">Sales brand: all</MenuItem>
                    {salesBrandOptions.map((brand) => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={salesSourceFilter} onChange={(e) => setSalesSourceFilter(String(e.target.value))}>
                    <MenuItem value="all">Sales source: all</MenuItem>
                    {salesSourceOptions.map((source) => <MenuItem key={source} value={source}>{source}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <Select value={salesReferralFilter} onChange={(e) => setSalesReferralFilter(e.target.value as typeof salesReferralFilter)}>
                    <MenuItem value="all">Sales type: all</MenuItem>
                    <MenuItem value="referral">Sales type: referral</MenuItem>
                    <MenuItem value="direct">Sales type: direct</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" label="Sales min price" value={salesMinPrice} onChange={(e) => setSalesMinPrice(e.target.value)} />
                <TextField size="small" label="Sales max price" value={salesMaxPrice} onChange={(e) => setSalesMaxPrice(e.target.value)} />
                <TextField size="small" type="date" label="Sales from" value={salesDateFrom} onChange={(e) => setSalesDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField size="small" type="date" label="Sales to" value={salesDateTo} onChange={(e) => setSalesDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Box>
            </CardContent></Card>

            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Results (Pattern Level)</Typography>
                <Chip label={selectedPatternId ? "Pattern selected" : `${filteredPatterns.length} shown`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {filteredPatterns.map((pattern) => (
                  <Box
                    key={pattern.pattern_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPatternId(pattern.pattern_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPatternId(pattern.pattern_id);
                      }
                    }}
                    sx={{
                      p: 1.2,
                      border: "1px solid",
                      borderColor: selectedPatternId === pattern.pattern_id ? "primary.main" : "divider",
                      borderRadius: 1.6,
                      cursor: "pointer",
                      bgcolor: selectedPatternId === pattern.pattern_id ? alpha("#0A84FF", 0.08) : "transparent",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>{pattern.pattern_code} • {pattern.canonical_position}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pattern.pattern_id} • size {pattern.canonical_size_in || "—"} • web {pattern.canonical_web || "—"} • {pattern.pattern_system}
                    </Typography>
                  </Box>
                ))}
                {filteredPatterns.length === 0 ? <Typography variant="body2" color="text.secondary">No pattern results match the current query.</Typography> : null}
              </Stack>
              {selectedPatternId ? (
                <Button sx={{ mt: 1.2 }} onClick={() => setSelectedPatternId(null)}>Clear selected pattern</Button>
              ) : null}
            </CardContent></Card>

            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Variant Records</Typography>
                <Chip label={artifactExpanded ? `${visibleArtifacts.length} shown (page ${artifactPage}/${artifactPageCount})` : `${visibleArtifacts.length} shown`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.25}>
                {visibleArtifacts.map((variant) => {
                  const relatedArtifacts = artifactsByVariant.get(variant.variant_id) || [];
                  const firstArtifact = relatedArtifacts[0];
                  const verifiedCountForVariant = relatedArtifacts.filter((a) => isVerified(a)).length;
                  const avgEstimate = relatedArtifacts
                    .filter((a) => a.valuation_estimate != null)
                    .reduce((sum, a, _, arr) => sum + Number(a.valuation_estimate || 0) / arr.length, 0);
                  const thumb = (firstArtifact ? thumbByArtifactId[firstArtifact.id] : "") || glovePlaceholderImage;
                  return (
                    <Box
                      key={variant.variant_id}
                      sx={{ p: 1.75, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                    >
                      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                              role="button"
                              tabIndex={0}
                              onClick={() => setVariantPreviewImage({ src: thumb, title: variant.display_name })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setVariantPreviewImage({ src: thumb, title: variant.display_name });
                                }
                              }}
                              sx={{
                                width: 72,
                                height: 54,
                                borderRadius: 1.4,
                                border: "1px solid",
                                borderColor: "divider",
                                flexShrink: 0,
                                position: "relative",
                                overflow: "hidden",
                                cursor: "zoom-in",
                                "&:hover .variant-thumb-overlay": { opacity: 1 },
                              }}
                            >
                              <Box component="img" src={thumb} alt={`${variant.variant_id} thumbnail`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              <Box
                                className="variant-thumb-overlay"
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "grid",
                                  placeItems: "center",
                                  background: "rgba(15,23,42,0.42)",
                                  opacity: { xs: 1, md: 0 },
                                  transition: "opacity 140ms ease",
                                  color: "#fff",
                                }}
                              >
                                <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                              </Box>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 900 }} noWrap>{variant.display_name}</Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {variant.variant_id} • {variant.brand_key} • {variant.model_code || "model n/a"} • {variant.year}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                            <Chip size="small" label={`${relatedArtifacts.length} artifacts`} />
                            <Chip size="small" label={`${verifiedCountForVariant} verified`} color={verifiedCountForVariant ? "success" : "warning"} />
                            <Chip size="small" label={`Made in ${variant.made_in || "Unknown"}`} />
                          </Stack>
                        </Box>
                        <Stack direction={{ xs: "row", md: "column" }} spacing={1} alignItems={{ xs: "center", md: "flex-end" }}>
                          <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                            <Typography sx={{ fontWeight: 900 }}>{relatedArtifacts.some((a) => a.valuation_estimate != null) ? money(avgEstimate) : "—"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {firstArtifact ? `${firstArtifact.id} product page` : "Product page unavailable"}
                            </Typography>
                          </Box>
                          <Button disabled={!firstArtifact} onClick={() => firstArtifact && onOpenArtifact(firstArtifact.id)}>Open</Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
                {filteredVariants.length === 0 && !loading ? (
                  <Typography variant="body2" color="text.secondary">No variant products match the current filters.</Typography>
                ) : null}
              </Stack>
              {filteredVariants.length > collapsedSize ? (
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.25} sx={{ mt: 1.5 }}>
                  <Button onClick={() => { setArtifactExpanded((prev) => !prev); if (artifactExpanded) setArtifactPage(1); }}>
                    {artifactExpanded ? "Collapse records" : `Expand records (${filteredVariants.length})`}
                  </Button>
                  {artifactExpanded && filteredVariants.length > pageSize ? (
                    <Pagination
                      page={artifactPage}
                      count={artifactPageCount}
                      onChange={(_, page) => setArtifactPage(page)}
                      size="small"
                      shape="rounded"
                    />
                  ) : null}
                </Stack>
              ) : null}
            </CardContent></Card>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5 }}>
              <Card><CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Comp Sets</Typography>
                  <Chip label={compsExpanded ? `${visibleComps.length} shown (page ${compsPage}/${compsPageCount})` : `${visibleComps.length} shown`} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {visibleComps.map((comp) => (
                    <Box key={comp.comp_set_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                      <Typography sx={{ fontWeight: 800 }}>{comp.comp_set_id}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Artifact {comp.artifact_id} • {comp.method} • {comp.sales_ids.length} linked sales
                      </Typography>
                    </Box>
                  ))}
                  {filteredComps.length === 0 ? <Typography variant="body2" color="text.secondary">No comp sets match current query.</Typography> : null}
                </Stack>
                {filteredComps.length > collapsedSize ? (
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.25} sx={{ mt: 1.5 }}>
                    <Button onClick={() => { setCompsExpanded((prev) => !prev); if (compsExpanded) setCompsPage(1); }}>
                      {compsExpanded ? "Collapse comp sets" : `Expand comp sets (${filteredComps.length})`}
                    </Button>
                    {compsExpanded && filteredComps.length > pageSize ? (
                      <Pagination
                        page={compsPage}
                        count={compsPageCount}
                        onChange={(_, page) => setCompsPage(page)}
                        size="small"
                        shape="rounded"
                      />
                    ) : null}
                  </Stack>
                ) : null}
              </CardContent></Card>

              <Card><CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Sales Feed</Typography>
                  <Chip label={salesExpanded ? `${visibleSales.length} shown (page ${salesPage}/${salesPageCount})` : `${visibleSales.length} shown`} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {visibleSales.map((sale) => (
                    <Box key={sale.sale_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                      <Typography sx={{ fontWeight: 800 }}>{sale.sale_id}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sale.brand_key} • {money(sale.price_usd)} • {sale.sale_date} • {sale.source}
                      </Typography>
                    </Box>
                  ))}
                  {filteredSales.length === 0 ? <Typography variant="body2" color="text.secondary">No sales match current query.</Typography> : null}
                </Stack>
                {filteredSales.length > collapsedSize ? (
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.25} sx={{ mt: 1.5 }}>
                    <Button onClick={() => { setSalesExpanded((prev) => !prev); if (salesExpanded) setSalesPage(1); }}>
                      {salesExpanded ? "Collapse sales" : `Expand sales (${filteredSales.length})`}
                    </Button>
                    {salesExpanded && filteredSales.length > pageSize ? (
                      <Pagination
                        page={salesPage}
                        count={salesPageCount}
                        onChange={(_, page) => setSalesPage(page)}
                        size="small"
                        shape="rounded"
                      />
                    ) : null}
                  </Stack>
                ) : null}
              </CardContent></Card>
            </Box>
            <Dialog
              open={Boolean(variantPreviewImage)}
              onClose={() => setVariantPreviewImage(null)}
              maxWidth="md"
              fullWidth
            >
              {variantPreviewImage ? (
                <Box sx={{ p: 1.2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                    {variantPreviewImage.title}
                  </Typography>
                  <Box
                    component="img"
                    src={variantPreviewImage.src}
                    alt={`${variantPreviewImage.title} preview`}
                    sx={{ width: "100%", borderRadius: 1.5, border: "1px solid", borderColor: "divider", display: "block", maxHeight: "72vh", objectFit: "contain" }}
                  />
                </Box>
              ) : null}
            </Dialog>
          </>
        ) : null}

        {view === "verification" ? (
          <>
            <Card><CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Verification Flow</Typography>
                  <Typography variant="body2" color="text.secondary">Structured stepper to move low/medium confidence toward higher confidence.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Chip label={`Step ${verificationStep + 1}/${verificationStepMeta.length}`} />
                  <Chip label={localizedTimeRemaining} />
                </Stack>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <LinearProgress variant="determinate" value={stepProgress} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
                <Box sx={{ p: 1.4, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Stepper activeStep={verificationStep} alternativeLabel>
                    {verificationStepMeta.map((step) => (
                      <Step key={step.label}>
                        <StepLabel>{step.label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                  <Divider sx={{ my: 1.4 }} />
                  {verificationStep === 0 ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Step 1: Add evidence</Typography>
                      <FormControlLabel control={<Switch checked={evidenceChecklist.palm} onChange={(e) => setEvidenceChecklist((s) => ({ ...s, palm: e.target.checked }))} />} label="Palm photo provided" />
                      <FormControlLabel control={<Switch checked={evidenceChecklist.back} onChange={(e) => setEvidenceChecklist((s) => ({ ...s, back: e.target.checked }))} />} label="Backhand photo provided" />
                      <FormControlLabel control={<Switch checked={evidenceChecklist.web} onChange={(e) => setEvidenceChecklist((s) => ({ ...s, web: e.target.checked }))} />} label="Web photo provided" />
                      <FormControlLabel control={<Switch checked={evidenceChecklist.heelStamp} onChange={(e) => setEvidenceChecklist((s) => ({ ...s, heelStamp: e.target.checked }))} />} label="Heel stamp photo provided" />
                      <FormControlLabel control={<Switch checked={evidenceChecklist.linerStamp} onChange={(e) => setEvidenceChecklist((s) => ({ ...s, linerStamp: e.target.checked }))} />} label="Liner stamp photo provided" />
                      <TextField size="small" label="Optional listing URL" placeholder="https://..." value={listingLink} onChange={(e) => setListingLink(e.target.value)} />
                    </Stack>
                  ) : null}
                  {verificationStep === 1 ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Step 2: Confirm identity fields</Typography>
                      {([
                        ["brand", "Brand"],
                        ["model", "Model"],
                        ["pattern", "Pattern"],
                        ["size", "Size"],
                        ["throwSide", "Throw"],
                        ["web", "Web"],
                      ] as const).map(([key, label]) => (
                        <Box key={key} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {label} • System suggestion: <Typography component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{systemSuggestion[key]}</Typography>
                          </Typography>
                          <TextField
                            size="small"
                            fullWidth
                            label={`Your input: ${label}`}
                            value={identityInput[key]}
                            onChange={(e) => setIdentityInput((s) => ({ ...s, [key]: e.target.value }))}
                            sx={{ mt: 0.7 }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                  {verificationStep === 2 ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Step 3: Provenance & variant cues</Typography>
                      <FormControl size="small">
                        <Select value={provenanceInput.origin} onChange={(e) => setProvenanceInput((s) => ({ ...s, origin: String(e.target.value) }))}>
                          <MenuItem value="">Origin (select)</MenuItem>
                          <MenuItem value="JP">Japan</MenuItem>
                          <MenuItem value="US">United States</MenuItem>
                          <MenuItem value="Unknown">Unknown</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small">
                        <Select value={provenanceInput.era} onChange={(e) => setProvenanceInput((s) => ({ ...s, era: String(e.target.value) }))}>
                          <MenuItem value="">Era bucket (select)</MenuItem>
                          <MenuItem value="1990s">1990s</MenuItem>
                          <MenuItem value="2000s">2000s</MenuItem>
                          <MenuItem value="2010s+">2010s+</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField size="small" label="Leather designation (e.g., Primo)" value={provenanceInput.leather} onChange={(e) => setProvenanceInput((s) => ({ ...s, leather: e.target.value }))} />
                      <TextField size="small" label="Stamp / patch style" value={provenanceInput.stampPatch} onChange={(e) => setProvenanceInput((s) => ({ ...s, stampPatch: e.target.value }))} />
                    </Stack>
                  ) : null}
                  {verificationStep === 3 ? (
                    <Stack spacing={1.2}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Step 4: Condition assessment</Typography>
                      <FormControlLabel control={<Switch checked={conditionInput.relaced} onChange={(e) => setConditionInput((s) => ({ ...s, relaced: e.target.checked }))} />} label="Relaced" />
                      <FormControlLabel control={<Switch checked={conditionInput.repairs} onChange={(e) => setConditionInput((s) => ({ ...s, repairs: e.target.checked }))} />} label="Repairs present" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Palm integrity</Typography>
                        <Slider value={conditionInput.palmIntegrity} onChange={(_, v) => setConditionInput((s) => ({ ...s, palmIntegrity: Number(v) }))} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Structure retention</Typography>
                        <Slider value={conditionInput.structureRetention} onChange={(_, v) => setConditionInput((s) => ({ ...s, structureRetention: Number(v) }))} />
                      </Box>
                    </Stack>
                  ) : null}
                  {verificationStep === 4 ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Step 5: Review & submit</Typography>
                      <Box sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Confidence delta</Typography>
                        <Typography sx={{ fontWeight: 900 }}>{confidenceDeltaText}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{reviewExplanation}</Typography>
                      </Box>
                      <Button
                        onClick={() =>
                          setSubmittedVerificationSummary({
                            submitted_at: new Date().toISOString(),
                            confidence_before: confidenceBeforeBand,
                            confidence_after: confidenceAfterBand,
                            confidence_score_after: Number(confidenceAfterScore.toFixed(2)),
                            evidence: evidenceChecklist,
                            identity_input: identityInput,
                            system_suggestion: systemSuggestion,
                            provenance: provenanceInput,
                            condition: conditionInput,
                            explanation: reviewExplanation,
                          })
                        }
                      >
                        Submit Verification
                      </Button>
                    </Stack>
                  ) : null}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                    <Button color="inherit" disabled={verificationStep === 0} onClick={() => setVerificationStep((s) => Math.max(0, s - 1))}>Back</Button>
                    <Button disabled={verificationStep === verificationStepMeta.length - 1} onClick={() => setVerificationStep((s) => Math.min(verificationStepMeta.length - 1, s + 1))}>Next</Button>
                  </Stack>
                </Box>
                <Box sx={{ p: 1.4, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{verificationStepMeta[verificationStep].label}</Typography>
                  <Divider sx={{ my: 1.2 }} />
                  <Typography variant="body2"><Typography component="span" sx={{ fontWeight: 700 }}>Why it matters:</Typography> {verificationStepMeta[verificationStep].why}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.9 }}><Typography component="span" sx={{ fontWeight: 700 }}>Confidence impact:</Typography> {verificationStepMeta[verificationStep].impact}</Typography>
                  <Divider sx={{ my: 1.2 }} />
                  <Typography variant="caption" color="text.secondary">Confidence preview</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {confidenceBeforeBand} → {confidenceAfterBand} ({Math.round(confidenceAfterScore * 100)}%)
                  </Typography>
                  {submittedVerificationSummary ? (
                    <Box sx={{ mt: 1.2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Verification Summary (Audit Trail)</Typography>
                      <Box
                        component="pre"
                        sx={{
                          mt: 0.8,
                          mb: 0,
                          p: 1,
                          borderRadius: 1.25,
                          overflow: "auto",
                          bgcolor: "background.default",
                          border: "1px solid",
                          borderColor: "divider",
                          fontSize: 12,
                        }}
                      >
                        {JSON.stringify(submittedVerificationSummary, null, 2)}
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </CardContent></Card>

            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Queue Detail</Typography>
                <Chip label={`${verificationQueue.length} tracked`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.25}>
                {verificationQueue.map((qRow) => (
                  <Box key={qRow.row.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>{qRow.row.id}</Typography>
                        <Typography variant="body2" color="text.secondary">{qRow.reason}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          P0 missing: {qRow.gaps.missingP0.length ? qRow.gaps.missingP0.join(", ") : "none"} • P1 missing: {qRow.gaps.missingP1.length ? qRow.gaps.missingP1.join(", ") : "none"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={qRow.priority} color={qRow.priority === "P0" ? "warning" : qRow.priority === "P1" ? "info" : "success"} />
                        <Button onClick={() => onOpenArtifact(qRow.row.id)}>Open</Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent></Card>
          </>
        ) : null}

      </Stack>
    </Container>
  );
}

function AppraisalScreen({ locale }: { locale: Locale }) {
  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.appraisal")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Upload multiple glove photos and get GloveIQ specifications plus appraised market value in one response.
          </Typography>
        </CardContent></Card>
        <AppraisalIntakeWidget locale={locale} />
      </Stack>
    </Container>
  );
}

function AccountScreen({ locale }: { locale: Locale }) {
  const [authStep, setAuthStep] = useState<"login" | "2fa" | "done">("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "", remember: true, trustDevice: false });
  const [otpCode, setOtpCode] = useState("246810");
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [section, setSection] = useState<"overview" | "profile" | "security" | "settings">("overview");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profile, setProfile] = useState({
    fullName: "Jesse Rego",
    displayName: "Jesse",
    email: "jesse@gloveiq.ai",
    phone: "+1 (555) 014-2456",
    company: "GloveIQ",
    role: "Founder",
    timezone: "America/Los_Angeles",
    locale: locale,
    city: "San Francisco",
    country: "United States",
    website: "https://gloveiq.ai",
    bio: "Collector and builder focused on explainable glove valuation.",
  });
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    twoFactorMethod: "auth_app" as "auth_app" | "sms",
    backupCodes: true,
    deviceAlerts: true,
    payoutLock: true,
    apiAccess: false,
    activeSessions: 2,
  });
  const [settings, setSettings] = useState({
    theme: "light" as "light" | "system",
    currency: "USD" as "USD" | "JPY",
    appraisalReady: true,
    securityDigest: true,
    compAlerts: true,
    productNews: false,
    weeklyDigest: false,
  });
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("246810");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [activeSessions, setActiveSessions] = useState([
    { id: "s1", device: "MacBook Pro • Safari", location: "San Francisco, CA", lastSeen: "Active now", current: true },
    { id: "s2", device: "iPhone 15 Pro • iOS App", location: "San Francisco, CA", lastSeen: "12m ago", current: false },
  ]);
  const [alertsFeed, setAlertsFeed] = useState([
    { id: "a1", level: "info" as const, text: "New comp cluster detected for PRO1000 in the last 24h." },
    { id: "a2", level: "warning" as const, text: "2FA is disabled. Enable to secure account access." },
    { id: "a3", level: "success" as const, text: "Your last appraisal request was delivered successfully." },
  ]);
  const [loginHistory] = useState([
    { id: "l1", ts: "Today • 09:12 AM", status: "Success", geo: "San Francisco, US" },
    { id: "l2", ts: "Yesterday • 11:47 PM", status: "Success", geo: "San Francisco, US" },
    { id: "l3", ts: "Yesterday • 06:18 PM", status: "Challenge", geo: "Los Angeles, US" },
  ]);

  const isLoggedIn = authStep === "done";
  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : null), [avatarFile]);
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const securityScore = useMemo(() => {
    let score = 58;
    if (security.twoFactorEnabled) score += 24;
    if (security.backupCodes) score += 8;
    if (security.deviceAlerts) score += 5;
    if (security.payoutLock) score += 5;
    return Math.min(100, score);
  }, [security.twoFactorEnabled, security.backupCodes, security.deviceAlerts, security.payoutLock]);

  function submitLogin() {
    setAuthError(null);
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setAuthError("Enter email and password.");
      return;
    }
    setAuthStep("2fa");
    setOtpCode("246810");
  }

  function verify2fa() {
    setAuthError(null);
    if (otpCode.trim() !== "246810") {
      setAuthError("Invalid verification code. Use 246810 for this demo.");
      return;
    }
    setAuthStep("done");
    setSection("overview");
    setAccountNotice("Logged in successfully. Account controls are now unlocked.");
  }

  function enableTwoFactor() {
    if (twoFactorSetupCode.trim() !== "246810") {
      setAccountNotice("Invalid setup code. Use 246810 in this prototype.");
      return;
    }
    setSecurity((s) => ({ ...s, twoFactorEnabled: true }));
    setAccountNotice("Two-factor authentication is now enabled.");
  }

  function disableTwoFactor() {
    setSecurity((s) => ({ ...s, twoFactorEnabled: false }));
    setAccountNotice("Two-factor authentication has been disabled.");
  }

  function saveProfile() {
    setAccountNotice("Profile details saved.");
  }

  function updatePassword() {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setAccountNotice("Enter current and new password fields.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setAccountNotice("New password and confirmation do not match.");
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    setAccountNotice("Password updated.");
  }

  function signOutOtherSessions() {
    setActiveSessions((list) => list.filter((s) => s.current));
    setSecurity((s) => ({ ...s, activeSessions: 1 }));
    setAccountNotice("Other sessions were signed out.");
  }

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.account")}</Typography>
              <Typography variant="body2" color="text.secondary">
                SaaS-grade account center for profile, authentication, security posture, and account settings.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label={isLoggedIn ? "Authenticated" : "Signed out"} color={isLoggedIn ? "success" : "warning"} />
              <Chip label={`2FA ${security.twoFactorEnabled ? "On" : "Off"}`} color={security.twoFactorEnabled ? "success" : "default"} />
              <Chip label={`Security score ${securityScore}/100`} color={securityScore >= 85 ? "success" : securityScore >= 70 ? "warning" : "default"} />
              <Tooltip title="Demo verification/setup code is 246810 in this prototype">
                <Chip label="Help" icon={<InfoOutlinedIcon />} />
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent></Card>
        {accountNotice ? (
          <Alert severity="success" action={<Button color="inherit" onClick={() => setAccountNotice(null)}>Dismiss</Button>}>
            {accountNotice}
          </Alert>
        ) : null}

        {!isLoggedIn ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
            <Card><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Sign in</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Continue to profile settings, security controls, and alert management.
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 2 }}>
                {authStep === "login" ? (
                  <>
                    <TextField
                      size="small"
                      label="Email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((s) => ({ ...s, email: e.target.value }))}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      label="Password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
                      fullWidth
                    />
                    <FormControlLabel
                      control={<Switch checked={loginForm.remember} onChange={(e) => setLoginForm((s) => ({ ...s, remember: e.target.checked }))} />}
                      label="Remember this device"
                    />
                    <FormControlLabel
                      control={<Switch checked={loginForm.trustDevice} onChange={(e) => setLoginForm((s) => ({ ...s, trustDevice: e.target.checked }))} />}
                      label="Trust this browser for 30 days"
                    />
                    <Button onClick={submitLogin}>Sign in</Button>
                  </>
                ) : (
                  <>
                    <Alert severity="info">Two-factor verification required. Enter code to continue.</Alert>
                    <TextField size="small" label="Verification code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} fullWidth />
                    <Stack direction="row" spacing={1}>
                      <Button onClick={verify2fa}>Verify 2FA</Button>
                      <Button color="inherit" onClick={() => setAuthStep("login")}>Back</Button>
                    </Stack>
                  </>
                )}
                {authError ? <Alert severity="error">{authError}</Alert> : null}
              </Stack>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Authentication Overview</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1.25}>
                <Box sx={{ p: 1.4, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Session policy</Typography>
                  <Typography sx={{ fontWeight: 800 }}>MFA challenge for sensitive account actions</Typography>
                </Box>
                <Box sx={{ p: 1.4, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Risk controls</Typography>
                  <Typography sx={{ fontWeight: 800 }}>Device alerts + payout lock + backup recovery codes</Typography>
                </Box>
                <Alert severity="warning">2FA gates high-trust actions like payout settings and API key management.</Alert>
              </Stack>
            </CardContent></Card>
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label="Overview" color={section === "overview" ? "primary" : "default"} onClick={() => setSection("overview")} clickable />
              <Chip label="Profile" color={section === "profile" ? "primary" : "default"} onClick={() => setSection("profile")} clickable />
              <Chip label="Security" color={section === "security" ? "primary" : "default"} onClick={() => setSection("security")} clickable />
              <Chip label="Settings" color={section === "settings" ? "primary" : "default"} onClick={() => setSection("settings")} clickable />
            </Stack>

            {section === "overview" ? (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 1.25 }}>
                  <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Security score</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{securityScore}/100</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Active sessions</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{activeSessions.length}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">2FA status</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{security.twoFactorEnabled ? "Enabled" : "Disabled"}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Alert items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{alertsFeed.length}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" }, gap: 2 }}>
                  <Card><CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Recent Login Activity</Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack spacing={1}>
                      {loginHistory.map((row) => (
                        <Box key={row.id} sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 800 }}>{row.ts}</Typography>
                              <Typography variant="body2" color="text.secondary">{row.geo}</Typography>
                            </Box>
                            <Chip size="small" label={row.status} color={row.status === "Success" ? "success" : "warning"} />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent></Card>
                  <Card><CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Security Posture</Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack spacing={1.2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">2FA coverage</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{security.twoFactorEnabled ? "100%" : "0%"}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={security.twoFactorEnabled ? 100 : 0} sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Session hardening</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{security.deviceAlerts ? "80%" : "35%"}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={security.deviceAlerts ? 80 : 35} sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Account recovery readiness</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{security.backupCodes ? "90%" : "30%"}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={security.backupCodes ? 90 : 30} sx={{ mt: 0.5 }} />
                      </Box>
                    </Stack>
                  </CardContent></Card>
                </Box>
              </>
            ) : null}

            {section === "profile" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.3fr" }, gap: 2 }}>
                <Card><CardContent>
                  <Stack spacing={1.25} alignItems="center">
                    <Avatar src={avatarPreview || undefined} sx={{ width: 84, height: 84 }}>
                      {profile.displayName.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Typography sx={{ fontWeight: 900 }}>{profile.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">{profile.role} • {profile.company}</Typography>
                    <input
                      id="avatar-upload-input"
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const next = e.target.files?.[0] || null;
                        setAvatarFile(next);
                        if (next) setAccountNotice(`Selected image: ${next.name}`);
                      }}
                    />
                    <Button color="inherit" onClick={() => document.getElementById("avatar-upload-input")?.click()}>
                      Change profile image
                    </Button>
                    {avatarFile ? <Chip size="small" label={avatarFile.name} /> : null}
                    <Chip size="small" label={`Sessions: ${activeSessions.length}`} />
                  </Stack>
                </CardContent></Card>
                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Profile and Personal Data</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
                    <TextField size="small" label="Full name" value={profile.fullName} onChange={(e) => setProfile((s) => ({ ...s, fullName: e.target.value }))} />
                    <TextField size="small" label="Display name" value={profile.displayName} onChange={(e) => setProfile((s) => ({ ...s, displayName: e.target.value }))} />
                    <TextField size="small" label="Email" value={profile.email} onChange={(e) => setProfile((s) => ({ ...s, email: e.target.value }))} />
                    <TextField size="small" label="Phone" value={profile.phone} onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))} />
                    <TextField size="small" label="Company" value={profile.company} onChange={(e) => setProfile((s) => ({ ...s, company: e.target.value }))} />
                    <TextField size="small" label="Role" value={profile.role} onChange={(e) => setProfile((s) => ({ ...s, role: e.target.value }))} />
                    <TextField size="small" label="City" value={profile.city} onChange={(e) => setProfile((s) => ({ ...s, city: e.target.value }))} />
                    <TextField size="small" label="Country" value={profile.country} onChange={(e) => setProfile((s) => ({ ...s, country: e.target.value }))} />
                    <TextField size="small" label="Website" value={profile.website} onChange={(e) => setProfile((s) => ({ ...s, website: e.target.value }))} />
                    <TextField size="small" label="Timezone" value={profile.timezone} onChange={(e) => setProfile((s) => ({ ...s, timezone: e.target.value }))} />
                    <FormControl size="small">
                      <Select value={profile.locale} onChange={(e) => setProfile((s) => ({ ...s, locale: e.target.value as Locale }))}>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ja">Japanese</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <TextField size="small" label="Bio" value={profile.bio} onChange={(e) => setProfile((s) => ({ ...s, bio: e.target.value }))} multiline minRows={3} fullWidth sx={{ mt: 1.25 }} />
                  <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                    <Button onClick={saveProfile}>Save Profile</Button>
                    <Button color="inherit" onClick={() => setAccountNotice("Reverted unsaved profile changes for this prototype view.")}>Discard</Button>
                  </Stack>
                </CardContent></Card>
              </Box>
            ) : null}

            {section === "security" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Card><CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SecurityIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Authentication and 2FA Setup</Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <FormControlLabel
                    control={<Switch checked={security.twoFactorEnabled} onChange={(e) => setSecurity((s) => ({ ...s, twoFactorEnabled: e.target.checked }))} />}
                    label="Enable two-factor authentication"
                  />
                  <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
                    <Select
                      value={security.twoFactorMethod}
                      onChange={(e) => setSecurity((s) => ({ ...s, twoFactorMethod: e.target.value as "auth_app" | "sms" }))}
                    >
                      <MenuItem value="auth_app">Authenticator App (TOTP)</MenuItem>
                      <MenuItem value="sms">SMS OTP</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={<Switch checked={security.backupCodes} onChange={(e) => setSecurity((s) => ({ ...s, backupCodes: e.target.checked }))} />}
                    label="Enable backup recovery codes"
                  />
                  <FormControlLabel
                    control={<Switch checked={security.deviceAlerts} onChange={(e) => setSecurity((s) => ({ ...s, deviceAlerts: e.target.checked }))} />}
                    label="Alert on new device login"
                  />
                  <FormControlLabel
                    control={<Switch checked={security.payoutLock} onChange={(e) => setSecurity((s) => ({ ...s, payoutLock: e.target.checked }))} />}
                    label="Require 2FA for payout/profile-critical updates"
                  />
                  <FormControlLabel
                    control={<Switch checked={security.apiAccess} onChange={(e) => setSecurity((s) => ({ ...s, apiAccess: e.target.checked }))} />}
                    label="Allow personal API token access"
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                    <TextField size="small" label="2FA verification code" value={twoFactorSetupCode} onChange={(e) => setTwoFactorSetupCode(e.target.value)} />
                    {!security.twoFactorEnabled ? (
                      <Button onClick={enableTwoFactor}>Complete 2FA Setup</Button>
                    ) : (
                      <Button color="inherit" onClick={disableTwoFactor}>Disable 2FA</Button>
                    )}
                  </Stack>
                  <Alert severity={security.twoFactorEnabled ? "success" : "warning"} sx={{ mt: 1 }}>
                    {security.twoFactorEnabled ? "2FA enabled and protecting this account." : "2FA currently disabled. Enable for stronger account security."}
                  </Alert>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Password & Sessions</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1.25}>
                    <TextField size="small" type="password" label="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm((s) => ({ ...s, current: e.target.value }))} />
                    <TextField size="small" type="password" label="New password" value={passwordForm.next} onChange={(e) => setPasswordForm((s) => ({ ...s, next: e.target.value }))} />
                    <TextField size="small" type="password" label="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((s) => ({ ...s, confirm: e.target.value }))} />
                    <Stack direction="row" spacing={1}>
                      <Button onClick={updatePassword}>Update Password</Button>
                      <Button color="inherit" onClick={signOutOtherSessions}>Sign out other sessions</Button>
                    </Stack>
                    <Divider />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Active Sessions</Typography>
                    {activeSessions.map((session) => (
                      <Box key={session.id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>{session.device}</Typography>
                            <Typography variant="body2" color="text.secondary">{session.location}</Typography>
                          </Box>
                          <Stack alignItems="flex-end" spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">{session.lastSeen}</Typography>
                            {session.current ? <Chip size="small" label="Current" color="success" /> : null}
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent></Card>
              </Box>
            ) : null}

            {section === "settings" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Card><CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <NotificationsActiveIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Preferences & Notifications</Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <FormControl size="small" sx={{ mb: 1.25 }}>
                    <Select value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as "light" | "system" }))}>
                      <MenuItem value="light">Theme: Light</MenuItem>
                      <MenuItem value="system">Theme: System</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ mb: 1.25 }}>
                    <Select value={settings.currency} onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value as "USD" | "JPY" }))}>
                      <MenuItem value="USD">Currency: USD</MenuItem>
                      <MenuItem value="JPY">Currency: JPY</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel control={<Switch checked={settings.appraisalReady} onChange={(e) => setSettings((s) => ({ ...s, appraisalReady: e.target.checked }))} />} label="Appraisal-ready notifications" />
                  <FormControlLabel control={<Switch checked={settings.securityDigest} onChange={(e) => setSettings((s) => ({ ...s, securityDigest: e.target.checked }))} />} label="Security digests" />
                  <FormControlLabel control={<Switch checked={settings.compAlerts} onChange={(e) => setSettings((s) => ({ ...s, compAlerts: e.target.checked }))} />} label="Comp-drop notifications" />
                  <FormControlLabel control={<Switch checked={settings.productNews} onChange={(e) => setSettings((s) => ({ ...s, productNews: e.target.checked }))} />} label="Product updates and release notes" />
                  <FormControlLabel control={<Switch checked={settings.weeklyDigest} onChange={(e) => setSettings((s) => ({ ...s, weeklyDigest: e.target.checked }))} />} label="Weekly digest email" />
                  <Button sx={{ mt: 1 }} onClick={() => setAccountNotice("Settings saved.")}>Save Settings</Button>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Recent Alerts</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    {alertsFeed.map((a) => (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <Alert
                          severity={a.level}
                          action={<Button color="inherit" onClick={() => setAlertsFeed((s) => s.filter((x) => x.id !== a.id))}>Dismiss</Button>}
                        >
                          {a.text}
                        </Alert>
                      </motion.div>
                    ))}
                    {alertsFeed.length === 0 ? <Alert severity="success">No active alerts.</Alert> : null}
                  </Stack>
                </CardContent></Card>
              </Box>
            ) : null}
          </>
        )}
      </Stack>
    </Container>
  );
}

function UploadPanel({ locale }: { locale: Locale }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ photo_id: string; deduped: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setErr(null); setResult(null);
    try { setResult(await api.uploadPhoto(file)); }
    catch (e: any) { setErr(String(e?.message || e)); }
  }

  return (
    <Card><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "upload.title")}</Typography>
        <Chip size="small" icon={<PhotoCameraIcon />} label="Dedupe on" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t(locale, "upload.subtitle")}</Typography>
      <Divider sx={{ my: 2 }} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
        <input type="file" accept="image/*" aria-label="Choose a photo" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button onClick={upload} startIcon={<PhotoCameraIcon />} disabled={!file}>Upload</Button>
        {result ? <Chip color={result.deduped ? "warning" : "success"} label={`photo_id=${result.photo_id} • ${result.deduped ? "deduped" : "new"}`} /> : null}
      </Stack>
      {err ? <Typography sx={{ mt: 2 }} color="error">{err}</Typography> : null}
    </CardContent></Card>
  );
}

function ArtifactDetail({ locale, artifact }: { locale: Locale; artifact: Artifact }) {
  const [relatedArtifacts, setRelatedArtifacts] = useState<Artifact[]>([]);
  const [detailVariants, setDetailVariants] = useState<VariantRecord[]>([]);
  const [detailSales, setDetailSales] = useState<SaleRecord[]>([]);
  const [detailFamilies, setDetailFamilies] = useState<FamilyRecord[]>([]);
  const [detailPatterns, setDetailPatterns] = useState<PatternRecord[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const showEstimate = artifact.valuation_estimate != null;
  const showRange = artifact.valuation_low != null && artifact.valuation_high != null;
  const modelToken = String(artifact.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  useEffect(() => {
    const query = [artifact.brand_key || "", artifact.model_code || ""].join(" ").trim();
    if (!query) {
      setRelatedArtifacts([]);
      return;
    }
    api
      .artifacts(query, { photoMode: "none", limit: 40 })
      .then((rows) => {
        const linked = rows.filter((row) => row.id !== artifact.id).slice(0, 12);
        setRelatedArtifacts(linked);
      })
      .catch(() => setRelatedArtifacts([]));
  }, [artifact.brand_key, artifact.model_code, artifact.id]);
  useEffect(() => {
    api.variants().then(setDetailVariants).catch(() => setDetailVariants([]));
    api.families().then(setDetailFamilies).catch(() => setDetailFamilies([]));
    api.patterns().then(setDetailPatterns).catch(() => setDetailPatterns([]));
    api.sales().then(setDetailSales).catch(() => setDetailSales([]));
  }, []);

  const matchingVariants = detailVariants.filter((variant) => {
    if (artifact.brand_key && variant.brand_key !== artifact.brand_key) return false;
    if (!modelToken) return true;
    const variantToken = String(variant.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return variantToken === modelToken;
  });
  const linesForBrand = detailFamilies.filter((line) => !artifact.brand_key || line.brand_key === artifact.brand_key);
  const patternsForBrand = detailPatterns.filter((pattern) => !artifact.brand_key || pattern.brand_key === artifact.brand_key);
  const variantsForSelectedPattern = selectedVariantId
    ? matchingVariants.filter((variant) => variant.variant_id === selectedVariantId)
    : matchingVariants;
  const artifactsForSelectedVariant = (() => {
    if (!selectedVariantId) return [artifact, ...relatedArtifacts];
    const selected = matchingVariants.find((variant) => variant.variant_id === selectedVariantId);
    if (!selected) return [artifact, ...relatedArtifacts];
    const token = String(selected.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return [artifact, ...relatedArtifacts].filter((row) => String(row.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === token);
  })();
  const variantIds = new Set(matchingVariants.map((v) => v.variant_id));
  const pastTenSales = detailSales
    .filter((sale) => variantIds.has(sale.variant_id))
    .sort((a, b) => b.sale_date.localeCompare(a.sale_date))
    .slice(0, 10);
  const timeToSellDays = (sale: SaleRecord) => {
    const seed = parseInt((sale.sale_id || "0").replace(/\D/g, "").slice(-4) || "19", 10);
    return 6 + (seed % 68);
  };
  const availableNow = [artifact, ...relatedArtifacts]
    .filter((row) => Boolean(row.listing_url))
    .slice(0, 10);

  const title =
    artifact.object_type === "ARTIFACT"
      ? `${artifact.id} — Custom Artifact`
      : `${artifact.brand_key ?? "Unknown"} ${artifact.family ?? ""} ${artifact.model_code ?? ""}`.trim();

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                {artifact.position || "UNKNOWN"} • {artifact.size_in ? `${artifact.size_in}"` : "—"} • {artifact.made_in ? `Made in ${artifact.made_in}` : "Origin unknown"}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900 }} noWrap>{title}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                <Chip icon={<VerifiedIcon />} label={artifact.verification_status || "Unverified"} />
                <Chip icon={<LocalOfferIcon />} label={artifact.object_type === "ARTIFACT" ? "Artifact" : "Cataloged"} />
                <Chip label={`Condition: ${artifact.condition_score ?? "—"}`} />
              </Stack>
            </Box>
            <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
              <Typography variant="overline" color="text.secondary">{t(locale, "common.value")}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{showEstimate ? money(artifact.valuation_estimate) : "—"}</Typography>
              <Typography variant="body2" color="text.secondary">{showRange ? `${money(artifact.valuation_low)}–${money(artifact.valuation_high)}` : "Valuation unavailable"}</Typography>
            </Box>
          </Stack>
        </CardContent></Card>

        <UploadPanel locale={locale} />

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "common.photos")}</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2 }}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <img
                alt="Hero glove"
                src={artifact.photos?.find((p) => p.kind === "HERO")?.url || "https://placehold.co/1200x800/png?text=Glove+Photo"}
                style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              {(artifact.photos || []).filter((p) => p.kind !== "HERO").slice(0, 4).map((p) => (
                <Box key={p.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                  <img alt={p.kind} src={p.url} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                  <Box sx={{ p: 1 }}><Typography variant="caption" color="text.secondary">{p.kind}</Typography></Box>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Line Level (Under Brand)</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.1 }}>
            {linesForBrand.map((line) => (
              <Box key={line.family_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                <Box
                  component="img"
                  src={glovePlaceholderImage}
                  alt={`${line.display_name} manufacturer`}
                  sx={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 1.1, border: "1px solid", borderColor: "divider", mb: 0.8 }}
                />
                <Typography sx={{ fontWeight: 800 }}>{line.display_name}</Typography>
                <Typography variant="caption" color="text.secondary">{line.family_key} • tier {line.tier}</Typography>
              </Box>
            ))}
          </Box>
          {linesForBrand.length === 0 ? <Typography variant="body2" color="text.secondary">No line records for this brand yet.</Typography> : null}
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Pattern Level</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {patternsForBrand.map((pattern) => (
              <Box key={pattern.pattern_id} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                <Typography sx={{ fontWeight: 800 }}>{pattern.pattern_code} • {pattern.canonical_position}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pattern.pattern_id} • {pattern.pattern_system} • size {pattern.canonical_size_in || "—"} • web {pattern.canonical_web || "—"}
                </Typography>
                <Stack direction="row" spacing={0.6} sx={{ mt: 0.7, flexWrap: "wrap" }}>
                  {matchingVariants.filter((variant) => variant.pattern_id === pattern.pattern_id).map((variant) => (
                    <Chip
                      key={variant.variant_id}
                      size="small"
                      label={variant.variant_id}
                      color={selectedVariantId === variant.variant_id ? "primary" : "default"}
                      onClick={() => setSelectedVariantId(selectedVariantId === variant.variant_id ? null : variant.variant_id)}
                      clickable
                    />
                  ))}
                </Stack>
              </Box>
            ))}
            {patternsForBrand.length === 0 ? <Typography variant="body2" color="text.secondary">No pattern records for this brand yet.</Typography> : null}
          </Stack>
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Individual Variant Records</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {variantsForSelectedPattern.map((variant) => (
              <Box key={variant.variant_id} sx={{ p: 1.1, border: "1px solid", borderColor: selectedVariantId === variant.variant_id ? "primary.main" : "divider", borderRadius: 1.4 }}>
                <Typography sx={{ fontWeight: 800 }}>{variant.display_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {variant.variant_id} • {variant.brand_key} • {variant.model_code || "model n/a"} • {variant.year}
                  {variant.made_in ? ` • ${variant.made_in}` : ""}{variant.web ? ` • ${variant.web}` : ""}{variant.leather ? ` • ${variant.leather}` : ""}
                </Typography>
                <Button sx={{ mt: 0.7 }} onClick={() => setSelectedVariantId(selectedVariantId === variant.variant_id ? null : variant.variant_id)}>
                  {selectedVariantId === variant.variant_id ? "Hide artifacts" : "View artifact"}
                </Button>
              </Box>
            ))}
            {matchingVariants.length === 0 ? <Typography variant="body2" color="text.secondary">No variant records linked to this product yet.</Typography> : null}
          </Stack>
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Past 10 Sales</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {pastTenSales.map((sale) => (
              <Box key={sale.sale_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                <Typography sx={{ fontWeight: 800 }}>{sale.sale_id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {sale.sale_date} • {money(sale.price_usd)} • Time to sell: {timeToSellDays(sale)} days • {sale.source}
                </Typography>
              </Box>
            ))}
            {pastTenSales.length === 0 ? <Typography variant="body2" color="text.secondary">No sales history available for this product.</Typography> : null}
          </Stack>
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "common.available_now")}</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.2}>
            {availableNow.map((row) => (
              <Box key={row.id} sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} alignItems={{ md: "center" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{row.id}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(row.source || "source n/a")} • {(row.model_code || "model n/a")} • {(row.valuation_estimate != null ? money(row.valuation_estimate) : "Price n/a")}
                    </Typography>
                  </Box>
                  {row.listing_url ? (
                    <Button onClick={() => window.open(row.listing_url!, "_blank", "noopener,noreferrer")} endIcon={<OpenInNewIcon />}>Open listing</Button>
                  ) : null}
                </Stack>
              </Box>
            ))}
            {availableNow.length === 0 ? <Typography variant="body2" color="text.secondary">No active listing links available yet.</Typography> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            Referral relationships never influence valuation or rankings.
          </Typography>
        </CardContent></Card>

        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Related Artifacts In Product Page</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {artifactsForSelectedVariant.map((row) => (
              <Box key={row.id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                <Typography sx={{ fontWeight: 800 }}>{row.id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.brand_key || "Unknown"} • {row.model_code || "Unknown"} • {row.position || "Unknown"} • {row.size_in ? `${row.size_in}"` : "—"}
                </Typography>
              </Box>
            ))}
            {artifactsForSelectedVariant.length === 0 ? <Typography variant="body2" color="text.secondary">No artifacts linked for the selected variant.</Typography> : null}
          </Stack>
        </CardContent></Card>
      </Stack>
    </Container>
  );
}

function PricingScreen({ locale, onStartFree }: { locale: Locale; onStartFree: () => void; }) {
  const plans = [
    { name: "Collector", price: "$9/mo", bullets: ["Track 50 artifacts", "Range-only valuations", "Basic verification queue"] },
    { name: "Pro", price: "$19/mo", bullets: ["Estimate + range when eligible", "Advanced reports", "Priority verification queue"] },
    { name: "Dealer", price: "$39/mo", bullets: ["Bulk intake", "Team seats", "API and export tooling"] },
  ];
  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={{ xs: 1.5, md: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>{t(locale, "pricing.title")}</Typography>
        <Typography variant="body1" color="text.secondary">{t(locale, "pricing.subtitle")}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: { xs: 1.25, md: 2 } }}>
          {plans.map((p, idx) => (
            <Card
              key={p.name}
              sx={{
                minHeight: "100%",
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0px 4px 12px rgba(0,0,0,0.10)",
              }}
            ><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{p.name}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 1 }}>{p.price}</Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {p.bullets.map((b) => <Typography key={b} variant="body2">• {b}</Typography>)}
              </Stack>
              <Button
                sx={{
                  mt: 2,
                  width: "100%",
                  background: idx === 1 ? "linear-gradient(180deg, #0A84FF, #0073F0)" : undefined,
                }}
                onClick={onStartFree}
              >
                {t(locale, "pricing.cta")}
              </Button>
            </CardContent></Card>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}

export default function App() {
  const [colorMode, setColorMode] = useState<AppThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return (window.localStorage.getItem("gloveiq-theme-mode") as AppThemeMode) || "light";
  });
  const appTheme = useMemo(() => buildAppTheme(colorMode), [colorMode]);
  const [locale, setLocale] = useState<Locale>("en");
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname || "/search"));
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [patterns, setPatterns] = useState<PatternRecord[]>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [gloves, setGloves] = useState<Artifact[]>([]);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [lastArtifactId, setLastArtifactId] = useState<string | null>(null);

  useEffect(() => { api.brands().then(setBrands).catch(() => setBrands([])); }, []);
  useEffect(() => { api.families().then(setFamilies).catch(() => setFamilies([])); }, []);
  useEffect(() => { api.patterns().then(setPatterns).catch(() => setPatterns([])); }, []);
  useEffect(() => { api.variants().then(setVariants).catch(() => setVariants([])); }, []);
  useEffect(() => { api.sales().then(setSales).catch(() => setSales([])); }, []);
  useEffect(() => { api.artifacts(undefined, { photoMode: "hero" }).then(setGloves).catch(() => setGloves([])); }, []);
  useEffect(() => {
    window.localStorage.setItem("gloveiq-theme-mode", colorMode);
  }, [colorMode]);
  useEffect(() => {
    if (route.name === "artifactDetail") {
      setLastArtifactId(route.artifactId);
      api.artifact(route.artifactId).then(setArtifact).catch(() => setArtifact(null));
    } else {
      setArtifact(null);
    }
  }, [route]);
  useEffect(() => {
    const target = pathFromRoute(route);
    if (window.location.pathname !== target) window.history.pushState({}, "", target);
  }, [route]);
  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname || "/search"));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const activeTab = routeToTab(route);

  function onSelectTab(tab: MainTab) {
    if (tab === "artifact") {
      setRoute({ name: "artifacts" });
      return;
    }
    if (tab === "appraisal") {
      setRoute({ name: "appraisal" });
      return;
    }
    if (tab === "account") {
      setRoute({ name: "account" });
      return;
    }
    if (tab === "pricing") setRoute({ name: "pricing" });
    else setRoute({ name: "search" });
  }

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />

      <Box sx={{ minHeight: "100vh", p: { xs: 0, md: 1.5 }, pb: { xs: 8, md: 1.5 } }}>
        <Box
          sx={{
            minHeight: { xs: "100vh", md: "calc(100vh - 24px)" },
            borderRadius: { xs: 0, md: 2.5 },
            overflow: "hidden",
            border: { xs: "none", md: "1px solid" },
            borderColor: { xs: "transparent", md: "divider" },
            boxShadow: (theme) => ({
              xs: "none",
              md: theme.palette.mode === "dark" ? "0 22px 52px rgba(0,0,0,0.5)" : "0 18px 44px rgba(15,23,42,0.14)",
            }),
            backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(28,28,30,0.84)" : "rgba(255,255,255,0.84)",
            backdropFilter: "blur(24px) saturate(135%)",
          }}
        >
          <Box sx={{ minHeight: "100%", display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" } }}>
            <SidebarNav
              locale={locale}
              activeTab={activeTab}
              canOpenArtifact={true}
              colorMode={colorMode}
              onToggleColorMode={() => setColorMode((m) => (m === "light" ? "dark" : "light"))}
              onSelect={onSelectTab}
            />

            <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Box sx={{ flex: 1, overflow: "auto", pb: { xs: 11, md: 2 } }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={route.name === "artifactDetail" ? route.artifactId : route.name}
                    initial={{ x: 14, opacity: 0.6 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -10, opacity: 0.6 }}
                    transition={NAV_SPRING}
                  >
                    {route.name === "search" ? (
                      <SearchScreen
                        locale={locale}
                        brands={brands}
                        families={families}
                        patterns={patterns}
                        onOpenArtifact={(id) => {
                          setLastArtifactId(id);
                          setRoute({ name: "artifactDetail", artifactId: id });
                        }}
                      />
                    ) : route.name === "artifacts" ? (
                      <SearchResultsPage
                        variants={variants}
                        gloves={gloves}
                        sales={sales}
                        onNavigate={(next) => setRoute(next)}
                      />
                    ) : route.name === "appraisal" ? (
                      <AppraisalScreen locale={locale} />
                    ) : route.name === "account" ? (
                      <AccountScreen locale={locale} />
                    ) : route.name === "artifactDetail" ? (
                      artifact ? (
                        <ArtifactDetail locale={locale} artifact={artifact} />
                      ) : (
                        <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
                          <Card><CardContent>
                            <Typography sx={{ fontWeight: 900 }}>Loading artifact…</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Make sure API is running at http://localhost:8787</Typography>
                            <Button sx={{ mt: 2 }} onClick={() => setRoute({ name: "search" })}>Back to Search</Button>
                          </CardContent></Card>
                        </Container>
                      )
                    ) : route.name === "variantProfile" ? (
                      (() => {
                        const found = variants.find((v) => v.variant_id === route.variantId);
                        if (!found) {
                          return (
                            <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
                              <Card><CardContent>
                                <Typography sx={{ fontWeight: 900 }}>Variant not found</Typography>
                                <Button sx={{ mt: 2 }} onClick={() => setRoute({ name: "search" })}>Back to Search</Button>
                              </CardContent></Card>
                            </Container>
                          );
                        }
                        const related = gloves.filter((g) => String(g.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === String(found.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));
                        return <VariantProfilePage variant={found} relatedGloves={related} sales={sales} />;
                      })()
                    ) : route.name === "gloveProfile" ? (
                      (() => {
                        const found = gloves.find((g) => g.id === route.gloveId);
                        if (!found) {
                          return (
                            <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
                              <Card><CardContent>
                                <Typography sx={{ fontWeight: 900 }}>Glove not found</Typography>
                                <Button sx={{ mt: 2 }} onClick={() => setRoute({ name: "search" })}>Back to Search</Button>
                              </CardContent></Card>
                            </Container>
                          );
                        }
                        const related = variants.filter((v) => String(v.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === String(found.model_code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));
                        return <GloveProfilePage glove={found} relatedVariants={related} sales={sales} />;
                      })()
                    ) : (
                      <PricingScreen locale={locale} onStartFree={() => setRoute({ name: "search" })} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <MobileBottomNav locale={locale} activeTab={activeTab} canOpenArtifact={true} onSelect={onSelectTab} />
    </ThemeProvider>
  );
}
