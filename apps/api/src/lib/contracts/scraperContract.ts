export type SourceKey = "JBG" | "SS" | "EBAY";
export type ThrowHand = "RHT" | "LHT" | "UNK";
export type RecordType = "variant" | "artifact";

export type ScraperImageRow = {
  b2_bucket: string;
  b2_key: string;
  url: string;
  source_image_url?: string | null;
  sha256?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ScraperPayloadRow = {
  source: SourceKey;
  source_listing_id: string;
  url: string;
  title: string;
  manufacturer: string;
  brand: string;
  market: string;
  record_type: RecordType;
  model_number?: string | null;
  canonical_sku?: string | null;
  price: number | null;
  currency: string;
  condition: string;
  sport: string;
  throw_hand: ThrowHand;
  observed_at: string;
  normalized_specs: Record<string, unknown>;
  b2_images: ScraperImageRow[];
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown) {
  return value == null || typeof value === "string";
}

function isIsoDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateScraperPayloadRow(row: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(row)) return { valid: false, errors: ["row must be an object"] };

  const source = row.source;
  if (!["JBG", "SS", "EBAY"].includes(String(source))) errors.push("source must be one of JBG|SS|EBAY");
  if (typeof row.source_listing_id !== "string" || !row.source_listing_id.trim()) errors.push("source_listing_id is required");
  if (typeof row.url !== "string" || !row.url.trim()) errors.push("url is required");
  if (typeof row.title !== "string" || !row.title.trim()) errors.push("title is required");
  if (typeof row.manufacturer !== "string" || !row.manufacturer.trim()) errors.push("manufacturer is required");
  if (typeof row.brand !== "string" || !row.brand.trim()) errors.push("brand is required");
  if (typeof row.market !== "string" || !row.market.trim()) errors.push("market is required");
  if (!["variant", "artifact"].includes(String(row.record_type))) errors.push("record_type must be variant|artifact");
  if (!isNullableString(row.model_number)) errors.push("model_number must be string|null");
  if (!isNullableString(row.canonical_sku)) errors.push("canonical_sku must be string|null");
  if (!(row.price === null || isFiniteNumber(row.price))) errors.push("price must be number|null");
  if (typeof row.currency !== "string" || !row.currency.trim()) errors.push("currency is required");
  if (typeof row.condition !== "string" || !row.condition.trim()) errors.push("condition is required");
  if (typeof row.sport !== "string" || !row.sport.trim()) errors.push("sport is required");
  if (!["RHT", "LHT", "UNK"].includes(String(row.throw_hand))) errors.push("throw_hand must be RHT|LHT|UNK");
  if (typeof row.observed_at !== "string" || !isIsoDate(row.observed_at)) errors.push("observed_at must be ISO date/time");
  if (!isObject(row.normalized_specs)) errors.push("normalized_specs must be an object");

  if (!Array.isArray(row.b2_images)) {
    errors.push("b2_images must be an array");
  } else {
    row.b2_images.forEach((image, idx) => {
      if (!isObject(image)) {
        errors.push(`b2_images[${idx}] must be an object`);
        return;
      }
      if (typeof image.b2_bucket !== "string" || !image.b2_bucket.trim()) errors.push(`b2_images[${idx}].b2_bucket is required`);
      if (typeof image.b2_key !== "string" || !image.b2_key.trim()) errors.push(`b2_images[${idx}].b2_key is required`);
      if (typeof image.url !== "string" || !image.url.trim()) errors.push(`b2_images[${idx}].url is required`);
      if (!isNullableString(image.source_image_url)) errors.push(`b2_images[${idx}].source_image_url must be string|null`);
      if (!isNullableString(image.sha256)) errors.push(`b2_images[${idx}].sha256 must be string|null`);
      if (!(image.width == null || isFiniteNumber(image.width))) errors.push(`b2_images[${idx}].width must be number|null`);
      if (!(image.height == null || isFiniteNumber(image.height))) errors.push(`b2_images[${idx}].height must be number|null`);
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateScraperPayload(rows: unknown[]): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(rows)) return { valid: false, errors: ["payload must be an array"] };
  rows.forEach((row, idx) => {
    const result = validateScraperPayloadRow(row);
    if (!result.valid) {
      for (const error of result.errors) errors.push(`row[${idx}]: ${error}`);
    }
  });
  return { valid: errors.length === 0, errors };
}
