import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateScraperPayload } from "../../src/lib/contracts/scraperContract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "fixtures");

function fixture(name: string) {
  const filePath = path.join(fixturesDir, name);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

test("valid fixtures pass contract validation", () => {
  const value = fixture("scraper_payload.valid.json");
  assert.ok(Array.isArray(value));
  const result = validateScraperPayload(value);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("invalid fixtures fail contract validation", () => {
  const value = fixture("scraper_payload.invalid.json");
  assert.ok(Array.isArray(value));
  const result = validateScraperPayload(value);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});
