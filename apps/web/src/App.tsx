import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type CompRecord, type FamilyRecord, type PatternRecord, type SaleRecord, type VariantRecord } from "./lib/api";
import type { Artifact, BrandConfig } from "@gloveiq/shared";
import { Locale, t } from "./i18n/strings";
import { Card, CardContent, Button, Input } from "./ui/Primitives";
import { buildAppTheme, type AppThemeMode } from "./ui/theme";
import { MainTab, MobileBottomNav, SidebarNav } from "./ui/Shell";

import {
  Alert,
  Avatar,
  Box,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Dialog,
  FormControl,
  FormControlLabel,
  LinearProgress,
  MenuItem,
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
import SecurityIcon from "@mui/icons-material/Security";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import glovePlaceholderImage from "./assets/baseball-glove-placeholder.svg";
import aiLabelSchema from "./data/ai-label-schema.json";
import aiTaxonomy from "./data/ai-taxonomy.json";

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
  if (route.name === "artifacts" || route.name === "artifactDetail") return "artifact";
  if (route.name === "appraisal") return "appraisal";
  if (route.name === "account") return "account";
  return route.name;
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

function brandLogoMark(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Artifact[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "cataloged" | "artifact">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [brandFilter, setBrandFilter] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "value_desc" | "value_asc" | "condition_desc">("relevance");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  async function refresh(query?: string) {
    setLoading(true); setErr(null);
    try { setRows(await api.artifacts(query)); }
    catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(""); }, []);

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

  const filteredFamilies = families
    .filter((f) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return `${f.display_name} ${f.family_key} ${f.brand_key} ${f.tier}`.toLowerCase().includes(query);
    })
    .slice(0, 18);

  const filteredPatterns = patterns
    .filter((p) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return `${p.pattern_code} ${p.brand_key} ${p.canonical_position} ${p.canonical_web || ""}`.toLowerCase().includes(query);
    })
    .slice(0, 24);

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
            <Chip label={`${filtered.length} shown`} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,0.8fr)", gap: 1, px: 1, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">Artifact</Typography>
            <Typography variant="caption" color="text.secondary">Verification</Typography>
            <Typography variant="caption" color="text.secondary">Valuation</Typography>
            <Typography variant="caption" color="text.secondary" align="right">Action</Typography>
          </Box>
          <Stack spacing={1}>
            {filtered.map((a) => {
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
            {!loading && filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No records matched your search and filters.</Typography>
            ) : null}
          </Stack>
        </CardContent></Card>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Family Catalog</Typography>
            <Chip label={`${filteredFamilies.length} shown`} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.1 }}>
            {filteredFamilies.map((family) => (
              <Box key={family.family_id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.75 }}>
                <Typography sx={{ fontWeight: 800 }}>{family.display_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {family.brand_key} • {family.family_key} • {family.tier}
                </Typography>
              </Box>
            ))}
            {filteredFamilies.length === 0 ? <Typography variant="body2" color="text.secondary">No families match current search.</Typography> : null}
          </Box>
        </CardContent></Card>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Pattern Catalog</Typography>
            <Chip label={`${filteredPatterns.length} shown`} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {filteredPatterns.map((pattern) => (
              <Box key={pattern.pattern_id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1.75 }}>
                <Typography sx={{ fontWeight: 800 }}>{pattern.pattern_code}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {pattern.brand_key} • {pattern.canonical_position} • {pattern.canonical_size_in ? `${pattern.canonical_size_in}"` : "size n/a"}
                  {pattern.canonical_web ? ` • ${pattern.canonical_web}` : ""}
                </Typography>
              </Box>
            ))}
            {filteredPatterns.length === 0 ? <Typography variant="body2" color="text.secondary">No patterns match current search.</Typography> : null}
          </Stack>
        </CardContent></Card>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Brand Seeds</Typography>
            <Chip label={seededBrands.length} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
            {seededBrands.map((b) => (
              <Box key={b.brand_key} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                {(() => {
                  const details = BRAND_COMPANY_INFO[b.brand_key] || {
                    company: `${b.display_name} Brand Team`,
                    contact: "support@brand.example",
                  };
                  return (
                    <>
                      <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 0.25 }}>
                        <Avatar
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
                          {brandLogoMark(b.display_name)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 900 }}>{b.display_name}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">Country hint: {b.country_hint || "—"}</Typography>
                      <Typography variant="body2" color="text.secondary">Company: {details.company}</Typography>
                      <Typography variant="body2" color="text.secondary">Contact: {details.contact}</Typography>
                    </>
                  );
                })()}
              </Box>
            ))}
          </Box>
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
                {previewImage.title}
              </Typography>
              <Box
                component="img"
                src={previewImage.src}
                alt={`${previewImage.title} preview`}
                sx={{ width: "100%", borderRadius: 1.5, border: "1px solid", borderColor: "divider", display: "block", maxHeight: "72vh", objectFit: "contain" }}
              />
            </Box>
          ) : null}
        </Dialog>
      </Stack>
    </Container>
  );
}

