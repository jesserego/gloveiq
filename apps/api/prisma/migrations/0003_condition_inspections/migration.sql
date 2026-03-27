-- Condition inspection schema for owned gloves / collection items.
-- Uses collection_* namespacing to avoid colliding with the catalog/library gloves table.

-- CreateEnum
CREATE TYPE "CollectionGloveType" AS ENUM ('INFIELD', 'OUTFIELD', 'PITCHER', 'CATCHER', 'FIRST_BASE', 'UTILITY');

-- CreateEnum
CREATE TYPE "InspectionInspectorType" AS ENUM ('USER', 'ADMIN', 'AI', 'HYBRID');

-- CreateEnum
CREATE TYPE "InspectionSource" AS ENUM ('MANUAL_FORM', 'IMAGE_MODEL', 'MARKETPLACE_IMPORT');

-- CreateEnum
CREATE TYPE "InspectionFactorName" AS ENUM ('STRUCTURE', 'LEATHER', 'PALM', 'LACES', 'COSMETICS');

-- CreateTable
CREATE TABLE "CollectionGlove" (
    "id" UUID NOT NULL,
    "ownerUserId" VARCHAR(128) NOT NULL,
    "collectionItemId" UUID,
    "brand" VARCHAR(128) NOT NULL,
    "model" VARCHAR(128),
    "gloveType" "CollectionGloveType",
    "handThrow" VARCHAR(8),
    "sizeInches" DECIMAL(4,2),
    "colorway" VARCHAR(128),
    "leatherType" VARCHAR(128),
    "year" INTEGER,
    "serialNumber" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionGlove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GloveInspection" (
    "id" UUID NOT NULL,
    "gloveId" UUID NOT NULL,
    "inspectorType" "InspectionInspectorType" NOT NULL,
    "inspectionSource" "InspectionSource",
    "notes" TEXT,
    "rawScore" DECIMAL(5,2),
    "conditionScore" DECIMAL(3,1),
    "conditionLabel" VARCHAR(64),
    "confidenceScore" DECIMAL(4,2),
    "restorationNeeded" BOOLEAN NOT NULL DEFAULT false,
    "rarityPreservationFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GloveInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionFactorScore" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "factorName" "InspectionFactorName" NOT NULL,
    "factorScore" DECIMAL(4,2) NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL,
    "weightedPoints" DECIMAL(5,2) NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionFactorScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionPhoto" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactorReferenceRule" (
    "id" UUID NOT NULL,
    "factorName" "InspectionFactorName" NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactorReferenceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionGlove_collectionItemId_key" ON "CollectionGlove"("collectionItemId");

-- CreateIndex
CREATE INDEX "CollectionGlove_ownerUserId_updatedAt_idx" ON "CollectionGlove"("ownerUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "CollectionGlove_brand_model_idx" ON "CollectionGlove"("brand", "model");

-- CreateIndex
CREATE INDEX "GloveInspection_gloveId_createdAt_idx" ON "GloveInspection"("gloveId", "createdAt");

-- CreateIndex
CREATE INDEX "GloveInspection_inspectorType_createdAt_idx" ON "GloveInspection"("inspectorType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionFactorScore_inspectionId_factorName_key" ON "InspectionFactorScore"("inspectionId", "factorName");

-- CreateIndex
CREATE INDEX "InspectionFactorScore_factorName_idx" ON "InspectionFactorScore"("factorName");

-- CreateIndex
CREATE INDEX "InspectionPhoto_inspectionId_photoType_idx" ON "InspectionPhoto"("inspectionId", "photoType");

-- CreateIndex
CREATE INDEX "FactorReferenceRule_factorName_isActive_idx" ON "FactorReferenceRule"("factorName", "isActive");

-- AddForeignKey
ALTER TABLE "CollectionGlove" ADD CONSTRAINT "CollectionGlove_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "UserCollectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GloveInspection" ADD CONSTRAINT "GloveInspection_gloveId_fkey" FOREIGN KEY ("gloveId") REFERENCES "CollectionGlove"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionFactorScore" ADD CONSTRAINT "InspectionFactorScore_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "GloveInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionPhoto" ADD CONSTRAINT "InspectionPhoto_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "GloveInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FactorReferenceRule" ("id", "factorName", "weight", "description", "isActive", "createdAt")
VALUES
  (gen_random_uuid(), 'STRUCTURE', 0.30, 'Shape retention and body firmness', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'LEATHER', 0.25, 'Leather health, cracks, dryness, softness', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PALM', 0.20, 'Palm and pocket wear', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'LACES', 0.15, 'Lace integrity and tension', true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'COSMETICS', 0.10, 'Dirt, fading, discoloration, appearance', true, CURRENT_TIMESTAMP);
