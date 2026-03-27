import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "..", "..");
const B2_ENDPOINT = String(process.env.B2_ENDPOINT || "https://api.backblazeb2.com").trim();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(apiRoot, ".env"));

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function slugify(value, fallback = "unknown") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const cleaned = String(value).trim();
    if (cleaned) return cleaned;
  }
  return null;
}

function inferRole(index, sourceUrl) {
  const url = String(sourceUrl || "").toLowerCase();
  if (index === 1) return "HERO";
  if (url.includes("palm")) return "PALM";
  if (url.includes("back")) return "BACK";
  if (url.includes("liner")) return "LINER";
  if (url.includes("wrist")) return "WRIST_PATCH";
  return "OTHER";
}

function deterministicUuid(input) {
  const hex = crypto.createHash("md5").update(String(input)).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function isLikelyProductImage(sourceUrl) {
  const url = String(sourceUrl || "").toLowerCase();
  if (!url) return false;
  const blocked = [
    "social-icons",
    "justballgloves-logo",
    "justbats-logo",
    "help-glove",
    "price-match-icon",
    "ssl-sectigo",
    "bbb.png",
    "gcr49",
    "ups.svg",
    "tiktok",
    "facebook",
    "instagram",
    "pinterest",
    "youtube",
    "mqdefault.jpg",
    "glove-prep_",
    "glove-care-kit",
    "trusted-glove-prep-service",
    "wooden-mallet",
    "glove_assurance_badge",
    "pro-soft-glove-conditioner",
    "logos/",
  ];
  return !blocked.some((token) => url.includes(token));
}

function selectImagesForIngest(manifest) {
  const includeAll = process.env.LIBRARY_INGEST_INCLUDE_ALL_IMAGES === "1";
  const mappings = Array.isArray(manifest?.image_mappings) ? manifest.image_mappings : [];
  const productImages = mappings.filter((image) => isLikelyProductImage(image.source_url));
  if (includeAll) return productImages;
  return productImages.slice(0, 6);
}

function extensionFromMimeOrUrl(contentType, sourceUrl) {
  const mime = String(contentType || "").toLowerCase();
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("svg")) return ".svg";

  const cleanUrl = String(sourceUrl || "").split("?")[0].split("#")[0];
  const ext = path.extname(cleanUrl).toLowerCase();
  if (ext) return ext;
  return ".jpg";
}

function buildB2Key(image, row) {
  const explicit = String(image?.target_storage_key || "").trim();
  if (explicit) return explicit.replace(/^\/+/, "");
  const source = slugify(row?.source || "library");
  const listing = slugify(row?.source_listing_id || row?.listing_pk || "listing");
  const ordinal = Number(image?.image_index ?? 0);
  const ext = extensionFromMimeOrUrl(image?.content_type, image?.source_url);
  return `library/${source}/${listing}/${ordinal}${ext}`;
}

function hasBackblazeConfig() {
  return Boolean(
    process.env.B2_KEY_ID
      && process.env.B2_APPLICATION_KEY
      && process.env.B2_BUCKET_ID
      && process.env.B2_BUCKET_NAME,
  );
}

let cachedB2Auth = null;
let cachedB2UploadTarget = null;

async function authorizeBackblaze() {
  if (cachedB2Auth) return cachedB2Auth;
  const basic = Buffer.from(`${process.env.B2_KEY_ID}:${process.env.B2_APPLICATION_KEY}`).toString("base64");
  const rsp = await fetch(`${B2_ENDPOINT}/b2api/v2/b2_authorize_account`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!rsp.ok) {
    throw new Error(`Backblaze auth failed (${rsp.status})`);
  }
  const json = await rsp.json();
  cachedB2Auth = {
    apiUrl: String(json.apiUrl || ""),
    authorizationToken: String(json.authorizationToken || ""),
    downloadUrl: String(json.downloadUrl || ""),
  };
  return cachedB2Auth;
}

