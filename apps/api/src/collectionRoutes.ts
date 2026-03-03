import express from "express";
import multer from "multer";
import { canAccess, isTier, Tier } from "@gloveiq/shared";
import { Prisma, PrismaClient, type CollectionItemStatus, type UserCollectionItem } from "@prisma/client";

type VariantLike = {
  variant_id: string;
  brand_key: string;
  model_code: string | null;
  pattern_id: string | null;
  display_name: string;
  variant_label: string;
  year: number;
  web: string | null;
};

type PatternLike = {
  pattern_id: string;
  pattern_code: string;
  canonical_size_in: number | null;
};

type SaleLike = {
  variant_id: string;
  sale_date: string;
  price_usd: number;
};

type ArtifactLike = {
  model_code?: string | null;
  listing_url?: string | null;
};

type AuthContext = {
  userId: string;
  tier: Tier;
};

type RequestWithAuth = express.Request & { auth?: AuthContext };

type CollectionDeps = {
  prisma: PrismaClient;
  variants: VariantLike[];
  patterns: PatternLike[];
  sales: SaleLike[];
  artifacts: ArtifactLike[];
};

type ImportInputRow = {
  rowIndex: number;
  variant_id?: string;
  brand?: string;
  model?: string;
  pattern?: string;
  size?: string;
  throw_hand?: string;
  quantity?: string | number;
  acquisition_price?: string | number;
  condition?: string;
  sku?: string;
  location?: string;
  notes?: string;
};

type DailyPoint = { day: string; median: number };

