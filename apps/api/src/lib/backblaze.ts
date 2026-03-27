import crypto from "node:crypto";
import type { RuntimeConfig } from "./runtimeConfig.js";

type B2AuthResponse = {
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
};

type UploadBackblazeParams = {
  key: string;
  body: Buffer;
  contentType: string;
  sha1Hex?: string;
};

function ensureB2Configured(config: RuntimeConfig) {
  if (!config.backblaze.keyId || !config.backblaze.applicationKey || !config.backblaze.bucketName) {
    throw new Error("Backblaze B2 is not fully configured. Set B2_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME.");
  }
}

export function backblazePublicUrl(config: RuntimeConfig, key: string): string | null {
  const base = config.backblaze.publicBaseUrl;
  if (!base || !key) return null;
  return `${base}/${key.replace(/^\/+/, "")}`;
}

export function signBackblazeKey(config: RuntimeConfig, key: string, sourceUrl: string | null = null): string | null {
  if (!key) return sourceUrl;
  if (!config.backblaze.signingBaseUrl) return backblazePublicUrl(config, key) || sourceUrl;
  if (!config.backblaze.signingSecret) {
    return `${config.backblaze.signingBaseUrl}/media/key/${encodeURIComponent(key)}`;
  }
  const exp = String(Math.floor(Date.now() / 1000) + 15 * 60);
  const sig = crypto.createHmac("sha256", config.backblaze.signingSecret).update(`${key}.${exp}`).digest("hex");
  return `${config.backblaze.signingBaseUrl}/media/key/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
}

export async function authorizeBackblaze(config: RuntimeConfig): Promise<B2AuthResponse> {
  ensureB2Configured(config);
  const basic = Buffer.from(`${config.backblaze.keyId}:${config.backblaze.applicationKey}`).toString("base64");
  const rsp = await fetch(`${config.backblaze.endpoint}/b2api/v2/b2_authorize_account`, {
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });
  if (!rsp.ok) {
    throw new Error(`Backblaze auth failed (${rsp.status})`);
  }
  const json = await rsp.json() as any;
  return {
    apiUrl: String(json.apiUrl || ""),
    authorizationToken: String(json.authorizationToken || ""),
    downloadUrl: String(json.downloadUrl || ""),
  };
}

export async function getBackblazeUploadTarget(config: RuntimeConfig) {
  ensureB2Configured(config);
  const auth = await authorizeBackblaze(config);
  const rsp = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: auth.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bucketId: config.backblaze.bucketId }),
  });
  if (!rsp.ok) {
    throw new Error(`Backblaze upload URL request failed (${rsp.status})`);
  }
  const json = await rsp.json() as any;
  return {
    uploadUrl: String(json.uploadUrl || ""),
    authorizationToken: String(json.authorizationToken || ""),
  };
}

export async function uploadToBackblaze(config: RuntimeConfig, params: UploadBackblazeParams) {
  ensureB2Configured(config);
  const key = params.key.replace(/^\/+/, "");
  if (!key) throw new Error("Backblaze upload requires a destination key.");

  const uploadTarget = await getBackblazeUploadTarget(config);
  const sha1Hex = params.sha1Hex || crypto.createHash("sha1").update(params.body).digest("hex");
  const rsp = await fetch(uploadTarget.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: uploadTarget.authorizationToken,
      "X-Bz-File-Name": encodeURIComponent(key),
      "Content-Type": params.contentType || "b2/x-auto",
      "Content-Length": String(params.body.byteLength),
      "X-Bz-Content-Sha1": sha1Hex,
    },
    body: new Uint8Array(params.body),
  });

  if (!rsp.ok) {
    throw new Error(`Backblaze upload failed (${rsp.status})`);
  }

  const json = await rsp.json() as any;
  return {
    bucketId: String(json.bucketId || config.backblaze.bucketId || ""),
    bucketName: config.backblaze.bucketName,
    key,
    fileId: String(json.fileId || ""),
    contentSha1: String(json.contentSha1 || sha1Hex),
  };
}

export async function downloadFromBackblazeByKey(config: RuntimeConfig, key: string) {
  ensureB2Configured(config);
  const auth = await authorizeBackblaze(config);
  const normalizedKey = key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const rsp = await fetch(`${auth.downloadUrl}/file/${encodeURIComponent(config.backblaze.bucketName)}/${normalizedKey}`, {
    headers: {
      Authorization: auth.authorizationToken,
    },
  });

  if (!rsp.ok) {
    throw new Error(`Backblaze download failed (${rsp.status})`);
  }

  const bytes = Buffer.from(await rsp.arrayBuffer());
  return {
    body: bytes,
    contentType: rsp.headers.get("content-type") || "application/octet-stream",
    contentLength: rsp.headers.get("content-length"),
    etag: rsp.headers.get("etag"),
    cacheControl: rsp.headers.get("cache-control"),
  };
}