async function getBackblazeUploadTarget() {
  if (cachedB2UploadTarget) return cachedB2UploadTarget;
  const auth = await authorizeBackblaze();
  const rsp = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID }),
  });
  if (!rsp.ok) {
    throw new Error(`Backblaze upload URL request failed (${rsp.status})`);
  }
  const json = await rsp.json();
  cachedB2UploadTarget = {
    uploadUrl: String(json.uploadUrl || ""),
    authorizationToken: String(json.authorizationToken || ""),
  };
  return cachedB2UploadTarget;
}

async function uploadToBackblaze({ key, body, contentType }) {
  const uploadTarget = await getBackblazeUploadTarget();
  const sha1Hex = crypto.createHash("sha1").update(body).digest("hex");
  const rsp = await fetch(uploadTarget.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: uploadTarget.authorizationToken,
      "X-Bz-File-Name": encodeURIComponent(key),
      "Content-Type": contentType || "b2/x-auto",
      "Content-Length": String(body.byteLength),
      "X-Bz-Content-Sha1": sha1Hex,
    },
    body: new Uint8Array(body),
  });
  if (!rsp.ok) {
    throw new Error(`Backblaze upload failed (${rsp.status})`);
  }
  const json = await rsp.json();
  return {
    key,
    fileId: String(json.fileId || ""),
    contentSha1: String(json.contentSha1 || sha1Hex),
  };
}

async function materializeImageToBackblaze(image, row) {
  const sourceUrl = String(image?.source_url || "").trim();
  if (!sourceUrl || !hasBackblazeConfig()) {
    return {
      sourceUrl: sourceUrl || null,
      b2Bucket: process.env.B2_BUCKET_NAME || null,
      b2Key: String(image?.target_storage_key || "").trim() || null,
      contentType: image?.content_type || null,
      bytes: null,
      sha256: null,
      fetchStatus: "PENDING",
      fetchedAt: null,
      uploadedAt: null,
      metadata: {
        target_storage_key: image?.target_storage_key || null,
        mapping_key: image?.mapping_key || null,
      },
    };
  }

  const fetchRsp = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "GloveIQLibraryIngest/1.0",
      Accept: "image/*,*/*;q=0.8",
    },
  });
  if (!fetchRsp.ok) {
    throw new Error(`Image fetch failed (${fetchRsp.status}) for ${sourceUrl}`);
  }

  const body = Buffer.from(await fetchRsp.arrayBuffer());
  const contentType = fetchRsp.headers.get("content-type") || image?.content_type || "application/octet-stream";
  const sha256 = crypto.createHash("sha256").update(body).digest("hex");
  const key = buildB2Key(image, row);
  await uploadToBackblaze({ key, body, contentType });
  const nowIso = new Date().toISOString();

  return {
    sourceUrl,
    b2Bucket: process.env.B2_BUCKET_NAME || null,
    b2Key: key,
    contentType,
    bytes: body.byteLength,
    sha256,
    fetchStatus: "UPLOADED",
    fetchedAt: nowIso,
    uploadedAt: nowIso,
    metadata: {
      target_storage_key: image?.target_storage_key || null,
      mapping_key: image?.mapping_key || null,
      uploaded_via: "library_ingest",
    },
  };
}

function extractRawSpecs(row) {
  const raw = row.raw_specs || {};
  const specJson = raw.spec_json || {};
  return Object.entries(specJson)
    .filter(([key, value]) => value != null && key !== "glove_profile")
    .map(([spec_key, spec_value]) => ({
      spec_key,
      spec_value: spec_value == null ? null : String(spec_value),
      source_label: "spec_json",
    }));
}

