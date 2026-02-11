import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./lib/api";
import type { Artifact, BrandConfig } from "@gloveiq/shared";
import { Locale, t } from "./i18n/strings";
import { Card, CardContent, Button, Input } from "./ui/Primitives";

import {
  AppBar, Box, Chip, Container, CssBaseline, Divider, FormControl, LinearProgress,
  MenuItem, Select, Stack, ThemeProvider, Toolbar, Typography, createTheme,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const NAV_SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;

function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
  catch { return `$${v}`; }
}

function TopBar({ locale, setLocale, title }: { locale: Locale; setLocale: (l: Locale) => void; title: string; }) {
  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, flex: 1 }}>{title}</Typography>
        <FormControl size="small">
          <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="ja">JA</MenuItem>
          </Select>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
}

function SearchScreen({ locale, brands, onOpenArtifact }: { locale: Locale; brands: BrandConfig[]; onOpenArtifact: (id: string) => void; }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh(query?: string) {
    setLoading(true); setErr(null);
    try { setRows(await api.artifacts(query)); }
    catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(""); }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "tab.search")}</Typography>
              <Typography variant="body2" color="text.secondary">Desktop-first dashboard MVP (Material UI).</Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, "search.placeholder")} aria-label={t(locale, "tab.search")} />
              <Button onClick={() => refresh(q)} startIcon={<SearchIcon />}>Search</Button>
              <Button color="inherit" onClick={() => { setQ(""); refresh(""); }}>Clear</Button>
            </Stack>
          </Stack>
          {loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
          {err ? <Typography sx={{ mt: 2 }} color="error">{err}</Typography> : null}
        </CardContent></Card>

        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t(locale, "search.results")}</Typography>
            <Chip label={rows.length} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.5}>
            {rows.map((a) => (
              <motion.div key={a.id} layout>
                <Box
                  onClick={() => onOpenArtifact(a.id)}
                  role="button" tabIndex={0}
                  sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>
                        {a.object_type === "ARTIFACT" ? a.id : `${a.brand_key ?? "Unknown"} ${a.model_code ?? ""}`.trim()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {(a.family || "—")} • {(a.made_in || "Unknown")} • {a.size_in ? `${a.size_in}"` : "—"}
                      </Typography>
                    </Box>
                    <Chip size="small" label={a.object_type === "ARTIFACT" ? "Artifact" : "Cataloged"} />
                  </Stack>
                </Box>
              </motion.div>
            ))}
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
    <Container maxWidth="lg" sx={{ py: 3 }}>
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
    { name: "Free", price: "$0", bullets: ["Basic search", "Community verification", "Range-only valuations (when available)"] },
    { name: "Plus", price: "$9/mo", bullets: ["Deeper comps", "Saved artifacts", "Priority verification queue"] },
    { name: "Pro", price: "$29/mo", bullets: ["Dealer tooling", "Bulk intake", "Audit trail + exports"] },
  ];
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>{t(locale, "pricing.title")}</Typography>
        <Typography variant="body1" color="text.secondary">{t(locale, "pricing.subtitle")}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          {plans.map((p) => (
            <Card key={p.name}><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{p.name}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 1 }}>{p.price}</Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {p.bullets.map((b) => <Typography key={b} variant="body2">• {b}</Typography>)}
              </Stack>
              <Button sx={{ mt: 2 }} onClick={onStartFree}>{t(locale, "pricing.cta")}</Button>
            </CardContent></Card>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}

type Route = { name: "search" } | { name: "artifact"; artifactId: string } | { name: "pricing" };

export default function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const [route, setRoute] = useState<Route>({ name: "search" });
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  useEffect(() => { api.brands().then(setBrands).catch(() => setBrands([])); }, []);
  useEffect(() => {
    if (route.name === "artifact") api.artifact(route.artifactId).then(setArtifact).catch(() => setArtifact(null));
    else setArtifact(null);
  }, [route]);

  const theme = useMemo(() => createTheme({
    palette: { mode: "light", primary: { main: "#0b57d0" }, secondary: { main: "#6d4c41" } },
    shape: { borderRadius: 12 },
    typography: { fontFamily: ["Inter","system-ui","Segoe UI","Roboto","Helvetica","Arial"].join(",") },
    components: { MuiCard: { styleOverrides: { root: { border: "1px solid rgba(0,0,0,0.08)" } } } },
  }), []);

  const title = route.name === "search" ? t(locale, "app.title") : route.name === "artifact" ? t(locale, "artifact.detail") : t(locale, "tab.pricing");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TopBar locale={locale} setLocale={setLocale} title={title} />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={route.name === "artifact" ? route.artifactId : route.name}
          initial={{ x: 14, opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -10, opacity: 0.6 }}
          transition={NAV_SPRING}
        >
          {route.name === "search" ? (
            <SearchScreen locale={locale} brands={brands} onOpenArtifact={(id) => setRoute({ name: "artifact", artifactId: id })} />
          ) : route.name === "artifact" ? (
            artifact ? (
              <ArtifactDetail locale={locale} artifact={artifact} />
            ) : (
              <Container maxWidth="lg" sx={{ py: 3 }}>
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

          <Box sx={{ position: "fixed", bottom: 16, right: 16, display: "flex", gap: 1 }}>
            <Button color="inherit" onClick={() => setRoute({ name: "pricing" })}>{t(locale, "tab.pricing")}</Button>
            <Button color="primary" onClick={() => setRoute({ name: "search" })}>{t(locale, "tab.search")}</Button>
          </Box>
        </motion.div>
      </AnimatePresence>
    </ThemeProvider>
  );
}
