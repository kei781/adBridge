import type { SurveyStep, StepOption, SurveyResult } from "@/generated/prisma";

type StepWithOptions = SurveyStep & {
  options: StepOption[];
};

/**
 * 설문 완료 시 가중치 기반 결과 계산
 * - 모든 선택의 weight_map 값을 합산
 * - 최고 점수의 result_key 반환
 * - 동점 시 결과 목록에서 먼저 정의된 결과 우선
 */
export function calculateResult(
  steps: StepWithOptions[],
  results: SurveyResult[],
  answers: Record<string, string> // { stepId: optionId }
): SurveyResult | null {
  const scores: Record<string, number> = {};

  // 1. 모든 선택에서 가중치 합산
  for (const [stepId, optionId] of Object.entries(answers)) {
    const step = steps.find((s) => s.id === stepId);
    if (!step) continue;

    const option = step.options.find((o) => o.id === optionId);
    if (!option?.weightMap) continue;

    const weightMap = option.weightMap as Record<string, number>;
    for (const [resultKey, weight] of Object.entries(weightMap)) {
      scores[resultKey] = (scores[resultKey] || 0) + weight;
    }
  }

  if (Object.keys(scores).length === 0) return null;

  // 2. 최고 점수 결과 반환 (동점 시 먼저 정의된 결과 우선)
  const topResultKey = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0][0];

  return results.find((r) => r.resultKey === topResultKey) ?? null;
}