function buildNormalizedSpecs(row) {
  const raw = row.raw_specs || {};
  const specJson = raw.spec_json || {};
  const gloveProfile = raw.glove_profile || specJson.glove_profile || {};
  return {
    back: firstNonEmpty(specJson.Back, gloveProfile.Back),
    color: firstNonEmpty(specJson.Color, gloveProfile.Color),
    fit: firstNonEmpty(specJson.Fit, gloveProfile.Fit),
    leather: firstNonEmpty(specJson.Leather, gloveProfile.Leather),
    lining: firstNonEmpty(specJson.Lining, gloveProfile.Lining),
    padding: firstNonEmpty(specJson.Padding, gloveProfile.Padding),
    shell: firstNonEmpty(specJson.Shell, gloveProfile.Shell),
    special_feature: firstNonEmpty(specJson["Special Feature"], gloveProfile["Special Feature"]),
    usage: firstNonEmpty(specJson.Usage, gloveProfile.Usage),
    used_by: firstNonEmpty(specJson["Used by"], gloveProfile["Used by"]),
    web: firstNonEmpty(specJson.Web, gloveProfile.Web, row.web_type),
    wrist: firstNonEmpty(specJson.Wrist, gloveProfile.Wrist),
    description: firstNonEmpty(specJson.Description, row.raw_text, row.title),
    confidence: row.normalized_confidence || {},
  };
}

