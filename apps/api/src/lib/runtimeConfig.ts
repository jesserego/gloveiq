import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(filePath: string) {
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

function splitCsv(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanUrl(value: string | undefined): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

type BackblazeConfig = {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  bucketId: string;
  endpoint: string;
  s3Endpoint: string;
  publicBaseUrl: string;
  signingBaseUrl: string;
  signingSecret: string;
};

type SupabaseConfig = {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl: string;
};

export type RuntimeConfig = {
  port: number;
  publicBaseUrl: string;
  allowedOrigins: string[];
  libraryExportDir: string;
  databaseUrl: string;
  webAppUrl: string;
  supabase: SupabaseConfig;
  backblaze: BackblazeConfig;
};

export function buildRuntimeConfig(params: { projectRoot: string; defaultPort?: number }): RuntimeConfig {
  const defaultPort = params.defaultPort || 8787;
  loadEnvFile(path.resolve(params.projectRoot, "..", "..", ".env"));
  loadEnvFile(path.resolve(params.projectRoot, ".env"));

  const port = Number(process.env.PORT || defaultPort);
  const publicBaseUrl = cleanUrl(process.env.PUBLIC_BASE_URL) || `http://localhost:${port}`;
  const webAppUrl = cleanUrl(process.env.WEB_APP_URL) || "http://localhost:5173";
  const configuredOrigins = splitCsv(process.env.ALLOWED_ORIGINS);
  const allowedOrigins = configuredOrigins.length
    ? configuredOrigins
    : [webAppUrl, "http://localhost:5173", "http://127.0.0.1:5173", "https://dev.gloveiq.info", "https://gloveiq.info"];

  return {
    port,
    publicBaseUrl,
    allowedOrigins,
    libraryExportDir: process.env.LIBRARY_EXPORT_DIR || path.resolve(params.projectRoot, "..", "..", "data_exports"),
    databaseUrl: String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim(),
    webAppUrl,
    supabase: {
      projectUrl: cleanUrl(process.env.SUPABASE_PROJECT_URL) || "https://pdvxcbkdzpnofirdlbix.supabase.co",
      anonKey: String(process.env.SUPABASE_ANON_KEY || "").trim(),
      serviceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
      dbUrl: String(process.env.SUPABASE_DB_URL || "").trim(),
    },
    backblaze: {
      keyId: String(process.env.B2_KEY_ID || "").trim(),
      applicationKey: String(process.env.B2_APPLICATION_KEY || "").trim(),
      bucketName: String(process.env.B2_BUCKET_NAME || "").trim(),
      bucketId: String(process.env.B2_BUCKET_ID || "").trim(),
      endpoint: cleanUrl(process.env.B2_ENDPOINT) || "https://api.backblazeb2.com",
      s3Endpoint: cleanUrl(process.env.B2_S3_ENDPOINT) || "https://s3.us-west-004.backblazeb2.com",
      publicBaseUrl: cleanUrl(process.env.B2_PUBLIC_BASE_URL),
      signingBaseUrl: cleanUrl(process.env.B2_SIGNING_BASE_URL),
      signingSecret: String(process.env.B2_SIGNING_SECRET || "").trim(),
    },
  };
}

export function configReadiness(config: RuntimeConfig) {
  return {
    database: {
      ready: Boolean(config.databaseUrl),
      provider: config.supabase.dbUrl ? "supabase_postgres" : "postgres",
      usingSupabase: Boolean(config.supabase.dbUrl || config.supabase.projectUrl),
    },
    supabase: {
      ready: Boolean(config.supabase.projectUrl && config.supabase.dbUrl),
      hasProjectUrl: Boolean(config.supabase.projectUrl),
      hasAnonKey: Boolean(config.supabase.anonKey),
      hasServiceRoleKey: Boolean(config.supabase.serviceRoleKey),
      hasDbUrl: Boolean(config.supabase.dbUrl),
    },
    backblaze: {
      ready: Boolean(config.backblaze.keyId && config.backblaze.applicationKey && config.backblaze.bucketName),
      hasKeyId: Boolean(config.backblaze.keyId),
      hasApplicationKey: Boolean(config.backblaze.applicationKey),
      hasBucketName: Boolean(config.backblaze.bucketName),
      hasBucketId: Boolean(config.backblaze.bucketId),
      hasS3Endpoint: Boolean(config.backblaze.s3Endpoint),
      hasPublicBaseUrl: Boolean(config.backblaze.publicBaseUrl),
      hasSigningBaseUrl: Boolean(config.backblaze.signingBaseUrl),
      hasSigningSecret: Boolean(config.backblaze.signingSecret),
    },
  };
}
