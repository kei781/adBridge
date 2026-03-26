-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PAGE_VIEW', 'SURVEY_START', 'STEP_COMPLETE', 'SURVEY_COMPLETE', 'SHARE', 'AD_CLICK');

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "survey_id" TEXT,
    "step_index" INTEGER,
    "result_key" TEXT,
    "referrer" TEXT,
    "user_agent" TEXT,
    "fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_survey_id_idx" ON "analytics_events"("survey_id");

-- CreateIndex
CREATE INDEX "analytics_events_type_idx" ON "analytics_events"("type");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");
