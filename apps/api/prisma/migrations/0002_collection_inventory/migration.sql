CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "CollectionItemStatus" AS ENUM ('OWNED', 'WANT');
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PREVIEW_READY', 'IMPORTED', 'FAILED');

CREATE TABLE "UserCollectionItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" VARCHAR(128) NOT NULL,
  "variantId" VARCHAR(128) NOT NULL,
  "status" "CollectionItemStatus" NOT NULL DEFAULT 'OWNED',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "condition" VARCHAR(64),
  "normalizedCondition" VARCHAR(64),
  "acquisitionPriceCents" INTEGER,
  "acquisitionDate" DATE,
  "targetPriceCents" INTEGER,
  "notes" TEXT,
  "sku" VARCHAR(128),
  "location" VARCHAR(128),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCollectionItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionImportJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" VARCHAR(128) NOT NULL,
  "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
  "fileName" VARCHAR(255),
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "matchedRows" INTEGER NOT NULL DEFAULT 0,
  "unmatchedRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionImportRow" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL,
  "rawRowJson" JSONB NOT NULL,
  "matchedVariantId" VARCHAR(128),
  "errorsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionImportRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CollectionImportRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CollectionImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserCollectionItem_userId_status_idx" ON "UserCollectionItem"("userId", "status");
CREATE INDEX "UserCollectionItem_variantId_idx" ON "UserCollectionItem"("variantId");
CREATE INDEX "UserCollectionItem_userId_updatedAt_idx" ON "UserCollectionItem"("userId", "updatedAt");
CREATE INDEX "CollectionImportJob_userId_createdAt_idx" ON "CollectionImportJob"("userId", "createdAt");
CREATE INDEX "CollectionImportRow_jobId_idx" ON "CollectionImportRow"("jobId");
CREATE INDEX "CollectionImportRow_matchedVariantId_idx" ON "CollectionImportRow"("matchedVariantId");
