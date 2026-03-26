import { prisma } from "@/lib/db";

/**
 * 추천 설문 조회
 * - 인기도 점수: completionCount * 2 + shareCount * 3 + viewCount * 0.1
 * - 현재 설문 제외
 * - PUBLISHED 상태만
 */
export async function getRecommendedSurveys(
  currentSurveyId: string,
  limit: number = 4
) {
  const surveys = await prisma.survey.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: currentSurveyId },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnailUrl: true,
      completionCount: true,
      shareCount: true,
      viewCount: true,
    },
  });

  // 인기도 점수 계산 후 정렬
  const scored = surveys.map((s) => ({
    ...s,
    score: s.completionCount * 2 + s.shareCount * 3 + s.viewCount * 0.1,
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
