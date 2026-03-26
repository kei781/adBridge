import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/ads/[id]/click — 광고 클릭 수 증가
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const ad = await prisma.advertisement.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
      select: { redirectUrl: true },
    });

    return NextResponse.json({ redirectUrl: ad.redirectUrl });
  } catch (error) {
    console.error("광고 클릭 처리 실패:", error);
    return NextResponse.json(
      { error: "광고 클릭을 처리하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
