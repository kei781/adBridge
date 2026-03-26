import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ jobId: string }> };

// GET /api/admin/generator/[jobId] — 작업 상태 및 로그 조회
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { jobId } = await context.params;

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("작업 조회 실패:", error);
    return NextResponse.json(
      { error: "작업 정보를 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