async function main() {
  const outDir = process.env.LIBRARY_EXPORT_DIR
    ? path.resolve(process.env.LIBRARY_EXPORT_DIR)
    : path.join(repoRoot, "data_exports");

  const normalizedRowsAll = readJsonl(path.join(outDir, "listings.normalized.jsonl"));
  const rawRows = readJsonl(path.join(outDir, "listings.raw.jsonl"));
  const manifestRows = readJsonl(path.join(outDir, "media_manifest.jsonl"));
  const maxRows = Math.max(0, Number(process.env.LIBRARY_INGEST_MAX_ROWS || 0));
  const normalizedRows = maxRows > 0 ? normalizedRowsAll.slice(0, maxRows) : normalizedRowsAll;

  if (!normalizedRows.length) {
    console.error("No normalized listings found. Run the library export first.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const manifestByListing = new Map(manifestRows.map((row) => [row.listing_pk, row]));
  const rawByListing = new Map(rawRows.map((row) => [row.listing_pk, row]));
  const sourceCache = new Map();
  const brandCache = new Map();
  const gloveCache = new Map();
  const uploadedImageCache = new Map();

  const ingestRunId = crypto.randomUUID?.() || `run_${Date.now()}`;

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO ingest_runs (id, run_type, status, trigger_mode, started_at, cursor_in, cursor_out, metrics, notes)
      VALUES ($1::uuid, 'library_export_import', 'RUNNING', 'manual', now(), '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Import from data_exports')
      ON CONFLICT (id) DO NOTHING
    `, ingestRunId);

    for (const row of normalizedRows) {
      const sourceType = row.source === "JBG" ? "retailer" : "marketplace";
      const sourceSlug = slugify(row.source, "source");
      const brandName = firstNonEmpty(row.brand, "Unknown");
      const brandSlug = slugify(brandName, "unknown");

      if (!brandCache.has(brandSlug)) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO brands (slug, name, brand_type)
          VALUES ($1, $2, 'manufacturer')
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        `, brandSlug, brandName);
        const brandRows = await prisma.$queryRawUnsafe(`SELECT id::text AS id FROM brands WHERE slug = $1 LIMIT 1`, brandSlug);
        brandCache.set(brandSlug, brandRows[0]?.id || null);
      }

      const brandId = brandCache.get(brandSlug);
      const sourceKey = `${sourceSlug}:${brandId || "none"}`;
      if (!sourceCache.has(sourceKey)) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO sources (brand_id, source_type, name, base_url)
          VALUES ($1::uuid, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, brandId, sourceType, row.source, row.url || null);
        const sourceRows = await prisma.$queryRawUnsafe(`
          SELECT id::text AS id
          FROM sources
          WHERE name = $1
          ORDER BY created_at ASC
          LIMIT 1
        `, row.source);
        sourceCache.set(sourceKey, sourceRows[0]?.id || null);
      }
      const sourceId = sourceCache.get(sourceKey);

      const gloveKey = row.glove_id || `${row.record_type || "artifact"}:${row.source}:${row.source_listing_id}`;
      if (!gloveCache.has(gloveKey)) {
        const normalizedSpecs = buildNormalizedSpecs(row);
        const gloveId = deterministicUuid(gloveKey);
        await prisma.$executeRawUnsafe(`
          INSERT INTO gloves (
            id,
            record_type,
            manufacturer_brand_id,
            canonical_name,
            item_number,
            pattern,
            series,
            level,
            sport,
            age_group,
            size_in,
            throwing_hand,
            market_origin
          )
          VALUES (
            $13::uuid,
            $1,
            $2::uuid,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12
          )
          ON CONFLICT (id) DO UPDATE SET
            record_type = EXCLUDED.record_type,
            manufacturer_brand_id = EXCLUDED.manufacturer_brand_id,
            canonical_name = EXCLUDED.canonical_name,
            item_number = EXCLUDED.item_number,
            pattern = EXCLUDED.pattern,
            series = EXCLUDED.series,
            level = EXCLUDED.level,
            sport = EXCLUDED.sport,
            age_group = EXCLUDED.age_group,
            size_in = EXCLUDED.size_in,
            throwing_hand = EXCLUDED.throwing_hand,
            market_origin = EXCLUDED.market_origin,
            updated_at = now()
        `, row.record_type || "artifact", brandId, row.canonical_name || row.title || "Unknown", row.item_number || row.model_code || null, row.pattern || null, row.series || null, row.level || null, row.sport || null, row.age_group || null, row.size_in ?? null, row.throw_hand || row.hand || null, row.market_origin || null, gloveId);
        gloveCache.set(gloveKey, gloveId);

        if (gloveId) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO glove_specs_normalized (
              glove_id, back, color, fit, leather, lining, padding, shell, special_feature, usage, used_by, web, wrist, description, confidence
            )
            VALUES (
              $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb
            )
            ON CONFLICT (glove_id) DO UPDATE SET
              back = EXCLUDED.back,
              color = EXCLUDED.color,
              fit = EXCLUDED.fit,
              leather = EXCLUDED.leather,
              lining = EXCLUDED.lining,
              padding = EXCLUDED.padding,
              shell = EXCLUDED.shell,
              special_feature = EXCLUDED.special_feature,
              usage = EXCLUDED.usage,
              used_by = EXCLUDED.used_by,
              web = EXCLUDED.web,
              wrist = EXCLUDED.wrist,
              description = EXCLUDED.description,
              confidence = EXCLUDED.confidence,
              updated_at = now()
          `, gloveId, normalizedSpecs.back, normalizedSpecs.color, normalizedSpecs.fit, normalizedSpecs.leather, normalizedSpecs.lining, normalizedSpecs.padding, normalizedSpecs.shell, normalizedSpecs.special_feature, normalizedSpecs.usage, normalizedSpecs.used_by, normalizedSpecs.web, normalizedSpecs.wrist, normalizedSpecs.description, JSON.stringify(normalizedSpecs.confidence || {}));
        }
      }

      const gloveId = gloveCache.get(gloveKey);
      const listingIdRows = await prisma.$queryRawUnsafe(`
        INSERT INTO listings (
          source_id, external_listing_id, url, title, seller_name, condition, price_amount, price_currency, available
        )
        VALUES ($1::uuid, $2, $3, $4, NULL, $5, $6, $7, true)
        ON CONFLICT (source_id, external_listing_id) DO UPDATE SET
          url = EXCLUDED.url,
          title = EXCLUDED.title,
          condition = EXCLUDED.condition,
          price_amount = EXCLUDED.price_amount,
          price_currency = EXCLUDED.price_currency,
          available = EXCLUDED.available,
          updated_at = now()
        RETURNING id::text
      `, sourceId, row.source_listing_id, row.url || null, row.title || null, row.condition || null, row.price ?? null, row.currency || null);

      const listingId = listingIdRows[0]?.id;
      if (!listingId) continue;

      if (gloveId) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO listing_glove_links (listing_id, glove_id)
          VALUES ($1::uuid, $2::uuid)
          ON CONFLICT (listing_id) DO UPDATE SET glove_id = EXCLUDED.glove_id
        `, listingId, gloveId);
      }

      for (const spec of extractRawSpecs(rawByListing.get(row.listing_pk) || row)) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO listing_specs_raw (listing_id, spec_key, spec_value, source_label)
          VALUES ($1::uuid, $2, $3, $4)
          ON CONFLICT (listing_id, spec_key) DO UPDATE SET
            spec_value = EXCLUDED.spec_value,
            source_label = EXCLUDED.source_label
        `, listingId, spec.spec_key, spec.spec_value, spec.source_label);
      }

      const manifest = manifestByListing.get(row.listing_pk);
      const selectedImages = selectImagesForIngest(manifest);
      const materializedImages = [];
      for (const image of selectedImages) {
        const cacheKey = `${row.source_listing_id}:${image.image_index}:${image.source_url || ""}`;
        if (!uploadedImageCache.has(cacheKey)) {
          try {
            uploadedImageCache.set(cacheKey, await materializeImageToBackblaze(image, row));
          } catch (error) {
            uploadedImageCache.set(cacheKey, {
              sourceUrl: image.source_url || null,
              b2Bucket: process.env.B2_BUCKET_NAME || null,
              b2Key: String(image.target_storage_key || "").trim() || null,
              contentType: image.content_type || null,
              bytes: null,
              sha256: null,
              fetchStatus: "FAILED",
              fetchedAt: null,
              uploadedAt: null,
              metadata: {
                target_storage_key: image.target_storage_key || null,
                mapping_key: image.mapping_key || null,
              },
              lastError: String(error?.message || error),
            });
          }
        }
        materializedImages.push({
          image,
          materialized: uploadedImageCache.get(cacheKey),
        });
      }
      await prisma.$executeRawUnsafe(`DELETE FROM images WHERE listing_id = $1::uuid`, listingId);
      if (materializedImages.length) {
        for (const { image, materialized } of materializedImages) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO images (listing_id, glove_id, role, source_url, b2_bucket, b2_key)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `, listingId, gloveId, inferRole(image.image_index, image.source_url), materialized.sourceUrl || null, materialized.b2Bucket, materialized.b2Key);
        }
      }

      const rawRow = rawByListing.get(row.listing_pk);
      await prisma.$executeRawUnsafe(`
        INSERT INTO raw_listing_payloads (
          ingest_run_id,
          source_id,
          external_listing_id,
          discovered_at,
          fetched_at,
          first_seen_at,
          last_seen_at,
          state,
          dedupe_key,
          payload_sha256,
          listing_url,
          title,
          condition,
          price_amount,
          price_currency,
          available,
          payload,
          normalization,
          canonical_listing_id,
          canonical_glove_id
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3,
          now(),
          now(),
          COALESCE($4::timestamptz, now()),
          COALESCE($5::timestamptz, now()),
          'LINKED',
          $6,
          md5($7)::text,
          $8,
          $9,
          $10,
          $11,
          $12,
          true,
          $13::jsonb,
          $14::jsonb,
          $15::uuid,
          $16::uuid
        )
        ON CONFLICT (source_id, external_listing_id) DO UPDATE SET
          last_seen_at = EXCLUDED.last_seen_at,
          state = EXCLUDED.state,
          listing_url = EXCLUDED.listing_url,
          title = EXCLUDED.title,
          condition = EXCLUDED.condition,
          price_amount = EXCLUDED.price_amount,
          price_currency = EXCLUDED.price_currency,
          payload = EXCLUDED.payload,
          normalization = EXCLUDED.normalization,
          canonical_listing_id = EXCLUDED.canonical_listing_id,
          canonical_glove_id = EXCLUDED.canonical_glove_id,
          updated_at = now()
      `, ingestRunId, sourceId, row.source_listing_id, row.created_at || null, row.seen_at || null, row.listing_pk, JSON.stringify(rawRow || row), row.url || null, row.title || null, row.condition || null, row.price ?? null, row.currency || null, JSON.stringify(rawRow || row), JSON.stringify({
        canonical_name: row.canonical_name || row.title || null,
        record_type: row.record_type || "artifact",
        model_code: row.model_code || null,
        normalized_confidence: row.normalized_confidence || {},
      }), listingId, gloveId);

      const rawPayloadRows = await prisma.$queryRawUnsafe(`
        SELECT id::text AS id
        FROM raw_listing_payloads
        WHERE source_id = $1::uuid AND external_listing_id = $2
        LIMIT 1
      `, sourceId, row.source_listing_id);
      const rawPayloadId = rawPayloadRows[0]?.id;
      if (rawPayloadId) {
        await prisma.$executeRawUnsafe(`DELETE FROM raw_listing_images WHERE raw_listing_id = $1::uuid`, rawPayloadId);
      }
      if (rawPayloadId && materializedImages.length) {
        for (const { image, materialized } of materializedImages) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO raw_listing_images (
              raw_listing_id,
              ordinal,
              source_url,
              source_storage_key,
              content_type,
              bytes,
              fetch_status,
              sha256,
              b2_bucket,
              b2_key,
              fetched_at,
              uploaded_at,
              last_error,
              metadata
            )
            VALUES (
              $1::uuid,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7::image_fetch_status,
              $8,
              $9,
              $10,
              $11::timestamptz,
              $12::timestamptz,
              $13,
              $14::jsonb
            )
            ON CONFLICT (raw_listing_id, ordinal) DO UPDATE SET
              source_url = EXCLUDED.source_url,
              source_storage_key = EXCLUDED.source_storage_key,
              content_type = EXCLUDED.content_type,
              bytes = EXCLUDED.bytes,
              fetch_status = EXCLUDED.fetch_status,
              sha256 = EXCLUDED.sha256,
              b2_bucket = EXCLUDED.b2_bucket,
              b2_key = EXCLUDED.b2_key,
              metadata = EXCLUDED.metadata,
              fetched_at = EXCLUDED.fetched_at,
              uploaded_at = EXCLUDED.uploaded_at,
              last_error = EXCLUDED.last_error,
              updated_at = now()
          `, rawPayloadId, image.image_index, materialized.sourceUrl || null, image.mapping_key || null, materialized.contentType || null, materialized.bytes, materialized.fetchStatus, materialized.sha256, materialized.b2Bucket, materialized.b2Key, materialized.fetchedAt, materialized.uploadedAt, materialized.lastError || null, JSON.stringify(materialized.metadata || {}));

          if (materialized.lastError) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ingest_errors (
                ingest_run_id, source_id, raw_listing_id, phase, severity, code, message, details
              )
              VALUES (
                $1::uuid, $2::uuid, $3::uuid, 'image_upload', 'warning', 'IMAGE_UPLOAD_FAILED', $4, $5::jsonb
              )
            `, ingestRunId, sourceId, rawPayloadId, materialized.lastError, JSON.stringify({
              source_url: materialized.sourceUrl || null,
              b2_key: materialized.b2Key || null,
            }));
          }
        }
      }
    }

    await prisma.$executeRawUnsafe(`
      UPDATE ingest_runs
      SET status = 'SUCCEEDED', completed_at = now(), metrics = jsonb_build_object('normalized_rows', $2::int, 'raw_rows', $3::int, 'manifest_rows', $4::int)
      WHERE id = $1::uuid
    `, ingestRunId, normalizedRows.length, rawRows.length, manifestRows.length);

    console.log(`Imported ${normalizedRows.length} normalized listings into the database.`);
  } catch (error) {
    await prisma.$executeRawUnsafe(`
      UPDATE ingest_runs
      SET status = 'FAILED', completed_at = now(), error_summary = $2
      WHERE id = $1::uuid
    `, ingestRunId, String(error?.message || error));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
