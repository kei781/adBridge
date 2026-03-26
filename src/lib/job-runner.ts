/**
 * 콘텐츠 생성 파이프라인 실행기
 *
 * GenerationJob의 상태를 단계별로 전이시키며 스크래핑→분석→생성 파이프라인을 실행합니다.
 * 각 단계에서 DB 상태 업데이트 + 로그 추가를 수행합니다.
 */

import { prisma } from "@/lib/db";
import { JobStatus } from "@/generated/prisma";
import { scrapeSurvey, type ScrapedData } from "@/lib/scraper";
import { generateSurveys } from "@/lib/survey-generator";

// 로그 엔트리 타입
type LogEntry = {
  step: number;
  title: string;
  status: "completed" | "in_progress" | "failed";
  detail: string;
  timestamp: string;
};

/**
 * 작업의 로그 배열에 새 엔트리를 추가합니다.
 */
async function appendLog(
  jobId: string,
  entry: LogEntry
): Promise<void> {
  // 현재 로그 조회 후 추가
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { logs: true },
  });

  const currentLogs = (job?.logs ?? []) as Record<string, unknown>[];
  const updatedLogs = [...currentLogs, entry as Record<string, unknown>];

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { logs: updatedLogs as unknown as import("@prisma/client/runtime/library").InputJsonValue[] },
  });
}

/**
 * 작업 상태를 업데이트합니다.
 */
async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra?: { errorMessage?: string; generatedSurveyIds?: string[] }
): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status,
      ...(extra?.errorMessage !== undefined && { errorMessage: extra.errorMessage }),
      ...(extra?.generatedSurveyIds !== undefined && { generatedSurveyIds: extra.generatedSurveyIds }),
    },
  });
}

/**
 * 콘텐츠 생성 파이프라인을 실행합니다.
 *
 * 파이프라인 단계:
 *   1. SCRAPING  — 대상 URL 스크래핑
 *   2. ANALYZING — 스크래핑 데이터 분석 및 인사이트 추출
 *   3. GENERATING — 새로운 설문 콘텐츠 생성 + DB 저장
 *   4. REVIEW_READY — 완료, 관리자 검토 대기
 *
 * 에러 발생 시 FAILED 상태로 전환하고 errorMessage를 기록합니다.
 */
export async function runGenerationJob(jobId: string): Promise<void> {
  let stepNumber = 1;

  try {
    // ── Step 1: 스크래핑 ──
    await updateJobStatus(jobId, JobStatus.SCRAPING);
    await appendLog(jobId, {
      step: stepNumber,
      title: "스크래핑",
      status: "in_progress",
      detail: "대상 URL에서 설문 데이터를 수집하고 있습니다...",
      timestamp: new Date().toISOString(),
    });

    // 대상 URL 조회
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { targetUrl: true },
    });

    if (!job) {
      throw new Error("작업을 찾을 수 없습니다");
    }

    // 스크래핑 실행
    const scrapedData: ScrapedData = await scrapeSurvey(job.targetUrl);

    await appendLog(jobId, {
      step: stepNumber,
      title: "스크래핑",
      status: "completed",
      detail: `스크래핑 완료: "${scrapedData.title}" — ${scrapedData.steps.length}개 질문, ${scrapedData.results.length}개 결과 추출`,
      timestamp: new Date().toISOString(),
    });
    stepNumber++;

    // ── Step 2: 분석 ──
    await updateJobStatus(jobId, JobStatus.ANALYZING);
    await appendLog(jobId, {
      step: stepNumber,
      title: "분석",
      status: "in_progress",
      detail: "스크래핑 데이터를 분석하여 인사이트를 추출하고 있습니다...",
      timestamp: new Date().toISOString(),
    });

    // 분석 시뮬레이션 (1초 딜레이)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 분석 결과를 로그에 기록
    const analysisDetail = [
      `타겟 오디언스: ${scrapedData.metadata.targetAudience}`,
      `바이럴 포인트: ${scrapedData.metadata.viralPoints.join(", ")}`,
      `개선 방향: ${scrapedData.metadata.improvements.join(", ")}`,
    ].join(" | ");

    await appendLog(jobId, {
      step: stepNumber,
      title: "분석",
      status: "completed",
      detail: `분석 완료 — ${analysisDetail}`,
      timestamp: new Date().toISOString(),
    });
    stepNumber++;

    // ── Step 3: 콘텐츠 생성 ──
    await updateJobStatus(jobId, JobStatus.GENERATING);
    await appendLog(jobId, {
      step: stepNumber,
      title: "콘텐츠 생성",
      status: "in_progress",
      detail: "분석 결과를 기반으로 새로운 설문 콘텐츠를 생성하고 있습니다...",
      timestamp: new Date().toISOString(),
    });

    // 설문 생성
    const generatedSurveys = await generateSurveys(scrapedData);

    // DB에 설문 저장 (PENDING_REVIEW 상태)
    const createdSurveyIds: string[] = [];

    for (const surveyData of generatedSurveys) {
      const created = await prisma.survey.create({
        data: {
          title: surveyData.title,
          slug: surveyData.slug,
          description: surveyData.description,
          status: "PENDING_REVIEW",
          generationMeta: {
            ...surveyData.generationMeta,
            sourceUrl: job.targetUrl,
            jobId,
          },
          steps: {
            create: surveyData.steps.map((step) => ({
              questionText: step.questionText,
              order: step.order,
              options: {
                create: step.options.map((opt) => ({
                  label: opt.label,
                  order: opt.order,
                  weightMap: opt.weightMap,
                })),
              },
            })),
          },
          results: {
            create: surveyData.results.map((result) => ({
              resultKey: result.resultKey,
              title: result.title,
              description: result.description,
              shareText: result.shareText,
            })),
          },
        },
      });

      createdSurveyIds.push(created.id);
    }

    // 생성된 설문 ID를 작업에 기록
    await updateJobStatus(jobId, JobStatus.GENERATING, {
      generatedSurveyIds: createdSurveyIds,
    });

    await appendLog(jobId, {
      step: stepNumber,
      title: "콘텐츠 생성",
      status: "completed",
      detail: `${createdSurveyIds.length}개 설문 생성 완료 — ${generatedSurveys.map((s) => `"${s.title}"`).join(", ")}`,
      timestamp: new Date().toISOString(),
    });
    stepNumber++;

    // ── Step 4: 완료 ──
    await updateJobStatus(jobId, JobStatus.REVIEW_READY, {
      generatedSurveyIds: createdSurveyIds,
    });
    await appendLog(jobId, {
      step: stepNumber,
      title: "검토 대기",
      status: "completed",
      detail: "모든 단계가 완료되었습니다. 관리자 검토를 기다리고 있습니다.",
      timestamp: new Date().toISOString(),
    });

    console.log(`[파이프라인] 작업 ${jobId} 완료: ${createdSurveyIds.length}개 설문 생성`);
  } catch (error) {
    // 에러 발생 시 FAILED 상태로 전환
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";

    console.error(`[파이프라인] 작업 ${jobId} 실패:`, error);

    try {
      await updateJobStatus(jobId, JobStatus.FAILED, { errorMessage });
      await appendLog(jobId, {
        step: stepNumber,
        title: "오류",
        status: "failed",
        detail: `파이프라인 실패: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      // 로그 기록마저 실패하면 콘솔에만 출력
      console.error(`[파이프라인] 에러 로그 기록 실패:`, logError);
    }
  }
}
