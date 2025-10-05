-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE CHAR,
ALTER COLUMN "status" SET DATA TYPE CHAR,
ALTER COLUMN "payment_method" SET DATA TYPE CHAR,
ALTER COLUMN "auto_renewal" SET DATA TYPE CHAR;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "notes" SET DATA TYPE CHAR;

-- CreateTable
CREATE TABLE "systemSettings" (
    "id" SERIAL NOT NULL,
    "section" VARCHAR(50) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "dataType" VARCHAR(20) NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "systemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "systemSettings_section_idx" ON "systemSettings"("section");

-- CreateIndex
CREATE INDEX "systemSettings_isSecret_idx" ON "systemSettings"("isSecret");

-- CreateIndex
CREATE UNIQUE INDEX "systemSettings_section_key_key" ON "systemSettings"("section", "key");