type IntakeAngle = "PALM" | "BACKHAND" | "WEB" | "HEEL_STAMP" | "LINER_STAMP";
type ConfidenceBand = "Low" | "Medium" | "High";

const INTAKE_ANGLE_DEFS: Array<{ key: IntakeAngle; label: string; required: boolean; hint: string }> = [
  { key: "PALM", label: "Palm", required: true, hint: "Shows pocket wear and break-in." },
  { key: "BACKHAND", label: "Backhand", required: true, hint: "Confirms shell shape and lacing." },
  { key: "WEB", label: "Web", required: true, hint: "Important for pattern and model family." },
  { key: "HEEL_STAMP", label: "Heel stamp / model code", required: true, hint: "High-value signal for identity and era." },
  { key: "LINER_STAMP", label: "Interior liner stamp", required: false, hint: "Improves confidence and narrows valuation." },
];

function AppraisalIntakeWidget({ locale }: { locale: Locale }) {
  const [step, setStep] = useState(1);
  const [filesByAngle, setFilesByAngle] = useState<Partial<Record<IntakeAngle, File | null>>>({});
  const [uploadingByAngle, setUploadingByAngle] = useState<Partial<Record<IntakeAngle, boolean>>>({});
  const [uploadedByAngle, setUploadedByAngle] = useState<Partial<Record<IntakeAngle, { photoId: string; deduped: boolean }>>>({});
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [listingLink, setListingLink] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitted">("idle");
  const [catalogRecords, setCatalogRecords] = useState<Array<{ id: string; summary: Record<string, unknown> }>>([]);

  const [identity, setIdentity] = useState({
    brand: "Rawlings",
    model: "PRO1000",
    pattern: "PRO1000",
    size: "11.5",
    throwSide: "RHT",
    web: "I-Web",
    note: "",
  });
  const [variant, setVariant] = useState({
    country: "UNKNOWN",
    leather: "UNKNOWN",
    era: "UNKNOWN",
    specialStamp: "",
  });
  const [condition, setCondition] = useState({
    relaced: "unknown",
    repairs: "none",
    cosmeticWear: "medium",
    palmIntegrity: 62,
    structureRetention: 64,
  });

  const taxonomy = aiTaxonomy as any;
  const schemaVersion = (aiLabelSchema as any)?.$id ? "v1.0.0" : "v0.0.0";
  const brandOptions: string[] = [
    ...(taxonomy?.brand_enum?.global || []),
    ...(taxonomy?.brand_enum?.japan_dominant_or_only || []),
  ];
  const leatherLineOptions: string[] = taxonomy?.leather_taxonomy?.leather_line_enum || [];

  const requiredAngles = INTAKE_ANGLE_DEFS.filter((d) => d.required).map((d) => d.key);
  const uploadedRequiredCount = requiredAngles.filter((a) => uploadedByAngle[a]).length;
  const evidenceReady = uploadedRequiredCount === requiredAngles.length;
  const unknownIdentityCount = [identity.brand, identity.model, identity.pattern, identity.size, identity.throwSide, identity.web]
    .filter((v) => !v || String(v).toUpperCase() === "UNKNOWN").length;
  const unknownVariantCount = [variant.country, variant.leather, variant.era]
    .filter((v) => !v || String(v).toUpperCase() === "UNKNOWN").length;
  const decisionState = !evidenceReady
    ? "needs_more_photos"
    : unknownIdentityCount + unknownVariantCount >= 3
      ? "needs_artifact_review"
      : "ai_proposed";
  const decisionReason = !evidenceReady
    ? "Evidence-first rule: required photo slots are incomplete."
    : unknownIdentityCount + unknownVariantCount >= 3
      ? "No-guessing rule: too many unknown fields require manual review."
      : "Sufficient evidence and taxonomy inputs for AI proposal.";

  const confidenceScore = useMemo(() => {
    const evidencePct = uploadedRequiredCount / requiredAngles.length;
    const unknownPenalty = (unknownIdentityCount + unknownVariantCount) * 0.05;
    const decisionBonus = decisionState === "ai_proposed" ? 0.14 : decisionState === "needs_artifact_review" ? 0.04 : -0.08;
    return Math.max(0.05, Math.min(0.95, evidencePct * 0.62 + 0.32 + decisionBonus - unknownPenalty));
  }, [uploadedRequiredCount, requiredAngles.length, unknownIdentityCount, unknownVariantCount, decisionState]);
  const confidenceBand: ConfidenceBand = confidenceScore >= 0.8 ? "High" : confidenceScore >= 0.5 ? "Medium" : "Low";

  const conditionScore = useMemo(() => {
    let score = ((condition.palmIntegrity + condition.structureRetention) / 2) / 10;
    if (condition.relaced === "full") score -= 0.6;
    if (condition.relaced === "partial") score -= 0.25;
    if (condition.repairs === "major") score -= 0.9;
    if (condition.repairs === "minor") score -= 0.35;
    if (condition.cosmeticWear === "high") score -= 0.55;
    if (condition.cosmeticWear === "low") score += 0.2;
    return Math.max(1, Math.min(9.7, Number(score.toFixed(1))));
  }, [condition]);

  const estimate = useMemo(() => {
    const base = 320;
    const conditionAdj = (conditionScore - 7) * 18;
    const confidenceAdj = confidenceBand === "High" ? 18 : confidenceBand === "Medium" ? 0 : -24;
    const point = Math.max(120, Math.round(base + conditionAdj + confidenceAdj));
    const spread = confidenceBand === "High" ? 45 : confidenceBand === "Medium" ? 70 : 105;
    return { point, low: point - spread, high: point + spread };
  }, [conditionScore, confidenceBand]);

  async function uploadAngle(angle: IntakeAngle) {
    const file = filesByAngle[angle];
    if (!file) return;
    setUploadErr(null);
    setUploadingByAngle((s) => ({ ...s, [angle]: true }));
    try {
      const out = await api.uploadPhoto(file);
      setUploadedByAngle((s) => ({ ...s, [angle]: { photoId: out.photo_id, deduped: out.deduped } }));
    } catch (e: any) {
      setUploadErr(String(e?.message || e));
    } finally {
      setUploadingByAngle((s) => ({ ...s, [angle]: false }));
    }
  }

  function changeStep(n: number) {
    setStep(Math.max(1, Math.min(5, n)));
  }

  function buildVerificationSummary() {
    const now = new Date().toISOString();
    return {
      version: schemaVersion,
      label_sets: {
        identity: {
          brand: identity.brand || "UNKNOWN",
          family: { id: identity.model || "UNKNOWN", name: identity.model || "UNKNOWN" },
          pattern: { id: identity.pattern || "UNKNOWN", code: identity.pattern || "UNKNOWN", system: "explicit_coded" },
          variant: { id: variant.era || "UNKNOWN", name: variant.specialStamp || "UNKNOWN", type: "designation_only" },
        },
      },
      evidence: {
        photo_slots: {
          palm: Boolean(uploadedByAngle.PALM),
          heel: Boolean(uploadedByAngle.HEEL_STAMP),
          web: Boolean(uploadedByAngle.WEB),
          wrist: Boolean(uploadedByAngle.BACKHAND),
          label_tag: Boolean(uploadedByAngle.LINER_STAMP),
          overall: Boolean(uploadedByAngle.BACKHAND),
        },
      },
      confidence: {
        tier: confidenceBand.toLowerCase().slice(0, 3),
        score: Number(confidenceScore.toFixed(3)),
        basis: [
          `required_evidence_uploaded=${uploadedRequiredCount}/${requiredAngles.length}`,
          `decision_state=${decisionState}`,
          `condition_score=${conditionScore}`,
        ],
      },
      verification: {
        state: decisionState,
        history: [{ at: now, actor: "user", from: "unverified", to: decisionState, reason: decisionReason }],
      },
      pricing: { point_estimate: estimate.point, low: estimate.low, high: estimate.high },
      listing_link: listingLink || null,
    } as Record<string, unknown>;
  }

  function catalogCurrentSummary() {
    const summary = buildVerificationSummary();
    const id = `CAT-${Math.floor(100000 + Math.random() * 899999)}`;
    setCatalogRecords((s) => [{ id, summary }, ...s]);
    setSubmitState("submitted");
  }

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Pipeline Flow Test</Typography>
            <Typography variant="body2" color="text.secondary">Upload → Input → Decide → Score & Price → Catalog (attachments ingested).</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {[
              { n: 1, label: "Upload" },
              { n: 2, label: "Input" },
              { n: 3, label: "Decide" },
              { n: 4, label: "Score & Price" },
              { n: 5, label: "Catalog" },
            ].map((s) => (
              <Chip key={s.n} label={s.label} color={step === s.n ? "primary" : "default"} onClick={() => changeStep(s.n)} clickable />
            ))}
          </Stack>
        </Stack>
      </CardContent></Card>

      {step === 1 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Upload</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Evidence-first: upload required angles before decision and pricing.</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {INTAKE_ANGLE_DEFS.map((angle) => (
              <Box key={angle.key} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{angle.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{angle.hint}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <input type="file" accept="image/*" aria-label={`Upload ${angle.label}`} onChange={(e) => setFilesByAngle((s) => ({ ...s, [angle.key]: e.target.files?.[0] || null }))} />
                    <Button disabled={!filesByAngle[angle.key] || Boolean(uploadingByAngle[angle.key])} onClick={() => uploadAngle(angle.key)}>
                      {uploadingByAngle[angle.key] ? "Uploading..." : "Upload"}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
            <TextField size="small" label="Optional listing link" value={listingLink} onChange={(e) => setListingLink(e.target.value)} />
            <Chip label={`${uploadedRequiredCount}/${requiredAngles.length} required evidence uploaded`} color={evidenceReady ? "success" : "warning"} />
          </Stack>
          {uploadErr ? <Typography color="error" sx={{ mt: 1.25 }}>{uploadErr}</Typography> : null}
        </CardContent></Card>
      ) : null}

      {step === 2 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Input</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Use taxonomy enums; keep unknown explicit when uncertain.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 1.25 }}>
            <FormControl size="small">
              <Select value={identity.brand} onChange={(e) => setIdentity((s) => ({ ...s, brand: String(e.target.value) }))}>
                {["UNKNOWN", ...brandOptions].map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Model code" value={identity.model} onChange={(e) => setIdentity((s) => ({ ...s, model: e.target.value }))} size="small" />
            <TextField label="Pattern code" value={identity.pattern} onChange={(e) => setIdentity((s) => ({ ...s, pattern: e.target.value }))} size="small" />
            <TextField label="Size (inches)" value={identity.size} onChange={(e) => setIdentity((s) => ({ ...s, size: e.target.value }))} size="small" />
            <FormControl size="small">
              <Select value={identity.throwSide} onChange={(e) => setIdentity((s) => ({ ...s, throwSide: String(e.target.value) }))}>
                <MenuItem value="RHT">RHT</MenuItem>
                <MenuItem value="LHT">LHT</MenuItem>
                <MenuItem value="UNKNOWN">UNKNOWN</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Web type" value={identity.web} onChange={(e) => setIdentity((s) => ({ ...s, web: e.target.value }))} size="small" />
            <FormControl size="small">
              <Select value={variant.country} onChange={(e) => setVariant((s) => ({ ...s, country: String(e.target.value) }))}>
                {["UNKNOWN", ...(taxonomy?.leather_taxonomy?.leather_origin_enum || [])].map((c: string) => <MenuItem key={c} value={String(c).toUpperCase()}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={variant.leather} onChange={(e) => setVariant((s) => ({ ...s, leather: String(e.target.value) }))}>
                {["UNKNOWN", ...leatherLineOptions].map((l) => <MenuItem key={l} value={String(l).toUpperCase()}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={variant.era} onChange={(e) => setVariant((s) => ({ ...s, era: String(e.target.value) }))}>
                {["UNKNOWN", "1990s", "2000s", "2010s+", "2020s+"].map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Stamp/patch cue" value={variant.specialStamp} onChange={(e) => setVariant((s) => ({ ...s, specialStamp: e.target.value }))} size="small" />
          </Box>
        </CardContent></Card>
      ) : null}

      {step === 3 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Decide</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Decision engine applies taxonomy rules before scoring/pricing.</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            <Box sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Decision State</Typography>
              <Typography sx={{ fontWeight: 900 }}>{decisionState}</Typography>
              <Typography variant="body2" color="text.secondary">{decisionReason}</Typography>
            </Box>
            <Box sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Active Rules</Typography>
              <Typography variant="body2">evidence_first={String(taxonomy?.rules?.evidence_first)} • no_guessing={String(taxonomy?.rules?.no_guessing)} • unknown_explicit={taxonomy?.rules?.unknown_explicit}</Typography>
            </Box>
          </Stack>
        </CardContent></Card>
      ) : null}

      {step === 4 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Score & Price</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Condition and confidence combine into score and price range.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr" }, gap: 1.5 }}>
            <Stack spacing={1.2}>
              <FormControl size="small">
                <Select value={condition.relaced} onChange={(e) => setCondition((s) => ({ ...s, relaced: String(e.target.value) }))}>
                  <MenuItem value="unknown">Relaced: Unknown</MenuItem>
                  <MenuItem value="none">No relace</MenuItem>
                  <MenuItem value="partial">Partial relace</MenuItem>
                  <MenuItem value="full">Full relace</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small">
                <Select value={condition.repairs} onChange={(e) => setCondition((s) => ({ ...s, repairs: String(e.target.value) }))}>
                  <MenuItem value="none">Repairs: None</MenuItem>
                  <MenuItem value="minor">Repairs: Minor</MenuItem>
                  <MenuItem value="major">Repairs: Major</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small">
                <Select value={condition.cosmeticWear} onChange={(e) => setCondition((s) => ({ ...s, cosmeticWear: String(e.target.value) }))}>
                  <MenuItem value="low">Cosmetic wear: Low</MenuItem>
                  <MenuItem value="medium">Cosmetic wear: Medium</MenuItem>
                  <MenuItem value="high">Cosmetic wear: High</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="caption" color="text.secondary">Palm integrity</Typography>
                <Slider value={condition.palmIntegrity} onChange={(_, v) => setCondition((s) => ({ ...s, palmIntegrity: Number(v) }))} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Structure retention</Typography>
                <Slider value={condition.structureRetention} onChange={(_, v) => setCondition((s) => ({ ...s, structureRetention: Number(v) }))} />
              </Box>
            </Stack>
            <Box sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Output</Typography>
              <Typography sx={{ fontWeight: 900 }}>Confidence: {confidenceBand} ({Math.round(confidenceScore * 100)}%)</Typography>
              <Typography sx={{ fontWeight: 900 }}>Condition: {conditionScore.toFixed(1)} / 10</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{money(estimate.low)} – {money(estimate.high)}</Typography>
              <Typography variant="body2" color="text.secondary">Point estimate: {money(estimate.point)}</Typography>
            </Box>
          </Box>
        </CardContent></Card>
      ) : null}

      {step === 5 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Catalog</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Create a schema-shaped verification summary and catalog test records.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box component="pre" sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.25, bgcolor: "background.default", fontSize: 11, maxHeight: 260, overflow: "auto" }}>
            {JSON.stringify(buildVerificationSummary(), null, 2)}
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
            <Button onClick={catalogCurrentSummary}>Catalog Record</Button>
            <Button color="inherit" onClick={() => changeStep(1)}>Reset Flow</Button>
          </Stack>
          {submitState === "submitted" ? (
            <Stack spacing={0.8} sx={{ mt: 1.2 }}>
              <Typography color="success.main">Catalog updated with {catalogRecords.length} test record(s).</Typography>
              {catalogRecords.slice(0, 3).map((r) => (
                <Box key={r.id} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                  <Typography sx={{ fontWeight: 800 }}>{r.id}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {String((r.summary.verification as any)?.state || "unknown")} • {String((r.summary.confidence as any)?.tier || "low")}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : null}
        </CardContent></Card>
      ) : null}

      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button color="inherit" disabled={step === 1} onClick={() => changeStep(step - 1)}>Back</Button>
        <Button disabled={step === 5} onClick={() => changeStep(step + 1)}>Next</Button>
      </Stack>
    </Stack>
  );
}

function ArtifactsScreen({ locale, onOpenArtifact }: { locale: Locale; onOpenArtifact: (id: string) => void; }) {
  const [rows, setRows] = useState<Artifact[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRecord[]>([]);
  const [compRows, setCompRows] = useState<CompRecord[]>([]);
  const [saleRows, setSaleRows] = useState<SaleRecord[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "verified" | "unverified">("all");
  const [view, setView] = useState<"overview" | "catalog" | "verification">("catalog");
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
    try { setRows(await api.artifacts(query)); }
    catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(""); }, []);
  useEffect(() => {
    api.variants().then(setVariantRows).catch(() => setVariantRows([]));
    api.comps().then(setCompRows).catch(() => setCompRows([]));
    api.sales().then(setSaleRows).catch(() => setSaleRows([]));
  }, []);

  const filtered = rows.filter((row) => {
    const query = q.trim().toLowerCase();
    const hay = `${row.id} ${row.brand_key ?? ""} ${row.family ?? ""} ${row.model_code ?? ""} ${row.verification_status ?? ""}`.toLowerCase();
    const queryOk = query.length === 0 || hay.includes(query);
    if (!queryOk) return false;
    if (status === "all") return true;
    const isVerified = String(row.verification_status ?? "").toLowerCase().includes("verified");
    return status === "verified" ? isVerified : !isVerified;
  });
  const filteredVariants = variantRows
    .filter((v) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return `${v.display_name} ${v.variant_id} ${v.model_code || ""} ${v.brand_key} ${v.year}`.toLowerCase().includes(query);
    })
    .slice(0, 50);
  const filteredComps = compRows
    .filter((c) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return `${c.comp_set_id} ${c.artifact_id} ${c.method}`.toLowerCase().includes(query);
    })
    .slice(0, 40);
  const filteredSales = saleRows
    .filter((s) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return `${s.sale_id} ${s.variant_id} ${s.brand_key} ${s.source}`.toLowerCase().includes(query);
    })
    .slice(0, 60);

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
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, "search.placeholder")} aria-label={t(locale, "tab.artifact")} />
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
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Artifact Records</Typography>
                <Chip label={`${filtered.length} shown`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.25}>
                {filtered.map((a) => {
                  const verified = isVerified(a);
                  const showEstimate = a.valuation_estimate != null;
                  const thumb = a.photos?.[0]?.url || glovePlaceholderImage;
                  return (
                    <Box
                      key={a.id}
                      sx={{ p: 1.75, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                    >
                      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                              role="button"
                              tabIndex={0}
                              onClick={() => setVariantPreviewImage({ src: thumb, title: a.id })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setVariantPreviewImage({ src: thumb, title: a.id });
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
                              <Box component="img" src={thumb} alt={`${a.id} thumbnail`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
                              <Typography sx={{ fontWeight: 900 }} noWrap>{a.id}</Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {(a.brand_key || "Unknown")} • {(a.family || "—")} {(a.model_code || "")} • {(a.made_in || "Unknown")}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                            <Chip size="small" label={a.object_type === "ARTIFACT" ? "Artifact" : "Cataloged"} />
                            <Chip size="small" label={verified ? "Verified" : "Needs Review"} color={verified ? "success" : "warning"} />
                            <Chip size="small" label={`Condition ${a.condition_score ?? "—"}`} />
                          </Stack>
                        </Box>
                        <Stack direction={{ xs: "row", md: "column" }} spacing={1} alignItems={{ xs: "center", md: "flex-end" }}>
                          <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                            <Typography sx={{ fontWeight: 900 }}>{showEstimate ? money(a.valuation_estimate) : "—"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {a.valuation_low != null && a.valuation_high != null ? `${money(a.valuation_low)}–${money(a.valuation_high)}` : "Range unavailable"}
                            </Typography>
                          </Box>
                          <Button onClick={() => onOpenArtifact(a.id)}>Open</Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
                {filtered.length === 0 && !loading ? (
                  <Typography variant="body2" color="text.secondary">No variants match the current filters.</Typography>
                ) : null}
              </Stack>
            </CardContent></Card>

            <Card><CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Variant Catalog</Typography>
                <Chip label={`${filteredVariants.length} shown`} />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {filteredVariants.map((variant) => (
                  <Box key={variant.variant_id} sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 1.6 }}>
                    <Typography sx={{ fontWeight: 800 }}>{variant.display_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {variant.variant_id} • {variant.brand_key} • {variant.model_code || "model n/a"} • {variant.year}
                      {variant.made_in ? ` • ${variant.made_in}` : ""}
                    </Typography>
                  </Box>
                ))}
                {filteredVariants.length === 0 ? <Typography variant="body2" color="text.secondary">No variants match the current query.</Typography> : null}
              </Stack>
            </CardContent></Card>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5 }}>
              <Card><CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Comp Sets</Typography>
                  <Chip label={`${filteredComps.length} shown`} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {filteredComps.map((comp) => (
                    <Box key={comp.comp_set_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                      <Typography sx={{ fontWeight: 800 }}>{comp.comp_set_id}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Artifact {comp.artifact_id} • {comp.method} • {comp.sales_ids.length} linked sales
                      </Typography>
                    </Box>
                  ))}
                  {filteredComps.length === 0 ? <Typography variant="body2" color="text.secondary">No comp sets match current query.</Typography> : null}
                </Stack>
              </CardContent></Card>

              <Card><CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Sales Feed</Typography>
                  <Chip label={`${filteredSales.length} shown`} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {filteredSales.map((sale) => (
                    <Box key={sale.sale_id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 1.4 }}>
                      <Typography sx={{ fontWeight: 800 }}>{sale.sale_id}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sale.brand_key} • {money(sale.price_usd)} • {sale.sale_date} • {sale.source}
                      </Typography>
                    </Box>
                  ))}
                  {filteredSales.length === 0 ? <Typography variant="body2" color="text.secondary">No sales match current query.</Typography> : null}
                </Stack>
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
            Upload your glove photos, provide structured evidence, and submit for an appraisal-grade market estimate.
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
  const showEstimate = artifact.valuation_estimate != null;
  const showRange = artifact.valuation_low != null && artifact.valuation_high != null;

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
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "common.available_now")}</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.5}>
            {[
              { id: "r1", label: "Dealer Inventory", price: 525, risk: "Low" },
              { id: "r2", label: "eBay Listing", price: 465, risk: "Medium" },
              { id: "r3", label: "SidelineSwap", price: 510, risk: "Medium" },
            ].map((r) => (
              <Box key={r.id} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{r.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{money(r.price)} • Risk: {r.risk}</Typography>
                  </Box>
                  <Button endIcon={<OpenInNewIcon />}>View</Button>
                </Stack>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            Referral relationships never influence valuation or rankings.
          </Typography>
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
                  background: idx === 1 ? "linear-gradient(180deg, #3763E9, #314FC7)" : undefined,
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
  const [route, setRoute] = useState<Route>({ name: "search" });
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [patterns, setPatterns] = useState<PatternRecord[]>([]);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [lastArtifactId, setLastArtifactId] = useState<string | null>(null);

  useEffect(() => { api.brands().then(setBrands).catch(() => setBrands([])); }, []);
  useEffect(() => { api.families().then(setFamilies).catch(() => setFamilies([])); }, []);
  useEffect(() => { api.patterns().then(setPatterns).catch(() => setPatterns([])); }, []);
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
              md: theme.palette.mode === "dark" ? "0 22px 52px rgba(0,0,0,0.45)" : "0 18px 44px rgba(17,24,39,0.10)",
            }),
            backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(18,24,38,0.92)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(22px) saturate(120%)",
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
                      <ArtifactsScreen
                        locale={locale}
                        onOpenArtifact={(id) => {
                          setLastArtifactId(id);
                          setRoute({ name: "artifactDetail", artifactId: id });
                        }}
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
