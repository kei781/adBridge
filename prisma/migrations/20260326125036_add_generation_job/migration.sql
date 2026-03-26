-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'SCRAPING', 'ANALYZING', 'GENERATING', 'REVIEW_READY', 'FAILED');

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "logs" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "generated_survey_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);
