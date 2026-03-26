-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "cover_image_url" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "completion_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "generation_meta" JSONB,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_steps" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_options" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "image_url" TEXT,
    "order" INTEGER NOT NULL,
    "weight_map" JSONB NOT NULL,

    CONSTRAINT "step_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_results" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "result_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "result_image_url" TEXT,
    "og_image_url" TEXT,
    "share_text" TEXT NOT NULL,

    CONSTRAINT "survey_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surveys_slug_key" ON "surveys"("slug");

-- CreateIndex
CREATE INDEX "survey_steps_survey_id_idx" ON "survey_steps"("survey_id");

-- CreateIndex
CREATE INDEX "step_options_step_id_idx" ON "step_options"("step_id");

-- CreateIndex
CREATE INDEX "survey_results_survey_id_idx" ON "survey_results"("survey_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_results_survey_id_result_key_key" ON "survey_results"("survey_id", "result_key");

-- AddForeignKey
ALTER TABLE "survey_steps" ADD CONSTRAINT "survey_steps_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_options" ADD CONSTRAINT "step_options_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "survey_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_results" ADD CONSTRAINT "survey_results_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
