import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/ads/[id]/impression — 광고 노출 수 증가
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    await prisma.advertisement.update({
      where: { id },
      data: { impressionCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("광고 노출 처리 실패:", error);
    return NextResponse.json(
      { error: "광고 노출을 처리하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
