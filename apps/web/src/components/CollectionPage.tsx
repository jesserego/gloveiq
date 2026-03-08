import React, { useEffect, useMemo, useState } from "react";
import { Tier, canAccess } from "@gloveiq/shared";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Button, Card, CardContent } from "../ui/Primitives";
import { ThemedLineChart } from "./charts/ThemedCharts";
import { hexToRgba, readChartThemeTokens } from "../lib/chartjsTheme";
import glovePlaceholderImage from "../assets/baseball-glove-placeholder.svg";
import {
  api,
  type CollectionItem,
  type CollectionImportJob,
  type CollectionStatus,
  type VariantRecord,
} from "../lib/api";

function moneyFromCents(cents: number | null | undefined) {
  if (typeof cents !== "number") return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

type ViewTab = "OWNED" | "WANT";

type AddFormState = {
  variantId: string;
  condition: string;
  quantity: number;
  acquisitionPrice: string;
  acquisitionDate: string;
  targetPrice: string;
  notes: string;
  sku: string;
  location: string;
};

const defaultForm: AddFormState = {
  variantId: "",
  condition: "",
  quantity: 1,
  acquisitionPrice: "",
  acquisitionDate: "",
  targetPrice: "",
  notes: "",
  sku: "",
  location: "",
};

function buildDummyCollection(status: CollectionStatus): CollectionItem[] {
  const base = status === "OWNED" ? "OWN" : "WANT";
  return Array.from({ length: 10 }).map((_, idx) => {
    const i = idx + 1;
    const current = 18000 + i * 1400;
    const acq = status === "OWNED" ? 15000 + i * 1100 : null;
    return {
      id: `dummy_${base.toLowerCase()}_${i}`,
      status,
      quantity: status === "OWNED" ? (i % 3 === 0 ? 2 : 1) : 1,
      condition: status === "OWNED" ? (i % 2 === 0 ? "Used" : "New") : "Unknown",
      normalizedCondition: null,
      acquisitionPriceCents: acq,
      acquisitionDate: status === "OWNED" ? `2025-0${(i % 9) + 1}-15` : null,
      targetPriceCents: status === "WANT" ? 15000 + i * 900 : null,
      notes: status === "WANT" ? `Priority ${i % 3 === 0 ? "High" : "Normal"}` : `Collection item ${i}`,
      sku: status === "OWNED" ? `SKU-${1000 + i}` : null,
      location: status === "OWNED" ? `Shelf ${((i - 1) % 4) + 1}` : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variant: {
        variantId: `var_dummy_${i}`,
        brand: ["Rawlings", "Wilson", "Mizuno", "Zett", "44 Pro"][i % 5],
        model: ["PRO204", "A2000 1786", "Haga IF", "ProStatus", "C2"][i % 5],
        pattern: ["11.5 IF", "11.75 IF", "12 OF", "11.25 IF", "12.25 OF"][i % 5],
        sizeIn: [11.5, 11.75, 12, 11.25, 12.25][i % 5],
        throwHand: i % 2 === 0 ? "RHT" : "LHT",
        title: `${["Rawlings", "Wilson", "Mizuno", "Zett", "44 Pro"][i % 5]} ${["PRO204", "A2000 1786", "Haga IF", "ProStatus", "C2"][i % 5]}`,
        year: 2020 + (i % 6),
        web: ["I-Web", "H-Web", "Trapeze", "Single Post", "Closed"][i % 5],
      },
      market: {
        currentMedianCents: current,
        ma7Cents: current - 500,
        ma30Cents: current - 1200,
        ma90Cents: current - 1700,
        p10Cents: current - 6000,
        p90Cents: current + 9000,
        salesCount30d: 12 + i * 2,
        activeListingsCount: 20 + i,
        positionValueCents: current * (status === "OWNED" && i % 3 === 0 ? 2 : 1),
        pnlCents: acq == null ? null : current - acq,
        lastUpdatedAt: new Date().toISOString(),
      },
    };
  });
}

function cardPhotoTint(seed: string) {
  const palette = ["#22C55E", "#38BDF8", "#6366F1", "#F59E0B", "#EF4444"];
  const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export default function CollectionPage({ tier, variants }: { tier: Tier; variants: VariantRecord[] }) {
  const chartTokens = readChartThemeTokens();
  const isDealer = tier === Tier.DEALER;
  const canUseCollection = canAccess(Tier.COLLECTOR, tier);
  const canUseProMetrics = canAccess(Tier.PRO, tier);
  const title = isDealer ? "My Inventory" : "My Collection";

  const [tab, setTab] = useState<ViewTab>("OWNED");
  const [rows, setRows] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [conditionFilter, setConditionFilter] = useState("ALL");
  const [maxValueFilter, setMaxValueFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<CollectionItem | null>(null);
  const [form, setForm] = useState<AddFormState>(defaultForm);
  const [variantSearch, setVariantSearch] = useState("");
  const [job, setJob] = useState<CollectionImportJob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!canUseCollection) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.meCollection(tab as CollectionStatus, tier)
      .then((res) => {
        if (cancelled) return;
        setRows(res.items || []);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [canUseCollection, tab, tier]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const brandOk = brandFilter === "ALL" || row.variant?.brand === brandFilter;
      const conditionOk = conditionFilter === "ALL" || (row.condition || "Unknown") === conditionFilter;
      const value = row.market.currentMedianCents || 0;
      const valueOk = maxValueFilter === "ALL" || value <= Number(maxValueFilter);
      return brandOk && conditionOk && valueOk;
    });
  }, [rows, brandFilter, conditionFilter, maxValueFilter]);

  const displayRows = useMemo(() => {
    if (filteredRows.length > 0) return filteredRows;
    return buildDummyCollection(tab);
  }, [filteredRows, tab]);

  const brandOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.variant?.brand).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const conditionOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.condition || "Unknown"))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const variantCandidates = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();
    const base = variants.slice(0, 600);
    if (!q) return base.slice(0, 30);
    return base
      .filter((v) => `${v.brand_key} ${v.display_name} ${v.model_code || ""}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [variants, variantSearch]);

  const refreshRows = () => {
    api.meCollection(tab as CollectionStatus, tier)
      .then((res) => setRows(res.items || []))
      .catch((e) => setError(String(e?.message || e)));
  };

  async function onAddItem() {
    try {
      setError(null);
      await api.addCollectionItem(
        {
          variantId: form.variantId,
          status: tab,
          condition: form.condition || undefined,
          quantity: form.quantity,
          acquisitionPrice: form.acquisitionPrice || undefined,
          acquisitionDate: form.acquisitionDate || undefined,
          targetPrice: form.targetPrice || undefined,
          notes: form.notes || undefined,
          sku: form.sku || undefined,
          location: form.location || undefined,
        },
        tier,
      );
      setAddOpen(false);
      setForm(defaultForm);
      setVariantSearch("");
      refreshRows();
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function onDelete(id: string) {
    try {
      await api.deleteCollectionItem(id, tier);
      refreshRows();
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function onUploadCsv(file: File) {
    try {
      setUploadError(null);
      const out = await api.uploadInventoryCsv(file, tier);
      const loaded = await api.getInventoryImportJob(out.jobId, tier);
      setJob(loaded);
    } catch (e: any) {
      setUploadError(String(e?.message || e));
    }
  }

  async function onResolveRow(rowId: string, variantId: string) {
    if (!job) return;
    try {
      await api.resolveInventoryImportRow(job.id, rowId, variantId, tier);
      const loaded = await api.getInventoryImportJob(job.id, tier);
      setJob(loaded);
    } catch (e: any) {
      setUploadError(String(e?.message || e));
    }
  }

  async function onConfirmImport() {
    if (!job) return;
    try {
      await api.confirmInventoryImport(job.id, tier);
      const loaded = await api.getInventoryImportJob(job.id, tier);
      setJob(loaded);
      setTab("OWNED");
      refreshRows();
    } catch (e: any) {
      setUploadError(String(e?.message || e));
    }
  }

  if (!canUseCollection) {
    return (
      <Card><CardContent>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Unlock {title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This feature is available on Collector, Pro, and Dealer tiers.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip size="small" label="Collector" />
          <Chip size="small" label="Pro" />
          <Chip size="small" label="Dealer" />
        </Stack>
      </CardContent></Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Card><CardContent>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1}>
          <Box>
            <Stack direction="row" spacing={0.7} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{title}</Typography>
              <Chip size="small" label={tier} />
            </Stack>
            <Typography variant="body2" color="text.secondary">Track owned gloves, wantlist, and market-linked value changes.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setAddOpen(true)}>Add Item</Button>
            {isDealer ? (
              <label>
                <input hidden type="file" accept=".csv" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadCsv(file);
                  e.currentTarget.value = "";
                }} />
                <Button startIcon={<UploadFileOutlinedIcon />} sx={{ cursor: "pointer" }}>
                  Bulk Upload CSV
                </Button>
              </label>
            ) : null}
          </Stack>
        </Stack>

        <Tabs value={tab} onChange={(_e, value) => setTab(value)} sx={{ mt: 1 }}>
          <Tab label="Owned" value="OWNED" />
          <Tab label="Wantlist" value="WANT" />
        </Tabs>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Brand</InputLabel>
            <Select value={brandFilter} label="Brand" onChange={(e) => setBrandFilter(String(e.target.value))}>
              <MenuItem value="ALL">All brands</MenuItem>
              {brandOptions.map((brand) => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Condition</InputLabel>
            <Select value={conditionFilter} label="Condition" onChange={(e) => setConditionFilter(String(e.target.value))}>
              <MenuItem value="ALL">All conditions</MenuItem>
              {conditionOptions.map((condition) => <MenuItem key={condition} value={condition}>{condition}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Max value</InputLabel>
            <Select value={maxValueFilter} label="Max value" onChange={(e) => setMaxValueFilter(String(e.target.value))}>
              <MenuItem value="ALL">Any value</MenuItem>
              <MenuItem value="15000">{"<= $150"}</MenuItem>
              <MenuItem value="30000">{"<= $300"}</MenuItem>
              <MenuItem value="50000">{"<= $500"}</MenuItem>
              <MenuItem value="100000">{"<= $1,000"}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </CardContent></Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {uploadError ? <Alert severity="warning">{uploadError}</Alert> : null}

      <Card><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{tab === "OWNED" ? "Owned Items" : "Wantlist Items"}</Typography>
          <Typography variant="caption" color="text.secondary">{displayRows.length} items</Typography>
        </Stack>
        <Divider sx={{ my: 1 }} />

        {loading ? <Typography variant="body2" color="text.secondary">Loading...</Typography> : null}
        {!loading && filteredRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Empty. Search and add your first glove.</Typography>
        ) : null}

        <Box sx={{ display: "grid", gap: 0.9, gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))", xl: "repeat(3,minmax(0,1fr))" } }}>
          {displayRows.map((row) => (
            <Box key={row.id} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
              <Box
                sx={{
                  position: "relative",
                  height: 118,
                  borderRadius: 1,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 0.9,
                  backgroundColor: (theme) => alpha(cardPhotoTint(`${row.variant?.brand || ""}_${row.id}`), theme.palette.mode === "dark" ? 0.22 : 0.14),
                }}
              >
                <Box component="img" src={glovePlaceholderImage} alt={`${row.variant?.title || "Glove"} photo`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.94 }} />
                <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 30%, rgba(2,6,23,0.46) 100%)" }} />
              </Box>
              <Stack spacing={1} justifyContent="space-between" sx={{ minHeight: 210 }}>
                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{row.variant?.title || row.variant?.variantId || "Unknown variant"}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {row.variant?.brand || "Unknown"} • {row.variant?.model || "n/a"} • {row.variant?.pattern || "n/a"} • {row.variant?.sizeIn || "?"}" • {row.variant?.throwHand || "?"}
                  </Typography>
                  <Stack direction="row" spacing={0.7} sx={{ flexWrap: "wrap" }}>
                    <Chip size="small" label={`Cond: ${row.condition || row.normalizedCondition || "Unknown"}`} />
                    <Chip size="small" label={`Qty: ${row.quantity}`} />
                    {isDealer && row.sku ? <Chip size="small" label={`SKU: ${row.sku}`} /> : null}
                    {isDealer && row.location ? <Chip size="small" label={`Loc: ${row.location}`} /> : null}
                  </Stack>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">Acq.</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{moneyFromCents(row.acquisitionPriceCents)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">Current</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{moneyFromCents(row.market.currentMedianCents)}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">MA7 / MA30 / MA90</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                      {moneyFromCents(row.market.ma7Cents)} / {moneyFromCents(row.market.ma30Cents)} / {moneyFromCents(row.market.ma90Cents)}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">P/L</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{moneyFromCents(row.market.pnlCents)}</Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={0.6}>
                    <Button color="inherit" onClick={() => setDetailOpen(row)}>Detail</Button>
                    <Button color="inherit" onClick={() => onDelete(row.id)}>Delete</Button>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>
      </CardContent></Card>

      {isDealer && job ? (
        <Card><CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Import Job Preview</Typography>
            <Chip size="small" label={job.status} />
          </Stack>
          <Typography variant="caption" color="text.secondary">{job.fileName || "upload"} • {job.totalRows} rows • {job.matchedRows} matched • {job.unmatchedRows} unmatched</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={0.8}>
            {job.rows.map((row) => (
              <Box key={row.id} sx={{ p: 0.8, border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" color="text.secondary">Row {String((row.rawRowJson?.rowIndex as number) || "?")} • {JSON.stringify(row.rawRowJson)}</Typography>
                  {row.matchedVariantId ? (
                    <Chip size="small" color="success" label={`Matched: ${row.matchedVariantId}`} />
                  ) : (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={0.6}>
                      <TextField
                        size="small"
                        placeholder="Resolve with variant_id"
                        onChange={(e) => {
                          const value = e.target.value;
                          setJob((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              rows: prev.rows.map((r) => (r.id === row.id ? { ...r, rawRowJson: { ...r.rawRowJson, __resolveVariant: value } } : r)),
                            };
                          });
                        }}
                      />
                      <Button color="inherit" onClick={() => {
                        const value = String((job.rows.find((r) => r.id === row.id)?.rawRowJson as any)?.__resolveVariant || "").trim();
                        if (value) onResolveRow(row.id, value);
                      }}>
                        Resolve
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button onClick={onConfirmImport} disabled={job.matchedRows <= 0}>Confirm Import</Button>
          </Stack>
        </CardContent></Card>
      ) : null}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="md">
        <Box sx={{ p: 1.4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Add Item</Typography>
          <Typography variant="caption" color="text.secondary">Search variant then capture acquisition details.</Typography>
          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <TextField size="small" label="Search variant" value={variantSearch} onChange={(e) => setVariantSearch(e.target.value)} />
            <Box sx={{ maxHeight: 180, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}>
              {variantCandidates.map((variant) => {
                const active = form.variantId === variant.variant_id;
                return (
                  <Box
                    key={variant.variant_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setForm((prev) => ({ ...prev, variantId: variant.variant_id }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setForm((prev) => ({ ...prev, variantId: variant.variant_id }));
                      }
                    }}
                    sx={{
                      px: 0.9,
                      py: 0.65,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: active ? "action.selected" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{variant.display_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{variant.variant_id} • {variant.brand_key} • {variant.model_code || "n/a"}</Typography>
                  </Box>
                );
              })}
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField size="small" label="Condition" value={form.condition} onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))} />
              <TextField size="small" type="number" label="Quantity" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: Math.max(1, Number(e.target.value || 1)) }))} />
              <TextField size="small" label="Acquisition price" value={form.acquisitionPrice} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionPrice: e.target.value }))} />
              <TextField size="small" type="date" label="Acquisition date" InputLabelProps={{ shrink: true }} value={form.acquisitionDate} onChange={(e) => setForm((prev) => ({ ...prev, acquisitionDate: e.target.value }))} />
            </Stack>
            {tab === "WANT" ? (
              <TextField size="small" label="Target buy price" value={form.targetPrice} onChange={(e) => setForm((prev) => ({ ...prev, targetPrice: e.target.value }))} />
            ) : null}
            {isDealer ? (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField size="small" label="SKU" value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} />
                <TextField size="small" label="Location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
              </Stack>
            ) : null}
            <TextField size="small" multiline minRows={2} label="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </Stack>

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.2 }}>
            <Button color="inherit" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={onAddItem} disabled={!form.variantId}>Save</Button>
          </Stack>
        </Box>
      </Dialog>

      <Dialog open={Boolean(detailOpen)} onClose={() => setDetailOpen(null)} fullWidth maxWidth="lg">
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{detailOpen?.variant?.title || "Item Detail"}</Typography>
            <Button color="inherit" onClick={() => setDetailOpen(null)}>Close</Button>
          </Stack>
          <Divider sx={{ my: 1 }} />
          {detailOpen ? (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {detailOpen.variant?.brand} • {detailOpen.variant?.model || "n/a"} • {detailOpen.variant?.pattern || "n/a"} • {detailOpen.variant?.sizeIn || "?"}" • {detailOpen.variant?.throwHand || "?"}
              </Typography>
              <Box sx={{ p: 1, border: "1px dashed", borderColor: "divider", borderRadius: 1.1 }}>
                <Typography variant="caption" color="text.secondary">Price chart (30d + MA overlays)</Typography>
                <ThemedLineChart
                  data={{
                    labels: Array.from({ length: 30 }).map((_, idx) => `D${idx + 1}`),
                    datasets: [
                      {
                        label: "Price",
                        data: Array.from({ length: 30 }).map((_, idx) => 200 + Math.round(Math.sin(idx / 4) * 16) + (idx % 7) * 3),
                        borderColor: chartTokens.chart1,
                        backgroundColor: hexToRgba(chartTokens.chart1, chartTokens.isDark ? 0.18 : 0.25),
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.32,
                      },
                      {
                        label: "MA30",
                        data: Array.from({ length: 30 }).map(() => (detailOpen.market.ma30Cents || 0) / 100),
                        borderColor: chartTokens.chart4,
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.2,
                      },
                    ],
                  }}
                  options={{
                    plugins: { legend: { position: "bottom" } },
                    scales: { y: { ticks: { callback: (value) => `$${value}` } } },
                  }}
                  height={{ xs: 180, sm: 220, md: 260 }}
                />
              </Box>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Box sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.1, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Current median</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>{moneyFromCents(detailOpen.market.currentMedianCents)}</Typography>
                </Box>
                <Box sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.1, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">MA7 / MA30 / MA90</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>{moneyFromCents(detailOpen.market.ma7Cents)} / {moneyFromCents(detailOpen.market.ma30Cents)} / {moneyFromCents(detailOpen.market.ma90Cents)}</Typography>
                </Box>
                <Box sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.1, flex: 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary">Listings snapshot</Typography>
                    <Tooltip title="Links to public listing evidence view." arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    </Tooltip>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>{detailOpen.market.activeListingsCount} active</Typography>
                  <Button color="inherit" size="small" endIcon={<OpenInNewIcon fontSize="inherit" />}>Open listings</Button>
                </Box>
              </Stack>

              {canUseProMetrics ? (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <Chip label={`p10 ${moneyFromCents(detailOpen.market.p10Cents)}`} />
                  <Chip label={`p90 ${moneyFromCents(detailOpen.market.p90Cents)}`} />
                  <Chip label={`${detailOpen.market.salesCount30d} sales (30d)`} />
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </Dialog>
    </Stack>
  );
}
