import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { statusUpdateSchema } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/admin/surveys/[id]/status — 설문 상태만 변경
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Zod 유효성 검증
    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 상태값입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 기존 설문 확인
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { status } = parsed.data;

    // published_at 처리: PUBLISHED로 전환 시 설정, PUBLISHED에서 벗어나면 null
    let publishedAt: Date | null | undefined;
    if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      publishedAt = new Date();
    } else if (status !== "PUBLISHED" && existing.status === "PUBLISHED") {
      publishedAt = null;
    }

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        status,
        ...(publishedAt !== undefined && { publishedAt }),
      },
    });

    return NextResponse.json({ data: survey });
  } catch (error) {
    console.error("설문 상태 변경 실패:", error);
    return NextResponse.json(
      { error: "설문 상태를 변경하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
