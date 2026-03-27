import React, { useEffect, useMemo, useState } from "react";
import { Tier, canAccess } from "@gloveiq/shared";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Popover,
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
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, Card, CardContent } from "../ui/Primitives";
import { ThemedLineChart } from "./charts/ThemedCharts";
import { hexToRgba, readChartThemeTokens } from "../lib/chartjsTheme";
import glovePlaceholderImage from "../assets/baseball-glove-placeholder.svg";
import {
  api,
  type CollectionItem,
  type CollectionInspectionSummary,
  type CollectionImportJob,
  type CollectionStatus,
  type VariantRecord,
} from "../lib/api";

function moneyFromCents(cents: number | null | undefined) {
  if (typeof cents !== "number") return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatCollectionCondition(condition: string | null | undefined, normalizedCondition: string | null | undefined) {
  const raw = String(normalizedCondition || condition || "").trim();
  if (!raw) return "Unknown";
  const text = raw.toLowerCase();

  const officialLabels = [
    "Brand New / Factory Mint",
    "Like New",
    "Excellent",
    "Well Maintained Gamer",
    "Solid Used",
    "Heavily Used",
    "Very Worn",
    "Poor / Needs Repair",
    "Very Poor / Display Only",
    "Destroyed",
  ];

  const exactLabel = officialLabels.find((label) => label.toLowerCase() === text);
  if (exactLabel) return exactLabel;

  if (/(factory mint|brand new|new with tags|unused|never used|mint)/.test(text)) return "Brand New / Factory Mint";
  if (/(like new|minimal handling)/.test(text)) return "Like New";
  if (/(excellent|light break|lightly broken in)/.test(text)) return "Excellent";
  if (/(well maintained|game-ready|game ready|gamer)/.test(text)) return "Well Maintained Gamer";
  if (/(solid used|moderate wear|used|good)/.test(text)) return "Solid Used";
  if (/(heavily used|functional|broken-down|broken down)/.test(text)) return "Heavily Used";
  if (/(very worn|borderline|fair)/.test(text)) return "Very Worn";
  if (/(poor|needs repair|repair)/.test(text)) return "Poor / Needs Repair";
  if (/(display only|very poor)/.test(text)) return "Very Poor / Display Only";
  if (/(destroyed|cracked|torn|falling apart)/.test(text)) return "Destroyed";

  return raw;
}

const CONDITION_SCALE_ROWS = [
  {
    score: "10.0",
    label: "Brand New / Factory Mint",
    detail: "Never used, tags attached or clearly unused, perfect shape, stiff untouched leather.",
    accent: "#22c55e",
  },
  {
    score: "9.0",
    label: "Like New",
    detail: "Minimal handling, no true break-in, clean leather, still very stiff.",
    accent: "#38bdf8",
  },
  {
    score: "8.0",
    label: "Excellent",
    detail: "Light break-in, slight pocket forming, very clean leather, structurally perfect.",
    accent: "#6366f1",
  },
  {
    score: "7.0",
    label: "Well Maintained Gamer",
    detail: "Game-ready with minor wear, holds shape well, no structural damage.",
    accent: "#14b8a6",
  },
  {
    score: "6.0",
    label: "Solid Used",
    detail: "Moderate wear in palm and pocket, some dirt or discoloration, still structurally sound.",
    accent: "#f59e0b",
  },
  {
    score: "5.0",
    label: "Heavily Used",
    detail: "Soft and broken down, visible wear throughout, usable but clearly tired.",
    accent: "#f97316",
  },
  {
    score: "4.0",
    label: "Very Worn",
    detail: "Losing structure with drying leather or fraying laces, declining quickly.",
    accent: "#ef4444",
  },
  {
    score: "3.0",
    label: "Poor / Needs Repair",
    detail: "Broken or missing laces, significant wear, weak structure, repair needed.",
    accent: "#dc2626",
  },
  {
    score: "2.0",
    label: "Very Poor / Display Only",
    detail: "Major damage, not playable, may still hold collector or display value.",
    accent: "#a855f7",
  },
  {
    score: "1.0",
    label: "Destroyed",
    detail: "Severe structural failure, cracked or torn, completely unusable.",
    accent: "#7c3aed",
  },
];

function conditionScoreFromLabel(label: string) {
  switch (label) {
    case "Brand New / Factory Mint":
      return 10.0;
    case "Like New":
      return 9.0;
    case "Excellent":
      return 8.0;
    case "Well Maintained Gamer":
      return 7.0;
    case "Solid Used":
      return 6.0;
    case "Heavily Used":
      return 5.0;
    case "Very Worn":
      return 4.0;
    case "Poor / Needs Repair":
      return 3.0;
    case "Very Poor / Display Only":
      return 2.0;
    case "Destroyed":
      return 1.0;
    default:
      return null;
  }
}

function resolveConditionPresentation(row: CollectionItem) {
  if (row.inspection?.conditionScore != null || row.inspection?.conditionLabel) {
    return {
      label: row.inspection?.conditionLabel || "Inspection Recorded",
      score: row.inspection?.conditionScore ?? null,
      source: "inspection" as const,
    };
  }

  const label = formatCollectionCondition(row.condition, row.normalizedCondition);
  return {
    label,
    score: conditionScoreFromLabel(label),
    source: "legacy" as const,
  };
}

const INSPECTION_FACTORS = [
  { key: "structure", label: "Structure" },
  { key: "leather", label: "Leather" },
  { key: "palm", label: "Palm / Pocket" },
  { key: "laces", label: "Laces" },
  { key: "cosmetics", label: "Cosmetics" },
] as const;

type InspectionFactorKey = (typeof INSPECTION_FACTORS)[number]["key"];

type InspectionFormState = {
  structure: string;
  leather: string;
  palm: string;
  laces: string;
  cosmetics: string;
  notes: string;
};

const defaultInspectionForm: InspectionFormState = {
  structure: "7",
  leather: "7",
  palm: "7",
  laces: "7",
  cosmetics: "7",
  notes: "",
};

function buildInspectionForm(source?: CollectionInspectionSummary | null): InspectionFormState {
  if (!source) return defaultInspectionForm;
  const byName = new Map(source.factorScores.map((factor) => [factor.factorName.toLowerCase(), factor]));
  return {
    structure: String(byName.get("structure")?.factorScore ?? 7),
    leather: String(byName.get("leather")?.factorScore ?? 7),
    palm: String(byName.get("palm")?.factorScore ?? 7),
    laces: String(byName.get("laces")?.factorScore ?? 7),
    cosmetics: String(byName.get("cosmetics")?.factorScore ?? 7),
    notes: source.notes || "",
  };
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
      inspection: null,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<CollectionItem | null>(null);
  const [galleryOpen, setGalleryOpen] = useState<CollectionItem | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<CollectionItem | null>(null);
  const [form, setForm] = useState<AddFormState>(defaultForm);
  const [variantSearch, setVariantSearch] = useState("");
  const [job, setJob] = useState<CollectionImportJob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [conditionScaleOpen, setConditionScaleOpen] = useState(false);
  const [inspectionHistory, setInspectionHistory] = useState<Record<string, CollectionInspectionSummary[]>>({});
  const [inspectionLoadingFor, setInspectionLoadingFor] = useState<string | null>(null);
  const [inspectionEditorItem, setInspectionEditorItem] = useState<CollectionItem | null>(null);
  const [inspectionForm, setInspectionForm] = useState<InspectionFormState>(defaultInspectionForm);
  const [inspectionSubmitting, setInspectionSubmitting] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

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
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const brandOk = brandFilter === "ALL" || row.variant?.brand === brandFilter;
      const conditionOk = conditionFilter === "ALL" || (resolveConditionPresentation(row).label || "Unknown") === conditionFilter;
      const value = row.market.currentMedianCents || 0;
      const valueOk = maxValueFilter === "ALL" || value <= Number(maxValueFilter);
      const queryOk = !q || [
        row.variant?.title || "",
        row.variant?.variantId || "",
        row.variant?.brand || "",
        row.variant?.model || "",
        row.variant?.pattern || "",
        row.notes || "",
        row.sku || "",
        row.location || "",
      ].join(" ").toLowerCase().includes(q);
      return brandOk && conditionOk && valueOk && queryOk;
    });
  }, [rows, brandFilter, conditionFilter, maxValueFilter, searchQuery]);

  const displayRows = useMemo(() => {
    if (filteredRows.length > 0) return filteredRows;
    return buildDummyCollection(tab);
  }, [filteredRows, tab]);

  const collectionValueCents = useMemo(() => {
    if (tab !== "OWNED") return 0;
    return displayRows.reduce((sum, row) => {
      if (typeof row.market.positionValueCents === "number") return sum + row.market.positionValueCents;
      const currentMedian = row.market.currentMedianCents || 0;
      return sum + currentMedian * Math.max(1, row.quantity || 1);
    }, 0);
  }, [displayRows, tab]);

  const displayCondition = (row: CollectionItem) => resolveConditionPresentation(row).label;
  const displayConditionScore = (row: CollectionItem) => resolveConditionPresentation(row).score;

  const brandOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.variant?.brand).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const conditionOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => resolveConditionPresentation(row).label || "Unknown"))).sort((a, b) => a.localeCompare(b)),
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

  async function loadInspectionHistory(itemId: string) {
    if (inspectionHistory[itemId]) return inspectionHistory[itemId];
    setInspectionLoadingFor(itemId);
    try {
      const out = await api.getCollectionInspections(itemId, tier);
      setInspectionHistory((prev) => ({ ...prev, [itemId]: out.inspections || [] }));
      return out.inspections || [];
    } catch (e: any) {
      setInspectionError(String(e?.message || e));
      return [];
    } finally {
      setInspectionLoadingFor((current) => (current === itemId ? null : current));
    }
  }

  async function openInspectionEditor(item: CollectionItem) {
    setInspectionError(null);
    const history = await loadInspectionHistory(item.id);
    setInspectionForm(buildInspectionForm(history[0] || item.inspection));
    setInspectionEditorItem(item);
  }

  async function onSaveInspection() {
    if (!inspectionEditorItem) return;
    try {
      setInspectionSubmitting(true);
      setInspectionError(null);
      await api.createCollectionInspection(
        inspectionEditorItem.id,
        {
          inspectorType: "USER",
          inspectionSource: "MANUAL_FORM",
          notes: inspectionForm.notes || undefined,
          factorScores: INSPECTION_FACTORS.map((factor) => ({
            factorName: factor.key,
            factorScore: Number(inspectionForm[factor.key]),
          })),
        },
        tier,
      );

      const [updatedHistory, refreshedCollection] = await Promise.all([
        api.getCollectionInspections(inspectionEditorItem.id, tier),
        api.meCollection(tab as CollectionStatus, tier),
      ]);

      setInspectionHistory((prev) => ({ ...prev, [inspectionEditorItem.id]: updatedHistory.inspections || [] }));
      setRows(refreshedCollection.items || []);
      setDetailOpen((current) => (current ? (refreshedCollection.items || []).find((item) => item.id === current.id) || current : current));
      setInspectionEditorItem(null);
      setInspectionForm(defaultInspectionForm);
    } catch (e: any) {
      setInspectionError(String(e?.message || e));
    } finally {
      setInspectionSubmitting(false);
    }
  }

  useEffect(() => {
    if (!detailOpen || detailOpen.status !== "OWNED") return;
    if (inspectionHistory[detailOpen.id]) return;
    void loadInspectionHistory(detailOpen.id);
  }, [detailOpen, inspectionHistory]);

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

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }} alignItems={{ md: "center" }} justifyContent="space-between">
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            sx={{
              minHeight: 36,
              "& .MuiTab-root": { minHeight: 36, py: 0.5, fontWeight: 700 },
            }}
          >
            <Tab label="Owned" value="OWNED" />
            <Tab label="Wantlist" value="WANT" />
          </Tabs>
          <Stack direction="row" spacing={0.8} sx={{ width: { xs: "100%", md: 380 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder={`Search ${tab === "OWNED" ? "owned items" : "wantlist"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton
              aria-label="Open filters"
              onClick={(e) => setFiltersAnchorEl(e.currentTarget)}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.1 }}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent></Card>

      <Popover
        open={Boolean(filtersAnchorEl)}
        anchorEl={filtersAnchorEl}
        onClose={() => setFiltersAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 1.1, minWidth: 260 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Filters</Typography>
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setBrandFilter("ALL");
                setConditionFilter("ALL");
                setMaxValueFilter("ALL");
              }}
            >
              Reset
            </Button>
          </Stack>
          <Stack spacing={0.8}>
            <FormControl size="small" fullWidth>
              <InputLabel>Brand</InputLabel>
              <Select value={brandFilter} label="Brand" onChange={(e) => setBrandFilter(String(e.target.value))}>
                <MenuItem value="ALL">All brands</MenuItem>
                {brandOptions.map((brand) => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select value={conditionFilter} label="Condition" onChange={(e) => setConditionFilter(String(e.target.value))}>
                <MenuItem value="ALL">All conditions</MenuItem>
                {conditionOptions.map((condition) => <MenuItem key={condition} value={condition}>{condition}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
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
        </Box>
      </Popover>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {uploadError ? <Alert severity="warning">{uploadError}</Alert> : null}

      <Card><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.35}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{tab === "OWNED" ? "Owned Items" : "Wantlist Items"}</Typography>
            {tab === "OWNED" ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 0.75,
                  px: 1.1,
                  py: 0.8,
                  borderRadius: 1.4,
                  border: "1px solid",
                  borderColor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.3 : 0.18),
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.18 : 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
                  width: "fit-content",
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.4, textTransform: "uppercase" }}>
                  Collection Value
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1, color: "success.main" }}>
                  {moneyFromCents(collectionValueCents)}
                </Typography>
              </Box>
            ) : null}
          </Stack>
          <Typography variant="caption" color="text.secondary">{displayRows.length} items</Typography>
        </Stack>
        <Divider sx={{ my: 1 }} />

        {loading ? <Typography variant="body2" color="text.secondary">Loading...</Typography> : null}
        {!loading && filteredRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Empty. Search and add your first glove.</Typography>
        ) : null}

        <Box sx={{ display: "grid", gap: 1.15 }}>
          {displayRows.map((row) => (
            <Box key={row.id} sx={{ p: { xs: 1.25, md: 1.5 }, border: "1px solid", borderColor: "divider", borderRadius: 1.2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.2, md: 1.5 }} justifyContent="space-between">
                <Stack direction="row" spacing={1.2} sx={{ minWidth: 0, flex: 1 }}>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setGalleryOpen(row);
                      setGalleryIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setGalleryOpen(row);
                        setGalleryIndex(0);
                      }
                    }}
                    sx={{
                      position: "relative",
                      width: 96,
                      minWidth: 96,
                      height: 72,
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      cursor: "pointer",
                      backgroundColor: (theme) => alpha(cardPhotoTint(`${row.variant?.brand || ""}_${row.id}`), theme.palette.mode === "dark" ? 0.22 : 0.14),
                    }}
                  >
                    <Box component="img" src={glovePlaceholderImage} alt={`${row.variant?.title || "Glove"} thumbnail`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.94 }} />
                    <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(2,6,23,0.42) 100%)" }} />
                  </Box>
                  <Stack spacing={0.45} sx={{ minWidth: 0, flex: 1, py: 0.2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{row.variant?.title || row.variant?.variantId || "Unknown variant"}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {row.variant?.brand || "Unknown"} • {row.variant?.model || "n/a"} • {row.variant?.pattern || "n/a"} • {row.variant?.sizeIn || "?"}" • {row.variant?.throwHand || "?"}
                    </Typography>
                    <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap", rowGap: 0.6, pt: 0.15 }}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.35,
                          "&:hover .condition-help-icon": {
                            opacity: 1,
                            transform: "translateX(0)",
                          },
                        }}
                      >
                        <Tooltip title={displayCondition(row)} arrow>
                          <Chip
                            size="small"
                            label={`Condition: ${displayConditionScore(row)?.toFixed(1) ?? "--"}`}
                            sx={{
                              fontWeight: 700,
                              backgroundColor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.2 : 0.1),
                              border: "1px solid",
                              borderColor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.35 : 0.22),
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Open GloveIQ condition scale" arrow>
                          <IconButton
                            size="small"
                            className="condition-help-icon"
                            onClick={() => setConditionScaleOpen(true)}
                            sx={{
                              opacity: 0,
                              transform: "translateX(-2px)",
                              transition: "opacity 160ms ease, transform 160ms ease",
                              color: "info.main",
                              p: 0.25,
                            }}
                          >
                            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Chip size="small" label={`Qty: ${row.quantity}`} />
                      {isDealer && row.sku ? <Chip size="small" label={`SKU: ${row.sku}`} /> : null}
                      {isDealer && row.location ? <Chip size="small" label={`Loc: ${row.location}`} /> : null}
                    </Stack>
                  </Stack>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.1, md: 1.5 }} alignItems={{ md: "stretch" }}>
                  <Box sx={{ minWidth: { md: 82 } }}>
                    <Tooltip
                      title={row.acquisitionDate ? `Acquired ${formatShortDate(row.acquisitionDate) || row.acquisitionDate}` : "Acquisition date unavailable"}
                      arrow
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", cursor: "help" }}>Cost</Typography>
                    </Tooltip>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{moneyFromCents(row.acquisitionPriceCents)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: { md: 86 } }}>
                    <Tooltip
                      title={`Recorded ${formatShortDate(row.market.lastUpdatedAt) || row.market.lastUpdatedAt} • Condition ${displayConditionScore(row)?.toFixed(1) ?? "--"} ${displayCondition(row)}`}
                      arrow
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", cursor: "help" }}>Last sale</Typography>
                    </Tooltip>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{moneyFromCents(row.market.currentMedianCents)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: { md: 220 } }}>
                    <Typography variant="caption" color="text.secondary">7d / 30d / 90d Avg</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {moneyFromCents(row.market.ma7Cents)} / {moneyFromCents(row.market.ma30Cents)} / {moneyFromCents(row.market.ma90Cents)}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: { md: 76 } }}>
                    <Typography variant="caption" color="text.secondary">P/L</Typography>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      {typeof row.market.pnlCents === "number" ? (
                        row.market.pnlCents >= 0 ? (
                          <ArrowDropUpIcon sx={{ color: "success.main", fontSize: 20, ml: -0.45 }} />
                        ) : (
                          <ArrowDropDownIcon sx={{ color: "error.main", fontSize: 20, ml: -0.45 }} />
                        )
                      ) : null}
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{moneyFromCents(row.market.pnlCents)}</Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.55} alignItems="center" justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ pl: { md: 0.5 } }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => setDetailOpen(row)}
                      sx={{
                        minWidth: 0,
                        px: 1.1,
                        py: 0.45,
                        borderColor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.45 : 0.28),
                        color: "success.main",
                        fontWeight: 700,
                        "&:hover": {
                          borderColor: "success.main",
                          backgroundColor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                        },
                      }}
                    >
                      Detail
                    </Button>
                    <IconButton
                      aria-label={`Delete ${row.variant?.title || "collection item"}`}
                      size="small"
                      onClick={() => setDeleteConfirmItem(row)}
                      sx={{
                        color: (theme) => theme.palette.mode === "dark"
                          ? alpha(theme.palette.common.white, 0.9)
                          : alpha(theme.palette.text.primary, 0.62),
                        "&:hover": {
                          backgroundColor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.12 : 0.08),
                          color: (theme) => theme.palette.mode === "dark"
                            ? theme.palette.common.white
                            : theme.palette.text.primary,
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
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
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {detailOpen.variant?.brand} • {detailOpen.variant?.model || "n/a"} • {detailOpen.variant?.pattern || "n/a"} • {detailOpen.variant?.sizeIn || "?"}" • {detailOpen.variant?.throwHand || "?"}
                  </Typography>
                  <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.8, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={`Condition ${displayConditionScore(detailOpen)?.toFixed(1) ?? "--"} • ${displayCondition(detailOpen)}`}
                      sx={{
                        fontWeight: 700,
                        backgroundColor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.2 : 0.1),
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.35 : 0.22),
                      }}
                    />
                    {detailOpen.inspection?.createdAt ? (
                      <Typography variant="caption" color="text.secondary">
                        Latest inspection {formatShortDate(detailOpen.inspection.createdAt) || detailOpen.inspection.createdAt}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No inspection saved yet
                      </Typography>
                    )}
                  </Stack>
                </Box>
                {detailOpen.status === "OWNED" ? (
                  <Stack direction="row" spacing={0.8} justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                    <Button color="inherit" variant="outlined" onClick={() => void openInspectionEditor(detailOpen)}>
                      Grade Item
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
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

              <Box
                sx={{
                  p: 1.1,
                  borderRadius: 1.2,
                  border: "1px solid",
                  borderColor: "divider",
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.16 : 0.07)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Inspection History</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Factor-based grading synced from the new GloveIQ condition model.
                    </Typography>
                  </Box>
                  {inspectionLoadingFor === detailOpen.id ? <Chip size="small" label="Loading" /> : null}
                </Stack>
                <Stack spacing={0.8} sx={{ mt: 1 }}>
                  {(inspectionHistory[detailOpen.id] || []).length ? (
                    (inspectionHistory[detailOpen.id] || []).map((inspection) => (
                      <Box
                        key={inspection.id}
                        sx={{
                          p: 0.9,
                          borderRadius: 1.1,
                          border: "1px solid",
                          borderColor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.32 : 0.18),
                          backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.92),
                        }}
                      >
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={0.75}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {inspection.conditionScore?.toFixed(1) ?? "--"} • {inspection.conditionLabel || "Inspection"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatShortDate(inspection.createdAt) || inspection.createdAt} • {inspection.inspectorType}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.6} sx={{ flexWrap: "wrap" }}>
                            {inspection.factorScores.map((factor) => (
                              <Chip
                                key={`${inspection.id}_${factor.factorName}`}
                                size="small"
                                variant="outlined"
                                label={`${factor.factorName.toLowerCase()}: ${factor.factorScore?.toFixed(1) ?? "--"}`}
                              />
                            ))}
                          </Stack>
                        </Stack>
                        {inspection.notes ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                            {inspection.notes}
                          </Typography>
                        ) : null}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">No inspection history yet. Add a grade to start the condition timeline.</Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </Box>
      </Dialog>

      <Dialog open={conditionScaleOpen} onClose={() => setConditionScaleOpen(false)} fullWidth maxWidth="md">
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>GloveIQ Condition Scale</Typography>
              <Typography variant="body2" color="text.secondary">Numeric grading reference for owned gloves and inspection history.</Typography>
            </Box>
            <Button color="inherit" onClick={() => setConditionScaleOpen(false)}>Close</Button>
          </Stack>
          <Box
            sx={{
              mt: 1.4,
              p: 1.1,
              borderRadius: 1.4,
              border: "1px solid",
              borderColor: "divider",
              background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.18 : 0.08)} 0%, ${alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.12 : 0.06)} 100%)`,
            }}
          >
            <Typography variant="caption" sx={{ display: "block", fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "text.secondary" }}>
              Factor Weights
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.35 }}>
              Structure 30% • Leather 25% • Palm / Pocket 20% • Laces 15% • Cosmetics 10%
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 0.9, mt: 1.3 }}>
            {CONDITION_SCALE_ROWS.map((row) => (
              <Box
                key={row.score}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "92px 220px 1fr" },
                  gap: 1,
                  alignItems: "center",
                  p: 1.1,
                  borderRadius: 1.3,
                  border: "1px solid",
                  borderColor: (theme) => alpha(row.accent, theme.palette.mode === "dark" ? 0.4 : 0.22),
                  background: (theme) => `linear-gradient(135deg, ${alpha(row.accent, theme.palette.mode === "dark" ? 0.24 : 0.12)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.35 }}>
                    Score
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.05 }}>{row.score}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{row.label}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{row.detail}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Dialog>

      <Dialog open={Boolean(inspectionEditorItem)} onClose={() => setInspectionEditorItem(null)} fullWidth maxWidth="sm">
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Grade Owned Item</Typography>
              <Typography variant="body2" color="text.secondary">
                Save a factor-based inspection using the new GloveIQ condition scale.
              </Typography>
            </Box>
            <Button color="inherit" onClick={() => setInspectionEditorItem(null)}>Close</Button>
          </Stack>
          <Divider sx={{ my: 1 }} />
          {inspectionError ? <Alert severity="error" sx={{ mb: 1 }}>{inspectionError}</Alert> : null}
          <Stack spacing={1}>
            {INSPECTION_FACTORS.map((factor) => (
              <TextField
                key={factor.key}
                size="small"
                type="number"
                label={factor.label}
                value={inspectionForm[factor.key]}
                onChange={(e) => {
                  const next = Math.max(1, Math.min(10, Number(e.target.value || 1)));
                  setInspectionForm((prev) => ({ ...prev, [factor.key]: String(next) }));
                }}
                inputProps={{ min: 1, max: 10, step: 0.5 }}
                helperText="Score from 1.0 to 10.0"
              />
            ))}
            <TextField
              size="small"
              multiline
              minRows={3}
              label="Inspection notes"
              value={inspectionForm.notes}
              onChange={(e) => setInspectionForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </Stack>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
            <Button color="inherit" onClick={() => setInspectionEditorItem(null)}>Cancel</Button>
            <Button onClick={() => void onSaveInspection()} disabled={inspectionSubmitting}>
              {inspectionSubmitting ? "Saving..." : "Save Grade"}
            </Button>
          </Stack>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteConfirmItem)} onClose={() => setDeleteConfirmItem(null)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Delete Item?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {`Are you sure you want to remove ${deleteConfirmItem?.variant?.title || "this item"} from ${tab === "OWNED" ? "your collection" : "your wantlist"}?`}
          </Typography>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            <Button color="inherit" onClick={() => setDeleteConfirmItem(null)}>Cancel</Button>
            <Button
              color="error"
              onClick={async () => {
                if (!deleteConfirmItem) return;
                const targetId = deleteConfirmItem.id;
                setDeleteConfirmItem(null);
                await onDelete(targetId);
              }}
            >
              Yes, Delete
            </Button>
          </Stack>
        </Box>
      </Dialog>

      <Dialog open={Boolean(galleryOpen)} onClose={() => setGalleryOpen(null)} fullWidth maxWidth="md">
        <Box sx={{ p: 1.4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{galleryOpen?.variant?.title || "Item Gallery"}</Typography>
            <Button color="inherit" onClick={() => setGalleryOpen(null)}>Close</Button>
          </Stack>
          <Divider sx={{ my: 1 }} />
          {galleryOpen ? (
            <>
              {(() => {
                const tint = cardPhotoTint(`${galleryOpen.variant?.brand || ""}_${galleryOpen.id}`);
                const images = [0, 1, 2].map((idx) => ({ id: `${galleryOpen.id}_${idx}`, src: glovePlaceholderImage, tint: alpha(tint, 0.16 + idx * 0.05) }));
                return (
                  <Stack spacing={1}>
                    <Box sx={{ height: { xs: 220, md: 320 }, borderRadius: 1.2, border: "1px solid", borderColor: "divider", overflow: "hidden", bgcolor: images[galleryIndex]?.tint || alpha(tint, 0.2) }}>
                      <Box component="img" src={images[galleryIndex]?.src || glovePlaceholderImage} alt={`${galleryOpen.variant?.title || "Item"} gallery image`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </Box>
                    <Stack direction="row" spacing={0.8}>
                      {images.map((image, idx) => (
                        <Box
                          key={image.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setGalleryIndex(idx)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setGalleryIndex(idx);
                            }
                          }}
                          sx={{
                            width: 88,
                            height: 66,
                            borderRadius: 1,
                            overflow: "hidden",
                            border: "2px solid",
                            borderColor: idx === galleryIndex ? "primary.main" : "divider",
                            cursor: "pointer",
                            bgcolor: image.tint,
                          }}
                        >
                          <Box component="img" src={image.src} alt={`Thumbnail ${idx + 1}`} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                );
              })()}
            </>
          ) : null}
        </Box>
      </Dialog>
    </Stack>
  );
}
