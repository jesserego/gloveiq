import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { EBAY_GLOBAL_IDS, fetchEbayMarketplaceRows, persistEbayRows, type EbaySyncMode } from "../src/lib/ebay.js";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const brandsSeedPath = path.join(projectRoot, "data", "seed", "brands.json");
const brands = JSON.parse(fs.readFileSync(brandsSeedPath, "utf-8")) as Array<{ brand_key: string; display_name: string }>;

function parseGlobalIds(value: string | undefined) {
  const ids = String(value || "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return ids.length ? ids : ["EBAY-US"];
}

async function main() {
  const query = String(process.env.EBAY_SYNC_QUERY || "baseball glove");
  const perMarket = Math.max(5, Math.min(100, Number(process.env.EBAY_SYNC_PER_MARKET || 50)));
  const pages = Math.max(1, Math.min(10, Number(process.env.EBAY_SYNC_PAGES || 2)));
  const mode = String(process.env.EBAY_SYNC_MODE || "active").toLowerCase() === "sold" ? "sold" : "active";
  const globalIds = parseGlobalIds(process.env.EBAY_SYNC_GLOBAL_IDS);

  const rows = await fetchEbayMarketplaceRows({
    env: process.env,
    brands,
    query,
    perMarket,
    pages,
    globalIds: globalIds.length ? globalIds : EBAY_GLOBAL_IDS,
    mode: mode as EbaySyncMode,
  });

  const persisted = await persistEbayRows({
    prisma,
    env: process.env,
    brands,
    rows,
    query,
    mode: mode as EbaySyncMode,
  });

  console.log(JSON.stringify({
    ok: true,
    query,
    mode,
    marketplaces: globalIds,
    fetched: rows.length,
    persisted: persisted.persisted,
    matched: persisted.matched,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
