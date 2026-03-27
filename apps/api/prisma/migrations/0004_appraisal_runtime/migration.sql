-- Persist appraisal runtime data in Postgres instead of local JSON runtime storage.

-- CreateEnum
CREATE TYPE "AppraisalImageStorage" AS ENUM ('LOCAL', 'B2');

-- CreateTable
CREATE TABLE "AppraisalImage" (
    "id" UUID NOT NULL,
    "imageId" VARCHAR(64) NOT NULL,
    "sha256" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" VARCHAR(128) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storage" "AppraisalImageStorage" NOT NULL DEFAULT 'LOCAL',
    "b2Bucket" VARCHAR(255),
    "b2Key" VARCHAR(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalArtifactImage" (
    "id" UUID NOT NULL,
    "artifactId" VARCHAR(128) NOT NULL,
    "imageId" UUID NOT NULL,
    "role" VARCHAR(64) NOT NULL,
    "usable" BOOLEAN NOT NULL DEFAULT true,
    "bundleHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalArtifactImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalAiRun" (
    "id" UUID NOT NULL,
    "runId" VARCHAR(128) NOT NULL,
    "artifactId" VARCHAR(128) NOT NULL,
    "bundleHash" VARCHAR(128) NOT NULL,
    "stage" VARCHAR(64) NOT NULL,
    "model" VARCHAR(128) NOT NULL,
    "inputHash" VARCHAR(128) NOT NULL,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalAiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalLabelTruth" (
    "id" UUID NOT NULL,
    "artifactId" VARCHAR(128) NOT NULL,
    "source" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalLabelTruth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalValuationRun" (
    "id" UUID NOT NULL,
    "runId" VARCHAR(128) NOT NULL,
    "artifactId" VARCHAR(128) NOT NULL,
    "bundleHash" VARCHAR(128) NOT NULL,
    "mode" VARCHAR(64) NOT NULL,
    "compsUsed" INTEGER NOT NULL DEFAULT 0,
    "output" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalValuationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalCorrection" (
    "id" UUID NOT NULL,
    "correctionId" VARCHAR(128) NOT NULL,
    "artifactId" VARCHAR(128) NOT NULL,
    "note" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalVerificationEvent" (
    "id" UUID NOT NULL,
    "eventId" VARCHAR(128) NOT NULL,
    "artifactId" VARCHAR(128) NOT NULL,
    "from" VARCHAR(64) NOT NULL,
    "to" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalVerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalImage_imageId_key" ON "AppraisalImage"("imageId");
CREATE UNIQUE INDEX "AppraisalImage_sha256_key" ON "AppraisalImage"("sha256");
CREATE INDEX "AppraisalImage_createdAt_idx" ON "AppraisalImage"("createdAt");
CREATE INDEX "AppraisalImage_storage_createdAt_idx" ON "AppraisalImage"("storage", "createdAt");

-- CreateIndex
CREATE INDEX "AppraisalArtifactImage_artifactId_createdAt_idx" ON "AppraisalArtifactImage"("artifactId", "createdAt");
CREATE INDEX "AppraisalArtifactImage_bundleHash_createdAt_idx" ON "AppraisalArtifactImage"("bundleHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalAiRun_runId_key" ON "AppraisalAiRun"("runId");
CREATE INDEX "AppraisalAiRun_artifactId_createdAt_idx" ON "AppraisalAiRun"("artifactId", "createdAt");
CREATE INDEX "AppraisalAiRun_bundleHash_stage_idx" ON "AppraisalAiRun"("bundleHash", "stage");

-- CreateIndex
CREATE INDEX "AppraisalLabelTruth_artifactId_createdAt_idx" ON "AppraisalLabelTruth"("artifactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalValuationRun_runId_key" ON "AppraisalValuationRun"("runId");
CREATE INDEX "AppraisalValuationRun_artifactId_createdAt_idx" ON "AppraisalValuationRun"("artifactId", "createdAt");
CREATE INDEX "AppraisalValuationRun_bundleHash_createdAt_idx" ON "AppraisalValuationRun"("bundleHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalCorrection_correctionId_key" ON "AppraisalCorrection"("correctionId");
CREATE INDEX "AppraisalCorrection_artifactId_createdAt_idx" ON "AppraisalCorrection"("artifactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalVerificationEvent_eventId_key" ON "AppraisalVerificationEvent"("eventId");
CREATE INDEX "AppraisalVerificationEvent_artifactId_createdAt_idx" ON "AppraisalVerificationEvent"("artifactId", "createdAt");

-- AddForeignKey
ALTER TABLE "AppraisalArtifactImage" ADD CONSTRAINT "AppraisalArtifactImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "AppraisalImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