type ItemMetrics = {
  currentMedian: number | null;
  ma7: number | null;
  ma30: number | null;
  ma90: number | null;
  p10: number | null;
  p90: number | null;
  salesCount30d: number;
  activeListingsCount: number;
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

function normalize(s: unknown): string {
  return String(s || "").trim().toLowerCase();
}

function requireAuth(req: RequestWithAuth, res: express.Response, next: express.NextFunction) {
  const userId = String(req.header("x-user-id") || "dev-user").trim();
  const tierRaw = String(req.header("x-user-tier") || "FREE").trim().toUpperCase();
  const tier = isTier(tierRaw) ? tierRaw : Tier.FREE;
  if (!userId) return res.status(401).json({ error: "Missing user identity" });
  req.auth = { userId, tier };
  return next();
}

function requireTier(min: Tier) {
  return (req: RequestWithAuth, res: express.Response, next: express.NextFunction) => {
    const current = req.auth?.tier || Tier.FREE;
    if (!canAccess(min, current)) return res.status(403).json({ error: `Requires ${min} tier` });
    return next();
  };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[idx];
  return (sorted[idx - 1] + sorted[idx]) / 2;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  const t = index - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function toDailyMedian(rows: SaleLike[]): DailyPoint[] {
  const byDay = new Map<string, number[]>();
  for (const row of rows) {
    const d = new Date(row.sale_date);
    if (!Number.isFinite(d.getTime())) continue;
    const day = d.toISOString().slice(0, 10);
    const list = byDay.get(day) || [];
    list.push(Number(row.price_usd || 0));
    byDay.set(day, list);
  }
  return Array.from(byDay.entries())
    .map(([day, prices]) => ({ day, median: Number(median(prices) || 0) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function movingAverage(points: DailyPoint[], days: number): number | null {
  if (!points.length) return null;
  const slice = points.slice(-days);
  if (!slice.length) return null;
  return slice.reduce((sum, row) => sum + row.median, 0) / slice.length;
}

function getVariantSummary(variant: VariantLike | undefined, patternsById: Map<string, PatternLike>) {
  if (!variant) return null;
  const pattern = variant.pattern_id ? patternsById.get(variant.pattern_id) : undefined;
  return {
    variantId: variant.variant_id,
    brand: variant.brand_key,
    model: variant.model_code,
    pattern: pattern?.pattern_code || variant.pattern_id,
    sizeIn: pattern?.canonical_size_in ?? null,
    throwHand: String(variant.variant_label || "").toUpperCase().includes("LHT") ? "LHT" : "RHT",
    title: variant.display_name,
    year: variant.year,
    web: variant.web,
  };
}

function calcMetrics(args: {
  variantId: string;
  variant: VariantLike | undefined;
  sales: SaleLike[];
  artifacts: ArtifactLike[];
}): ItemMetrics {
  const { variantId, variant, sales, artifacts } = args;
  const now = Date.now();
  const daysMs = 24 * 60 * 60 * 1000;
  const last30Cutoff = now - 30 * daysMs;
  const variantSales = sales.filter((row) => row.variant_id === variantId && Number(row.price_usd) > 0);
  const sales30d = variantSales.filter((row) => {
    const d = Date.parse(row.sale_date);
    return Number.isFinite(d) && d >= last30Cutoff;
  });
  const price30d = sales30d.map((s) => Number(s.price_usd || 0)).filter((n) => n > 0);
  const daily = toDailyMedian(variantSales);

  let activeListingsCount = 0;
  if (variant?.model_code) {
    const modelNorm = normalize(variant.model_code).replace(/[^a-z0-9]/g, "");
    activeListingsCount = artifacts.filter((a) => {
      if (!a.listing_url) return false;
      const rowNorm = normalize(a.model_code).replace(/[^a-z0-9]/g, "");
      return Boolean(modelNorm && rowNorm && rowNorm === modelNorm);
    }).length;
  }

  return {
    currentMedian: median(price30d),
    ma7: movingAverage(daily, 7),
    ma30: movingAverage(daily, 30),
    ma90: movingAverage(daily, 90),
    p10: percentile(price30d, 0.1),
    p90: percentile(price30d, 0.9),
    salesCount30d: sales30d.length,
    activeListingsCount,
  };
}

function csvSplit(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function parseCsvRows(input: string): ImportInputRow[] {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = csvSplit(lines[0]).map((h) => normalize(h));
  const out: ImportInputRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = csvSplit(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j += 1) row[headers[j]] = cols[j] || "";
    out.push({
      rowIndex: i,
      variant_id: row.variant_id,
      brand: row.brand,
      model: row.model,
      pattern: row.pattern,
      size: row.size,
      throw_hand: row.throw_hand,
      quantity: row.quantity,
      acquisition_price: row.acquisition_price,
      condition: row.condition,
      sku: row.sku,
      location: row.location,
      notes: row.notes,
    });
  }
  return out;
}

function matchVariant(row: ImportInputRow, variants: VariantLike[], patternsById: Map<string, PatternLike>): string | null {
  if (row.variant_id) {
    const found = variants.find((v) => v.variant_id === row.variant_id);
    if (found) return found.variant_id;
  }
  const brand = normalize(row.brand);
  const model = normalize(row.model).replace(/[^a-z0-9]/g, "");
  const pattern = normalize(row.pattern);
  const size = Number(row.size || 0);

  const matches = variants.filter((variant) => {
    if (brand && normalize(variant.brand_key) !== brand) return false;
    const modelCode = normalize(variant.model_code).replace(/[^a-z0-9]/g, "");
    if (model && !modelCode.includes(model)) return false;
    if (pattern) {
      const p = variant.pattern_id ? patternsById.get(variant.pattern_id) : undefined;
      if (!p || !normalize(p.pattern_code).includes(pattern)) return false;
    }
    if (size > 0) {
      const p = variant.pattern_id ? patternsById.get(variant.pattern_id) : undefined;
      if (!p?.canonical_size_in || Math.abs(p.canonical_size_in - size) > 0.2) return false;
    }
    return true;
  });

  return matches.length === 1 ? matches[0].variant_id : null;
}

function parseCurrencyToCents(value: unknown): number | null {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function mapCollectionItem(item: UserCollectionItem, deps: CollectionDeps) {
  const variantById = new Map(deps.variants.map((v) => [v.variant_id, v]));
  const patternsById = new Map(deps.patterns.map((p) => [p.pattern_id, p]));
  const variant = variantById.get(item.variantId);
  const metrics = calcMetrics({ variantId: item.variantId, variant, sales: deps.sales, artifacts: deps.artifacts });
  const marketValueCents = metrics.currentMedian == null ? null : Math.round(metrics.currentMedian * 100);
  const quantity = Math.max(1, item.quantity || 1);
  const positionValue = marketValueCents == null ? null : marketValueCents * quantity;
  const acquisition = item.acquisitionPriceCents == null ? null : item.acquisitionPriceCents * quantity;

  return {
    id: item.id,
    status: item.status,
    quantity,
    condition: item.condition,
    normalizedCondition: item.normalizedCondition,
    acquisitionPriceCents: item.acquisitionPriceCents,
    acquisitionDate: item.acquisitionDate,
    targetPriceCents: item.targetPriceCents,
    notes: item.notes,
    sku: item.sku,
    location: item.location,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    variant: getVariantSummary(variant, patternsById),
    market: {
      currentMedianCents: marketValueCents,
      ma7Cents: metrics.ma7 == null ? null : Math.round(metrics.ma7 * 100),
      ma30Cents: metrics.ma30 == null ? null : Math.round(metrics.ma30 * 100),
      ma90Cents: metrics.ma90 == null ? null : Math.round(metrics.ma90 * 100),
      p10Cents: metrics.p10 == null ? null : Math.round(metrics.p10 * 100),
      p90Cents: metrics.p90 == null ? null : Math.round(metrics.p90 * 100),
      salesCount30d: metrics.salesCount30d,
      activeListingsCount: metrics.activeListingsCount,
      positionValueCents: positionValue,
      pnlCents: acquisition == null || positionValue == null ? null : positionValue - acquisition,
      lastUpdatedAt: new Date().toISOString(),
    },
  };
}

function buildCollectionRouter(deps: CollectionDeps) {
  const router = express.Router();
  const patternsById = new Map(deps.patterns.map((p) => [p.pattern_id, p]));

  router.use(requireAuth);

  router.get("/collection", requireTier(Tier.COLLECTOR), async (req: RequestWithAuth, res) => {
    try {
      const statusQuery = String(req.query.status || "OWNED").toUpperCase();
      const status: CollectionItemStatus = statusQuery === "WANT" ? "WANT" : "OWNED";
      const items = await deps.prisma.userCollectionItem.findMany({
        where: { userId: req.auth!.userId, status },
        orderBy: { updatedAt: "desc" },
      });
      return res.json({
        items: items.map((item) => mapCollectionItem(item, deps)),
      });
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.post("/collection", requireTier(Tier.COLLECTOR), async (req: RequestWithAuth, res) => {
    try {
      const body = req.body || {};
      const variantId = String(body.variantId || "").trim();
      if (!variantId) return res.status(400).json({ error: "variantId is required" });
      if (!deps.variants.find((v) => v.variant_id === variantId)) return res.status(404).json({ error: "Variant not found" });
      const statusRaw = String(body.status || "OWNED").toUpperCase();
      const status: CollectionItemStatus = statusRaw === "WANT" ? "WANT" : "OWNED";

      const item = await deps.prisma.userCollectionItem.create({
        data: {
          userId: req.auth!.userId,
          variantId,
          status,
          quantity: Math.max(1, Number(body.quantity || 1)),
          condition: body.condition ? String(body.condition) : null,
          normalizedCondition: body.normalizedCondition ? String(body.normalizedCondition) : null,
          acquisitionPriceCents: parseCurrencyToCents(body.acquisitionPrice),
          acquisitionDate: body.acquisitionDate ? new Date(String(body.acquisitionDate)) : null,
          targetPriceCents: parseCurrencyToCents(body.targetPrice),
          notes: body.notes ? String(body.notes) : null,
          sku: body.sku ? String(body.sku) : null,
          location: body.location ? String(body.location) : null,
        },
      });
      return res.status(201).json(mapCollectionItem(item, deps));
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.patch("/collection/:id", requireTier(Tier.COLLECTOR), async (req: RequestWithAuth, res) => {
    try {
      const id = String(req.params.id || "");
      const existing = await deps.prisma.userCollectionItem.findFirst({ where: { id, userId: req.auth!.userId } });
      if (!existing) return res.status(404).json({ error: "Collection item not found" });

      const body = req.body || {};
      const statusRaw = body.status ? String(body.status).toUpperCase() : existing.status;
      const status: CollectionItemStatus = statusRaw === "WANT" ? "WANT" : "OWNED";
      const updated = await deps.prisma.userCollectionItem.update({
        where: { id },
        data: {
          status,
          quantity: body.quantity == null ? undefined : Math.max(1, Number(body.quantity || 1)),
          condition: body.condition === undefined ? undefined : (body.condition ? String(body.condition) : null),
          normalizedCondition: body.normalizedCondition === undefined ? undefined : (body.normalizedCondition ? String(body.normalizedCondition) : null),
          acquisitionPriceCents: body.acquisitionPrice === undefined ? undefined : parseCurrencyToCents(body.acquisitionPrice),
          acquisitionDate: body.acquisitionDate === undefined ? undefined : (body.acquisitionDate ? new Date(String(body.acquisitionDate)) : null),
          targetPriceCents: body.targetPrice === undefined ? undefined : parseCurrencyToCents(body.targetPrice),
          notes: body.notes === undefined ? undefined : (body.notes ? String(body.notes) : null),
          sku: body.sku === undefined ? undefined : (body.sku ? String(body.sku) : null),
          location: body.location === undefined ? undefined : (body.location ? String(body.location) : null),
          variantId: body.variantId ? String(body.variantId) : undefined,
        },
      });

      return res.json(mapCollectionItem(updated, deps));
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.delete("/collection/:id", requireTier(Tier.COLLECTOR), async (req: RequestWithAuth, res) => {
    try {
      const id = String(req.params.id || "");
      const existing = await deps.prisma.userCollectionItem.findFirst({ where: { id, userId: req.auth!.userId } });
      if (!existing) return res.status(404).json({ error: "Collection item not found" });
      await deps.prisma.userCollectionItem.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.post("/inventory/import", requireTier(Tier.DEALER), upload.single("file"), async (req: RequestWithAuth, res) => {
    try {
      const rawRows = Array.isArray(req.body?.rows)
        ? (req.body.rows as ImportInputRow[])
        : req.file
          ? parseCsvRows(req.file.buffer.toString("utf-8"))
          : [];
      if (!rawRows.length) return res.status(400).json({ error: "No import rows provided" });

      const job = await deps.prisma.collectionImportJob.create({
        data: {
          userId: req.auth!.userId,
          status: "PENDING",
          fileName: req.file?.originalname || "rows.json",
          totalRows: rawRows.length,
        },
      });

      let matchedRows = 0;
      let errorRows = 0;
      const rowCreates = rawRows.map((row) => {
        const matchedVariantId = matchVariant(row, deps.variants, patternsById);
        const errors: string[] = [];
        if (!matchedVariantId) errors.push("UNMATCHED_VARIANT");
        if (!Number.isFinite(Number(row.quantity || 1))) errors.push("INVALID_QUANTITY");
        if (errors.length) errorRows += 1;
        if (matchedVariantId) matchedRows += 1;
        return deps.prisma.collectionImportRow.create({
          data: {
            jobId: job.id,
            rawRowJson: row as any,
            matchedVariantId,
            errorsJson: errors.length ? (errors as any) : undefined,
          },
        });
      });
      await deps.prisma.$transaction(rowCreates);

      const unmatchedRows = rawRows.length - matchedRows;
      await deps.prisma.collectionImportJob.update({
        where: { id: job.id },
        data: {
          status: "PREVIEW_READY",
          matchedRows,
          unmatchedRows,
          errorRows,
        },
      });

      const rows = await deps.prisma.collectionImportRow.findMany({ where: { jobId: job.id }, orderBy: { createdAt: "asc" } });
      return res.status(201).json({ jobId: job.id, status: "PREVIEW_READY", rows });
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.get("/inventory/import/:jobId", requireTier(Tier.DEALER), async (req: RequestWithAuth, res) => {
    try {
      const jobId = String(req.params.jobId || "");
      const job = await deps.prisma.collectionImportJob.findFirst({ where: { id: jobId, userId: req.auth!.userId } });
      if (!job) return res.status(404).json({ error: "Import job not found" });
      const rows = await deps.prisma.collectionImportRow.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });
      return res.json({ ...job, rows });
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.post("/inventory/import/:jobId/resolve", requireTier(Tier.DEALER), async (req: RequestWithAuth, res) => {
    try {
      const jobId = String(req.params.jobId || "");
      const rowId = String(req.body?.rowId || "");
      const variantId = String(req.body?.variantId || "");
      if (!rowId || !variantId) return res.status(400).json({ error: "rowId and variantId are required" });

      const job = await deps.prisma.collectionImportJob.findFirst({ where: { id: jobId, userId: req.auth!.userId } });
      if (!job) return res.status(404).json({ error: "Import job not found" });
      if (!deps.variants.some((v) => v.variant_id === variantId)) return res.status(404).json({ error: "Variant not found" });

      const row = await deps.prisma.collectionImportRow.update({
        where: { id: rowId },
        data: { matchedVariantId: variantId, errorsJson: Prisma.JsonNull },
      });

      const rows = await deps.prisma.collectionImportRow.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });
      const matchedRows = rows.filter((item) => Boolean(item.matchedVariantId)).length;
      const unmatchedRows = rows.length - matchedRows;
      const errorRows = rows.filter((item) => Array.isArray(item.errorsJson) && item.errorsJson.length > 0).length;
      await deps.prisma.collectionImportJob.update({
        where: { id: jobId },
        data: { matchedRows, unmatchedRows, errorRows, status: "PREVIEW_READY" },
      });

      return res.json({ row, matchedRows, unmatchedRows, errorRows });
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  router.post("/inventory/import/:jobId/confirm", requireTier(Tier.DEALER), async (req: RequestWithAuth, res) => {
    try {
      const jobId = String(req.params.jobId || "");
      const job = await deps.prisma.collectionImportJob.findFirst({ where: { id: jobId, userId: req.auth!.userId } });
      if (!job) return res.status(404).json({ error: "Import job not found" });
      const rows = await deps.prisma.collectionImportRow.findMany({ where: { jobId } });
      const matched = rows.filter((row) => row.matchedVariantId);
      if (!matched.length) return res.status(400).json({ error: "No matched rows to import" });

      await deps.prisma.$transaction(
        matched.map((row) => {
          const raw = row.rawRowJson as any;
          return deps.prisma.userCollectionItem.create({
            data: {
              userId: req.auth!.userId,
              variantId: String(row.matchedVariantId),
              status: "OWNED",
              quantity: Math.max(1, Number(raw?.quantity || 1)),
              condition: raw?.condition ? String(raw.condition) : null,
              acquisitionPriceCents: parseCurrencyToCents(raw?.acquisition_price),
              notes: raw?.notes ? String(raw.notes) : null,
              sku: raw?.sku ? String(raw.sku) : null,
              location: raw?.location ? String(raw.location) : null,
            },
          });
        }),
      );
      await deps.prisma.collectionImportJob.update({ where: { id: jobId }, data: { status: "IMPORTED" } });
      return res.json({ ok: true, imported: matched.length });
    } catch (error) {
      return res.status(500).json({ error: String((error as Error).message || error) });
    }
  });

  return router;
}

export function mountCollectionRoutes(app: express.Express, deps: CollectionDeps) {
  app.use("/api/me", buildCollectionRouter(deps));
}
