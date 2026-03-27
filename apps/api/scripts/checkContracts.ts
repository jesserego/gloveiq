import fs from "node:fs";
import path from "node:path";
import { validateScraperPayload } from "../src/lib/contracts/scraperContract.js";

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function readJsonl(filePath: string): unknown[] {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function arg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function discoverDefaultFixtureFiles(fixturesDir: string): string[] {
  if (!fs.existsSync(fixturesDir)) return [];
  return fs
    .readdirSync(fixturesDir)
    .filter((name) => (name.endsWith(".json") || name.endsWith(".jsonl")) && name.includes(".valid."))
    .map((name) => path.join(fixturesDir, name));
}

function loadRows(filePath: string): unknown[] {
  if (filePath.endsWith(".jsonl")) return readJsonl(filePath);
  const value = readJson(filePath);
  if (Array.isArray(value)) return value;
  return [value];
}

function main() {
  const explicitInput = arg("--input");
  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const fixturesDir = path.resolve(projectRoot, "tests", "contracts", "fixtures");
  const files = explicitInput ? [path.resolve(process.cwd(), explicitInput)] : discoverDefaultFixtureFiles(fixturesDir);

  if (files.length === 0) {
    console.error("[contracts] No fixture/input files found.");
    process.exit(1);
  }

  let hasError = false;
  for (const filePath of files) {
    const rows = loadRows(filePath);
    const result = validateScraperPayload(rows);
    if (!result.valid) {
      hasError = true;
      console.error(`[contracts] FAIL ${path.relative(process.cwd(), filePath)}`);
      for (const error of result.errors) console.error(`  - ${error}`);
      continue;
    }
    console.log(`[contracts] PASS ${path.relative(process.cwd(), filePath)} (${rows.length} rows)`);
  }

  if (hasError) process.exit(1);
}

main();
