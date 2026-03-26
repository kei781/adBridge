import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { completeRequestSchema } from "@/types";
import { calculateResult } from "@/lib/result-calculator";

// POST /api/surveys/[slug]/complete — 결과 계산 + completion_count 증가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // 입력 검증
    const parsed = completeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { answers } = parsed.data;

    // 설문 조회 (스텝/선택지/결과 포함)
    const survey = await prisma.survey.findUnique({
      where: { slug },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: {
            options: { orderBy: { order: "asc" } },
          },
        },
        results: true,
      },
    });

    if (!survey || survey.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 결과 계산
    const result = calculateResult(survey.steps, survey.results, answers);
    if (!result) {
      return NextResponse.json(
        { error: "결과를 계산할 수 없습니다." },
        { status: 400 }
      );
    }

    // 완료 수 증가 (비동기)
    prisma.survey.update({
      where: { id: survey.id },
      data: { completionCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({
      resultKey: result.resultKey,
      title: result.title,
      description: result.description,
      resultImageUrl: result.resultImageUrl,
      shareText: result.shareText,
    });
  } catch (error) {
    console.error("설문 완료 처리 실패:", error);
    return NextResponse.json(
      { error: "결과 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
