import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/surveys/[slug]/share — 공유 카운트 증가
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const survey = await prisma.survey.update({
      where: { slug },
      data: { shareCount: { increment: 1 } },
      select: { shareCount: true },
    });

    return NextResponse.json({ shareCount: survey.shareCount });
  } catch (error) {
    console.error("공유 카운트 증가 실패:", error);
    return NextResponse.json(
      { error: "공유 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
