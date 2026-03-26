import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

// 트래킹 이벤트 스키마
const trackSchema = z.object({
  type: z.enum(["PAGE_VIEW", "SURVEY_START", "STEP_COMPLETE", "SURVEY_COMPLETE", "SHARE", "AD_CLICK"]),
  surveyId: z.string().optional(),
  stepIndex: z.number().int().optional(),
  resultKey: z.string().optional(),
});

// POST /api/analytics/track — 분석 이벤트 기록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = trackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }

    const { type, surveyId, stepIndex, resultKey } = parsed.data;

    // 요청 정보 추출
    const referrer = request.headers.get("referer") || null;
    const userAgent = request.headers.get("user-agent") || null;
    const fingerprint = request.cookies.get("fp")?.value || null;

    // 비동기로 이벤트 기록 (응답 지연 없이)
    prisma.analyticsEvent.create({
      data: {
        type,
        surveyId: surveyId || null,
        stepIndex: stepIndex ?? null,
        resultKey: resultKey || null,
        referrer,
        userAgent,
        fingerprint,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "트래킹 실패" }, { status: 500 });
  }
}
