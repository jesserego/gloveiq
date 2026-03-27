import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
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

function extensionFromMimeOrUrl(contentType, sourceUrl) {
  const mime = String(contentType || "").toLowerCase();
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("svg")) return ".svg";
  const cleanUrl = String(sourceUrl || "").split("?")[0].split("#")[0];
  return path.extname(cleanUrl).toLowerCase() || ".jpg";
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
}

async function main() {
  if (!hasBackblazeConfig()) {
    throw new Error("Backblaze config is incomplete. Set B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, and B2_BUCKET_NAME.");
  }

  const limit = Math.max(1, Number(process.env.LIBRARY_IMAGE_RETRY_LIMIT || 100));
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        rli.id::text AS id,
        rli.ordinal,
        rli.source_url,
        rli.source_storage_key,
        rli.content_type,
        rlp.id::text AS raw_listing_id,
        rlp.external_listing_id,
        src.name AS source_name,
        l.id::text AS listing_id,
        lgl.glove_id::text AS glove_id
      FROM raw_listing_images rli
      JOIN raw_listing_payloads rlp ON rlp.id = rli.raw_listing_id
      JOIN sources src ON src.id = rlp.source_id
      LEFT JOIN listings l ON l.source_id = rlp.source_id AND l.external_listing_id = rlp.external_listing_id
      LEFT JOIN listing_glove_links lgl ON lgl.listing_id = l.id
      WHERE rli.fetch_status IN ('FAILED', 'PENDING')
        AND rli.source_url IS NOT NULL
      ORDER BY rli.updated_at ASC
      LIMIT $1
    `, limit);

    let uploaded = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const fetchRsp = await fetch(String(row.source_url), {
          headers: {
            "User-Agent": "GloveIQLibraryRetry/1.0",
            Accept: "image/*,*/*;q=0.8",
          },
        });
        if (!fetchRsp.ok) {
          throw new Error(`Image fetch failed (${fetchRsp.status})`);
        }

        const body = Buffer.from(await fetchRsp.arrayBuffer());
        const contentType = fetchRsp.headers.get("content-type") || row.content_type || "application/octet-stream";
        const sha256 = crypto.createHash("sha256").update(body).digest("hex");
        const key = String(row.source_storage_key || "").trim()
          || `library/${String(row.source_name || "source").toLowerCase()}/${String(row.external_listing_id || row.raw_listing_id)}/${row.ordinal}${extensionFromMimeOrUrl(contentType, row.source_url)}`;

        await uploadToBackblaze({ key, body, contentType });

        let canonicalImageId = null;
        if (row.listing_id && row.glove_id) {
          const imageRows = await prisma.$queryRawUnsafe(`
            INSERT INTO images (listing_id, glove_id, role, source_url, b2_bucket, b2_key, sha256)
            VALUES ($1::uuid, $2::uuid, 'OTHER', $3, $4, $5, $6)
            ON CONFLICT (sha256) DO UPDATE SET
              b2_bucket = EXCLUDED.b2_bucket,
              b2_key = EXCLUDED.b2_key,
              source_url = EXCLUDED.source_url
            RETURNING id::text AS id
          `, row.listing_id, row.glove_id, row.source_url, process.env.B2_BUCKET_NAME, key, sha256);
          canonicalImageId = imageRows[0]?.id || null;
        }

        await prisma.$executeRawUnsafe(`
          UPDATE raw_listing_images
          SET
            content_type = $2,
            bytes = $3,
            fetch_status = 'UPLOADED',
            sha256 = $4,
            b2_bucket = $5,
            b2_key = $6,
            canonical_image_id = COALESCE($7::uuid, canonical_image_id),
            fetched_at = now(),
            uploaded_at = now(),
            last_error = NULL,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('retried_via', 'retry_failed_library_images')
          WHERE id = $1::uuid
        `, row.id, contentType, body.byteLength, sha256, process.env.B2_BUCKET_NAME, key, canonicalImageId);
        uploaded += 1;
      } catch (error) {
        failed += 1;
        await prisma.$executeRawUnsafe(`
          UPDATE raw_listing_images
          SET fetch_status = 'FAILED', last_error = $2, updated_at = now()
          WHERE id = $1::uuid
        `, row.id, String(error?.message || error));
      }
    }

    console.log(JSON.stringify({ attempted: rows.length, uploaded, failed }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
