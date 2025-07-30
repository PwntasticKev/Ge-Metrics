/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE CHAR,
ALTER COLUMN "status" SET DATA TYPE CHAR,
ALTER COLUMN "payment_method" SET DATA TYPE CHAR,
ALTER COLUMN "auto_renewal" SET DATA TYPE CHAR;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "notes" SET DATA TYPE CHAR;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "access" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approved_at" TIMESTAMP(6),
ADD COLUMN     "approved_by" INTEGER,
ADD COLUMN     "backup_codes" TEXT,
ADD COLUMN     "mailchimp_api_key" VARCHAR(255),
ADD COLUMN     "master_password_hash" VARCHAR(255),
ADD COLUMN     "otp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp_secret" VARCHAR(255),
ADD COLUMN     "phone_number" VARCHAR(20),
ADD COLUMN     "role" VARCHAR(20) DEFAULT 'user',
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "password" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "item_price_history" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "high_price" INTEGER,
    "low_price" INTEGER,
    "volume" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "volume_threshold" BIGINT,
    "price_drop_threshold" BIGINT,
    "price_spike_threshold" BIGINT,
    "abnormal_activity" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volume_alerts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "alert_type" VARCHAR(50) NOT NULL,
    "triggered_volume" BIGINT,
    "triggered_price" INTEGER,
    "price_drop_percent" DOUBLE PRECISION,
    "alert_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volume_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_cooldowns" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "alert_type" VARCHAR(50) NOT NULL,
    "cooldown_until" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_cooldowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abnormal_activity_patterns" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "avg_volume_24h" BIGINT,
    "avg_volume_7d" BIGINT,
    "avg_price_change_24h" DOUBLE PRECISION,
    "price_volatility" DOUBLE PRECISION,
    "volume_spike_threshold" BIGINT,
    "last_calculated" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abnormal_activity_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(10) NOT NULL,
    "token_type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_access_logs" (
    "id" SERIAL NOT NULL,
    "admin_user_id" INTEGER NOT NULL,
    "target_user_id" INTEGER NOT NULL,
    "access_reason" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "session_duration" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_price_history_item_id_idx" ON "item_price_history"("item_id");

-- CreateIndex
CREATE INDEX "item_price_history_timestamp_idx" ON "item_price_history"("timestamp");

-- CreateIndex
CREATE INDEX "item_price_history_volume_idx" ON "item_price_history"("volume");

-- CreateIndex
CREATE UNIQUE INDEX "item_price_history_item_id_timestamp_key" ON "item_price_history"("item_id", "timestamp");

-- CreateIndex
CREATE INDEX "watchlist_user_id_idx" ON "watchlist"("user_id");

-- CreateIndex
CREATE INDEX "watchlist_item_id_idx" ON "watchlist"("item_id");

-- CreateIndex
CREATE INDEX "watchlist_is_active_idx" ON "watchlist"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_user_id_item_id_key" ON "watchlist"("user_id", "item_id");

-- CreateIndex
CREATE INDEX "volume_alerts_user_id_idx" ON "volume_alerts"("user_id");

-- CreateIndex
CREATE INDEX "volume_alerts_item_id_idx" ON "volume_alerts"("item_id");

-- CreateIndex
CREATE INDEX "volume_alerts_alert_type_idx" ON "volume_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "volume_alerts_alert_sent_idx" ON "volume_alerts"("alert_sent");

-- CreateIndex
CREATE INDEX "volume_alerts_created_at_idx" ON "volume_alerts"("created_at");

-- CreateIndex
CREATE INDEX "alert_cooldowns_user_id_idx" ON "alert_cooldowns"("user_id");

-- CreateIndex
CREATE INDEX "alert_cooldowns_cooldown_until_idx" ON "alert_cooldowns"("cooldown_until");

-- CreateIndex
CREATE UNIQUE INDEX "alert_cooldowns_user_id_item_id_alert_type_key" ON "alert_cooldowns"("user_id", "item_id", "alert_type");

-- CreateIndex
CREATE INDEX "abnormal_activity_patterns_item_id_idx" ON "abnormal_activity_patterns"("item_id");

-- CreateIndex
CREATE INDEX "abnormal_activity_patterns_last_calculated_idx" ON "abnormal_activity_patterns"("last_calculated");

-- CreateIndex
CREATE UNIQUE INDEX "abnormal_activity_patterns_item_id_key" ON "abnormal_activity_patterns"("item_id");

-- CreateIndex
CREATE INDEX "otp_tokens_user_id_idx" ON "otp_tokens"("user_id");

-- CreateIndex
CREATE INDEX "otp_tokens_token_idx" ON "otp_tokens"("token");

-- CreateIndex
CREATE INDEX "otp_tokens_expires_at_idx" ON "otp_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "master_access_logs_admin_user_id_idx" ON "master_access_logs"("admin_user_id");

-- CreateIndex
CREATE INDEX "master_access_logs_target_user_id_idx" ON "master_access_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "master_access_logs_created_at_idx" ON "master_access_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
