import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(apiRoot, "prisma", "schema.prisma");
const sqlDir = path.join(apiRoot, "db", "migrations");

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

loadEnvFile(path.join(apiRoot, ".env"));
loadEnvFile(path.join(path.resolve(apiRoot, "..", ".."), ".env"));

const migrationFiles = fs.readdirSync(sqlDir)
  .filter((fileName) => /^\d+_.+\.sql$/i.test(fileName))
  .sort((a, b) => a.localeCompare(b));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to apply SQL migrations.");
  process.exit(1);
}

for (const fileName of migrationFiles) {
  const fullPath = path.join(sqlDir, fileName);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing migration file: ${fullPath}`);
    process.exit(1);
  }

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "execute", "--schema", schemaPath, "--file", fullPath],
    {
      cwd: apiRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Applied raw SQL migrations.");
