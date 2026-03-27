import { PrismaClient } from "@prisma/client";
import { recomputeGloveMarketSummaries } from "../src/lib/gloveMarketSummary.js";

const prisma = new PrismaClient();

async function main() {
  const gloveIds = String(process.env.GLOVE_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const result = await recomputeGloveMarketSummaries(prisma, gloveIds.length ? gloveIds : undefined);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
