import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./lib/api";
import type { Artifact, BrandConfig } from "@gloveiq/shared";
import { Locale, t } from "./i18n/strings";
import { Card, CardContent, Button, Input } from "./ui/Primitives";
import { appTheme } from "./ui/theme";
import { MainTab, MobileBottomNav, ShellTopBar, SidebarNav } from "./ui/Shell";

import {
  Alert,
  Avatar,
  Box,
  Chip,
  Container,
  CssBaseline,
  Divider,
  FormControl,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SecurityIcon from "@mui/icons-material/Security";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const NAV_SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;

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

function SearchScreen({ locale, brands, onOpenArtifact }: { locale: Locale; brands: BrandConfig[]; onOpenArtifact: (id: string) => void; }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Artifact[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "cataloged" | "artifact">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [brandFilter, setBrandFilter] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "value_desc" | "value_asc" | "condition_desc">("relevance");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const total = rows.length;
  const verifiedCount = rows.filter(isVerified).length;
  const p0ReadyCount = rows.filter((row) => readiness(row).p0Ready).length;
  const valuationReadyCount = rows.filter((row) => readiness(row).p0Ready && row.valuation_estimate != null).length;
  const averageEstimate =
    rows.filter((row) => row.valuation_estimate != null).reduce((sum, row) => sum + Number(row.valuation_estimate || 0), 0) /
    Math.max(1, rows.filter((row) => row.valuation_estimate != null).length);

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
              <Button onClick={() => refresh(q)} startIcon={<SearchIcon />}>Search</Button>
              <Button color="inherit" onClick={() => { setQ(""); refresh(""); }}>Clear</Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
            {quickQueries.map((qq) => (
              <Chip key={qq} size="small" label={qq} onClick={() => { setQ(qq); refresh(qq); }} clickable />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
            <Chip label={`Type: ${typeFilter}`} color="primary" variant="outlined" />
            <Chip label={`Verification: ${verificationFilter}`} color="primary" variant="outlined" />
            <Chip label={`Brand: ${brandFilter}`} color="primary" variant="outlined" />
            <Chip label={`Sort: ${sortBy}`} color="primary" variant="outlined" />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip label="All types" color={typeFilter === "all" ? "primary" : "default"} onClick={() => setTypeFilter("all")} clickable />
            <Chip label="Cataloged only" color={typeFilter === "cataloged" ? "primary" : "default"} onClick={() => setTypeFilter("cataloged")} clickable />
            <Chip label="Artifacts only" color={typeFilter === "artifact" ? "primary" : "default"} onClick={() => setTypeFilter("artifact")} clickable />
            <Chip label="All statuses" color={verificationFilter === "all" ? "primary" : "default"} onClick={() => setVerificationFilter("all")} clickable />
            <Chip label="Verified" color={verificationFilter === "verified" ? "primary" : "default"} onClick={() => setVerificationFilter("verified")} clickable />
            <Chip label="Needs review" color={verificationFilter === "unverified" ? "primary" : "default"} onClick={() => setVerificationFilter("unverified")} clickable />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip label="Any brand" color={brandFilter === "all" ? "primary" : "default"} onClick={() => setBrandFilter("all")} clickable />
            {brands.map((b) => (
              <Chip
                key={b.brand_key}
                label={b.brand_key}
                color={brandFilter === b.brand_key ? "primary" : "default"}
                onClick={() => setBrandFilter(b.brand_key)}
                clickable
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip label="Sort A-Z" color={sortBy === "relevance" ? "primary" : "default"} onClick={() => setSortBy("relevance")} clickable />
            <Chip label="Value high-low" color={sortBy === "value_desc" ? "primary" : "default"} onClick={() => setSortBy("value_desc")} clickable />
            <Chip label="Value low-high" color={sortBy === "value_asc" ? "primary" : "default"} onClick={() => setSortBy("value_asc")} clickable />
            <Chip label="Condition" color={sortBy === "condition_desc" ? "primary" : "default"} onClick={() => setSortBy("condition_desc")} clickable />
          </Stack>
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
              return (
                <motion.div key={a.id} layout>
                  <Box sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,2.1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,0.8fr)" }, gap: 1.25, alignItems: "center" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>{a.id}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {(a.brand_key || "Unknown")} • {(a.family || "—")} {(a.model_code || "")} • {(a.size_in ? `${a.size_in}"` : "—")}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.7} sx={{ flexWrap: "wrap" }}>
                        <Chip size="small" label={verified ? "Verified" : "Needs review"} color={verified ? "success" : "warning"} />
                        <Chip size="small" label={ready.p0Ready ? "P0 ready" : `Missing ${ready.missing.join(",")}`} color={ready.p0Ready ? "success" : "warning"} />
                      </Stack>
                      <Box>
                        <Typography sx={{ fontWeight: 900 }}>{a.valuation_estimate != null ? money(a.valuation_estimate) : "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.valuation_low != null && a.valuation_high != null ? `${money(a.valuation_low)}–${money(a.valuation_high)}` : "Range unavailable"}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                        <Button onClick={() => onOpenArtifact(a.id)}>Open</Button>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Brands (seed)</Typography>
            <Chip label={brands.length} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
            {brands.map((b) => (
              <Box key={b.brand_key} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">{b.brand_key}</Typography>
                <Typography sx={{ fontWeight: 900 }}>{b.display_name}</Typography>
                <Typography variant="body2" color="text.secondary">Country hint: {b.country_hint || "—"}</Typography>
                <Typography variant="body2" color="text.secondary">AI: {b.supports_variant_ai ? "Variant-level (gated)" : "Family-level"}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent></Card>
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
  const [submitState, setSubmitState] = useState<"idle" | "submitted">("idle");

  const [identity, setIdentity] = useState({
    brand: "Rawlings",
    model: "PRO1000",
    size: "11.5",
    throwSide: "RHT",
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
    palmWear: "moderate",
    leatherDryness: "none",
    structure: "good",
    repairs: "none",
  });

  const requiredAngles = INTAKE_ANGLE_DEFS.filter((d) => d.required).map((d) => d.key);
  const uploadedRequiredCount = requiredAngles.filter((a) => uploadedByAngle[a]).length;
  const confidenceScore = useMemo(() => {
    const evidencePct = uploadedRequiredCount / requiredAngles.length;
    const linerBonus = uploadedByAngle.LINER_STAMP ? 0.1 : 0;
    const identityBonus = identity.brand && identity.model ? 0.1 : 0;
    return Math.min(1, evidencePct * 0.7 + linerBonus + identityBonus);
  }, [uploadedRequiredCount, requiredAngles.length, uploadedByAngle.LINER_STAMP, identity.brand, identity.model]);
  const confidenceBand: ConfidenceBand = confidenceScore >= 0.8 ? "High" : confidenceScore >= 0.5 ? "Medium" : "Low";

  const conditionScore = useMemo(() => {
    let score = 7.2;
    if (condition.relaced === "full") score -= 0.5;
    if (condition.relaced === "partial") score -= 0.2;
    if (condition.palmWear === "heavy") score -= 1.2;
    if (condition.palmWear === "light") score += 0.2;
    if (condition.leatherDryness === "heavy") score -= 1.1;
    if (condition.structure === "floppy") score -= 1.0;
    if (condition.structure === "firm") score += 0.3;
    if (condition.repairs === "major") score -= 1.2;
    if (condition.repairs === "minor") score -= 0.4;
    return Math.max(1, Math.min(9.5, Number(score.toFixed(1))));
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

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Get an Estimate</Typography>
            <Typography variant="body2" color="text.secondary">Upload evidence, confirm glove details, and receive a confidence-gated market estimate.</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip key={n} label={`Step ${n}`} color={step === n ? "primary" : "default"} onClick={() => changeStep(n)} clickable />
            ))}
          </Stack>
        </Stack>
      </CardContent></Card>

      {step === 1 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Step 1: Add Evidence</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Upload clear photos for required angles. This directly improves identity confidence and valuation precision.
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" }, gap: 2 }}>
            <Stack spacing={1}>
              {INTAKE_ANGLE_DEFS.map((angle) => (
                <Box key={angle.key} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontWeight: 900 }}>{angle.label}</Typography>
                        <Chip size="small" color={angle.required ? "warning" : "default"} label={angle.required ? "Required" : "Optional"} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{angle.hint}</Typography>
                      {uploadedByAngle[angle.key] ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.6 }}>
                          Uploaded ({uploadedByAngle[angle.key]?.photoId}){uploadedByAngle[angle.key]?.deduped ? " • deduped" : ""}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <input
                        type="file"
                        accept="image/*"
                        aria-label={`Upload ${angle.label}`}
                        onChange={(e) => setFilesByAngle((s) => ({ ...s, [angle.key]: e.target.files?.[0] || null }))}
                      />
                      <Button disabled={!filesByAngle[angle.key] || Boolean(uploadingByAngle[angle.key])} onClick={() => uploadAngle(angle.key)}>
                        {uploadingByAngle[angle.key] ? "Uploading..." : "Upload"}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Confidence Preview</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{confidenceBand}</Typography>
              <LinearProgress variant="determinate" value={Math.round(confidenceScore * 100)} sx={{ mt: 1.2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.6, display: "block" }}>
                {uploadedRequiredCount}/{requiredAngles.length} required evidence angles uploaded.
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Live detection (preview)</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
                Detected brand: {uploadedByAngle.HEEL_STAMP ? "Rawlings" : "Unknown"} • Pattern: {uploadedByAngle.HEEL_STAMP ? "PRO1000" : "Needs heel stamp"} • Throw: {uploadedByAngle.BACKHAND ? "RHT" : "Unknown"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.8 }}>
                Add heel stamp and liner photos to tighten variant confidence.
              </Typography>
            </Box>
          </Box>
          {uploadErr ? <Typography color="error" sx={{ mt: 1.5 }}>{uploadErr}</Typography> : null}
        </CardContent></Card>
      ) : null}

      {step === 2 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Step 2: Confirm Identity</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Review system suggestions and correct any uncertain fields.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 1.25 }}>
            <TextField label="Brand" value={identity.brand} onChange={(e) => setIdentity((s) => ({ ...s, brand: e.target.value }))} size="small" />
            <TextField label="Pattern / Model code" value={identity.model} onChange={(e) => setIdentity((s) => ({ ...s, model: e.target.value }))} size="small" />
            <TextField label="Size (inches)" value={identity.size} onChange={(e) => setIdentity((s) => ({ ...s, size: e.target.value }))} size="small" />
            <FormControl size="small">
              <Select value={identity.throwSide} onChange={(e) => setIdentity((s) => ({ ...s, throwSide: String(e.target.value) }))}>
                <MenuItem value="RHT">Right Hand Throw (RHT)</MenuItem>
                <MenuItem value="LHT">Left Hand Throw (LHT)</MenuItem>
                <MenuItem value="UNKNOWN">Unknown</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField label="Disagreement note (optional)" value={identity.note} onChange={(e) => setIdentity((s) => ({ ...s, note: e.target.value }))} size="small" fullWidth sx={{ mt: 1.25 }} />
        </CardContent></Card>
      ) : null}

      {step === 3 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Step 3: Variant and Provenance</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Provide high-impact value cues. Use “Unknown” where you are unsure.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 1.25 }}>
            <FormControl size="small">
              <Select value={variant.country} onChange={(e) => setVariant((s) => ({ ...s, country: String(e.target.value) }))}>
                <MenuItem value="UNKNOWN">Country of origin: Unknown</MenuItem>
                <MenuItem value="JAPAN">Japan</MenuItem>
                <MenuItem value="USA">USA</MenuItem>
                <MenuItem value="PHILIPPINES">Philippines</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={variant.leather} onChange={(e) => setVariant((s) => ({ ...s, leather: String(e.target.value) }))}>
                <MenuItem value="UNKNOWN">Leather: Unknown</MenuItem>
                <MenuItem value="HOH">Heart of the Hide</MenuItem>
                <MenuItem value="PRIMO">Primo</MenuItem>
                <MenuItem value="PRO_PREFERRED">Pro Preferred</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={variant.era} onChange={(e) => setVariant((s) => ({ ...s, era: String(e.target.value) }))}>
                <MenuItem value="UNKNOWN">Era: Unknown</MenuItem>
                <MenuItem value="1990S_2000S">1990s–2000s</MenuItem>
                <MenuItem value="2010S">2010s</MenuItem>
                <MenuItem value="2020S">2020s</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Special stamp / run (optional)" value={variant.specialStamp} onChange={(e) => setVariant((s) => ({ ...s, specialStamp: e.target.value }))} size="small" />
          </Box>
        </CardContent></Card>
      ) : null}

      {step === 4 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Step 4: Condition Assessment</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Structured condition input improves estimate quality more than free-text grading.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 1.25 }}>
            <FormControl size="small">
              <Select value={condition.relaced} onChange={(e) => setCondition((s) => ({ ...s, relaced: String(e.target.value) }))}>
                <MenuItem value="unknown">Relaced: Unknown</MenuItem>
                <MenuItem value="none">No relace</MenuItem>
                <MenuItem value="partial">Partial relace</MenuItem>
                <MenuItem value="full">Full relace</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={condition.palmWear} onChange={(e) => setCondition((s) => ({ ...s, palmWear: String(e.target.value) }))}>
                <MenuItem value="light">Palm wear: Light</MenuItem>
                <MenuItem value="moderate">Palm wear: Moderate</MenuItem>
                <MenuItem value="heavy">Palm wear: Heavy</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={condition.leatherDryness} onChange={(e) => setCondition((s) => ({ ...s, leatherDryness: String(e.target.value) }))}>
                <MenuItem value="none">Leather dryness: None</MenuItem>
                <MenuItem value="moderate">Leather dryness: Moderate</MenuItem>
                <MenuItem value="heavy">Leather dryness: Heavy</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={condition.structure} onChange={(e) => setCondition((s) => ({ ...s, structure: String(e.target.value) }))}>
                <MenuItem value="firm">Structure: Firm</MenuItem>
                <MenuItem value="good">Structure: Good</MenuItem>
                <MenuItem value="floppy">Structure: Floppy</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={condition.repairs} onChange={(e) => setCondition((s) => ({ ...s, repairs: String(e.target.value) }))}>
                <MenuItem value="none">Repairs: None</MenuItem>
                <MenuItem value="minor">Repairs: Minor</MenuItem>
                <MenuItem value="major">Repairs: Major</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ mt: 1.5, p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Condition score (preview)</Typography>
            <Typography sx={{ fontWeight: 900 }}>{conditionScore.toFixed(1)} / 10</Typography>
          </Box>
        </CardContent></Card>
      ) : null}

      {step === 5 ? (
        <Card><CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Step 5: Review and Estimate Preview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Final summary before submitting for appraisal and market estimate.</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr" }, gap: 2 }}>
            <Box sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>{identity.brand} {identity.model}</Typography>
              <Typography variant="body2" color="text.secondary">{identity.size}" • {identity.throwSide} • {variant.country}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                <Chip size="small" label={`Confidence: ${confidenceBand}`} color={confidenceBand === "High" ? "success" : confidenceBand === "Medium" ? "info" : "warning"} />
                <Chip size="small" label={`Condition ${conditionScore.toFixed(1)}/10`} />
                <Chip size="small" label={`${uploadedRequiredCount}/${requiredAngles.length} required photos`} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Why this confidence: identity fields are partially confirmed and evidence completeness is {Math.round(confidenceScore * 100)}%.
              </Typography>
            </Box>
            <Box sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Estimated Market Range</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{money(estimate.low)} – {money(estimate.high)}</Typography>
              <Typography variant="body2" color="text.secondary">Point estimate: {money(estimate.point)}</Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button onClick={() => setSubmitState("submitted")}>Submit Appraisal Request</Button>
            <Button color="inherit" onClick={() => changeStep(1)}>Edit Intake</Button>
          </Stack>
          {submitState === "submitted" ? (
            <Typography color="success.main" sx={{ mt: 1 }}>
              Appraisal request submitted. Ticket: GQ-APR-{Math.max(1000, Math.round(estimate.point))}.
            </Typography>
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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "verified" | "unverified">("all");
  const [view, setView] = useState<"overview" | "catalog" | "verification">("overview");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh(query?: string) {
    setLoading(true); setErr(null);
    try { setRows(await api.artifacts(query)); }
    catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(""); }, []);

  const filtered = rows.filter((row) => {
    const query = q.trim().toLowerCase();
    const hay = `${row.id} ${row.brand_key ?? ""} ${row.family ?? ""} ${row.model_code ?? ""} ${row.verification_status ?? ""}`.toLowerCase();
    const queryOk = query.length === 0 || hay.includes(query);
    if (!queryOk) return false;
    if (status === "all") return true;
    const isVerified = String(row.verification_status ?? "").toLowerCase().includes("verified");
    return status === "verified" ? isVerified : !isVerified;
  });

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

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.artifact")}</Typography>
              <Typography variant="body2" color="text.secondary">Catalog and user artifacts with verification and valuation readiness.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, "search.placeholder")} aria-label={t(locale, "tab.artifact")} />
              <Button onClick={() => refresh(q)} startIcon={<SearchIcon />}>Refresh</Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Chip label="Overview" color={view === "overview" ? "primary" : "default"} onClick={() => setView("overview")} clickable />
            <Chip label="Catalog" color={view === "catalog" ? "primary" : "default"} onClick={() => setView("catalog")} clickable />
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
            <Chip label={`Custom artifacts ${artifactOnlyCount}`} />
            <Chip label={`P0-ready ${p0ReadyCount}/${rows.length}`} />
            <Chip label={`Valuation-ready ${valuationReadyCount}/${rows.length}`} />
          </Stack>
          {loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
          {err ? <Typography sx={{ mt: 2 }} color="error">{err}</Typography> : null}
        </CardContent></Card>

        {view === "overview" ? (
          <>
            <Card><CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Today&apos;s Artifact Snapshot</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.25 }}>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Total records</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{rows.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Catalog + custom artifacts</Typography>
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
          <Card><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Artifact Catalog</Typography>
              <Chip label={`${filtered.length} shown`} />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.25}>
              {filtered.map((a) => {
                const verified = isVerified(a);
                const showEstimate = a.valuation_estimate != null;
                return (
                  <Box
                    key={a.id}
                    sx={{ p: 1.75, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                  >
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }} noWrap>{a.id}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {(a.brand_key || "Unknown")} • {(a.family || "—")} {(a.model_code || "")} • {(a.made_in || "Unknown")}
                        </Typography>
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
                <Typography variant="body2" color="text.secondary">No artifacts match the current filters.</Typography>
              ) : null}
            </Stack>
          </CardContent></Card>
        ) : null}

        {view === "verification" ? (
          <>
            <Card><CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Evidence Requirements</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Chip size="small" color="warning" label="P0 Required" />
                  <Typography variant="body2" sx={{ mt: 1 }}>BACK photo (full glove straight-on)</Typography>
                  <Typography variant="body2">PALM photo (pocket + wear)</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    If P0 is missing, valuation remains range-only or hidden.
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Chip size="small" color="info" label="P1 Recommended" />
                  <Typography variant="body2" sx={{ mt: 1 }}>WRIST_PATCH photo for run confirmation</Typography>
                  <Typography variant="body2">LINER + STAMPS photos for condition and certainty</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    P1 increases confidence and narrows valuation range.
                  </Typography>
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
  const [loginForm, setLoginForm] = useState({ email: "", password: "", remember: true });
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [section, setSection] = useState<"profile" | "security" | "alerts">("profile");
  const [profile, setProfile] = useState({
    fullName: "Jesse Rego",
    displayName: "JR",
    timezone: "America/Los_Angeles",
    locale: locale,
    bio: "Collector and builder focused on explainable glove valuation.",
  });
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    backupCodes: true,
    deviceAlerts: true,
    activeSessions: 2,
  });
  const [alertsPrefs, setAlertsPrefs] = useState({
    appraisalReady: true,
    security: true,
    compDrops: true,
    weeklyDigest: false,
  });
  const [alertsFeed, setAlertsFeed] = useState([
    { id: "a1", level: "info" as const, text: "New comp cluster detected for PRO1000 in the last 24h." },
    { id: "a2", level: "warning" as const, text: "2FA is disabled. Enable to secure account access." },
    { id: "a3", level: "success" as const, text: "Your last appraisal request was delivered successfully." },
  ]);

  const isLoggedIn = authStep === "done";

  function submitLogin() {
    setAuthError(null);
    if (!loginForm.email || !loginForm.password) {
      setAuthError("Enter email and password.");
      return;
    }
    setAuthStep("2fa");
  }

  function verify2fa() {
    setAuthError(null);
    if (otpCode.trim() !== "246810") {
      setAuthError("Invalid verification code. Use 246810 for this demo.");
      return;
    }
    setAuthStep("done");
  }

  return (
    <Container maxWidth="lg" sx={PAGE_CONTAINER_SX}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.account")}</Typography>
              <Typography variant="body2" color="text.secondary">Profile, login state, authentication, 2FA, alerts, and account settings.</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label={isLoggedIn ? "Authenticated" : "Signed out"} color={isLoggedIn ? "success" : "warning"} />
              <Chip label={`2FA ${security.twoFactorEnabled ? "On" : "Off"}`} color={security.twoFactorEnabled ? "success" : "default"} />
              <Tooltip title="Demo code for verification is 246810">
                <Chip label="Help" icon={<InfoOutlinedIcon />} />
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent></Card>

        {!isLoggedIn ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
            <Card sx={{ backgroundColor: "#101820", color: "white" }}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Sign in</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 0.5 }}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Authentication Notes</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                <Alert severity="info">Session auth state is required before profile and security settings are editable.</Alert>
                <Alert severity="warning">2FA gates high-trust actions like payout settings and API key management.</Alert>
                <Alert severity="success">Enable security and alerts to receive suspicious-login notifications.</Alert>
              </Stack>
            </CardContent></Card>
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label="Profile Settings" color={section === "profile" ? "primary" : "default"} onClick={() => setSection("profile")} clickable />
              <Chip label="Login & Security" color={section === "security" ? "primary" : "default"} onClick={() => setSection("security")} clickable />
              <Chip label="Alerts Center" color={section === "alerts" ? "primary" : "default"} onClick={() => setSection("alerts")} clickable />
            </Stack>

            {section === "profile" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.3fr" }, gap: 2 }}>
                <Card><CardContent>
                  <Stack spacing={1.25} alignItems="center">
                    <Avatar sx={{ width: 80, height: 80 }}>JR</Avatar>
                    <Typography sx={{ fontWeight: 900 }}>{profile.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">{profile.displayName}</Typography>
                    <Chip size="small" label={`Sessions: ${security.activeSessions}`} />
                  </Stack>
                </CardContent></Card>
                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Profile Settings</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
                    <TextField size="small" label="Full name" value={profile.fullName} onChange={(e) => setProfile((s) => ({ ...s, fullName: e.target.value }))} />
                    <TextField size="small" label="Display name" value={profile.displayName} onChange={(e) => setProfile((s) => ({ ...s, displayName: e.target.value }))} />
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
                    <Button>Save Profile</Button>
                    <Button color="inherit">Discard</Button>
                  </Stack>
                </CardContent></Card>
              </Box>
            ) : null}

            {section === "security" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Card><CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SecurityIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Authentication & 2FA</Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <FormControlLabel
                    control={<Switch checked={security.twoFactorEnabled} onChange={(e) => setSecurity((s) => ({ ...s, twoFactorEnabled: e.target.checked }))} />}
                    label="Enable two-factor authentication"
                  />
                  <FormControlLabel
                    control={<Switch checked={security.backupCodes} onChange={(e) => setSecurity((s) => ({ ...s, backupCodes: e.target.checked }))} />}
                    label="Enable backup recovery codes"
                  />
                  <FormControlLabel
                    control={<Switch checked={security.deviceAlerts} onChange={(e) => setSecurity((s) => ({ ...s, deviceAlerts: e.target.checked }))} />}
                    label="Alert on new device login"
                  />
                  <Alert severity={security.twoFactorEnabled ? "success" : "warning"} sx={{ mt: 1 }}>
                    {security.twoFactorEnabled ? "2FA enabled and protecting this account." : "2FA currently disabled. Enable for stronger account security."}
                  </Alert>
                </CardContent></Card>

                <Card><CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Password & Sessions</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1.25}>
                    <TextField size="small" type="password" label="Current password" />
                    <TextField size="small" type="password" label="New password" />
                    <TextField size="small" type="password" label="Confirm new password" />
                    <Stack direction="row" spacing={1}>
                      <Button>Update Password</Button>
                      <Button color="inherit">Sign out other sessions</Button>
                    </Stack>
                  </Stack>
                </CardContent></Card>
              </Box>
            ) : null}

            {section === "alerts" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Card><CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <NotificationsActiveIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Alert Preferences</Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <FormControlLabel control={<Switch checked={alertsPrefs.appraisalReady} onChange={(e) => setAlertsPrefs((s) => ({ ...s, appraisalReady: e.target.checked }))} />} label="Appraisal-ready notifications" />
                  <FormControlLabel control={<Switch checked={alertsPrefs.security} onChange={(e) => setAlertsPrefs((s) => ({ ...s, security: e.target.checked }))} />} label="Security alerts" />
                  <FormControlLabel control={<Switch checked={alertsPrefs.compDrops} onChange={(e) => setAlertsPrefs((s) => ({ ...s, compDrops: e.target.checked }))} />} label="Comp-drop notifications" />
                  <FormControlLabel control={<Switch checked={alertsPrefs.weeklyDigest} onChange={(e) => setAlertsPrefs((s) => ({ ...s, weeklyDigest: e.target.checked }))} />} label="Weekly digest email" />
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
                backgroundColor: "rgba(16,24,38,0.92)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 10px 28px rgba(0,0,0,0.32)",
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
                  background: idx === 1 ? "linear-gradient(135deg, rgba(74,141,255,0.34), rgba(32,192,122,0.24))" : undefined,
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
  const [locale, setLocale] = useState<Locale>("en");
  const [route, setRoute] = useState<Route>({ name: "search" });
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [lastArtifactId, setLastArtifactId] = useState<string | null>(null);

  useEffect(() => { api.brands().then(setBrands).catch(() => setBrands([])); }, []);
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

      <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" } }}>
        <SidebarNav locale={locale} activeTab={activeTab} canOpenArtifact={true} onSelect={onSelectTab} />

        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ShellTopBar locale={locale} setLocale={setLocale} routeName={activeTab} onReset={() => setRoute({ name: "search" })} />

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

      <MobileBottomNav locale={locale} activeTab={activeTab} canOpenArtifact={true} onSelect={onSelectTab} />
    </ThemeProvider>
  );
}
