import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/surveys/[slug] — 설문 상세 (스텝/선택지/결과 포함)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const survey = await prisma.survey.findUnique({
      where: { slug },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
            },
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

    // 조회수 증가 (비동기, 응답 지연 없이)
    prisma.survey.update({
      where: { id: survey.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json(survey);
  } catch (error) {
    console.error("설문 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "설문을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
