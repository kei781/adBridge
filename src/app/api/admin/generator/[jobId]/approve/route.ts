import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

type RouteContext = { params: Promise<{ jobId: string }> };

// 승인/거절 요청 스키마
const approveSchema = z.object({
  surveyIds: z.array(z.string().uuid()).min(1, "최소 1개의 설문을 선택해주세요"),
  action: z.enum(["approve", "reject"]),
});

// POST /api/admin/generator/[jobId]/approve — 생성된 설문 승인 또는 거절
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { jobId } = await context.params;

    // 작업 존재 확인
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (job.status !== "REVIEW_READY") {
      return NextResponse.json(
        { error: "검토 가능한 상태가 아닙니다. 현재 상태: " + job.status },
        { status: 400 }
      );
    }

    // 요청 바디 검증
    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { surveyIds, action } = parsed.data;

    // 선택된 설문들이 해당 작업에서 생성된 것인지 확인
    const validIds = surveyIds.filter((id) =>
      job.generatedSurveyIds.includes(id)
    );

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "해당 작업에서 생성된 유효한 설문이 없습니다" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // 승인: PUBLISHED 상태로 변경 + publishedAt 설정
      await prisma.survey.updateMany({
        where: { id: { in: validIds } },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    } else {
      // 거절: ARCHIVED 상태로 변경
      await prisma.survey.updateMany({
        where: { id: { in: validIds } },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    return NextResponse.json({
      data: {
        action,
        processedCount: validIds.length,
        processedIds: validIds,
      },
    });
  } catch (error) {
    console.error("설문 승인/거절 처리 실패:", error);
    return NextResponse.json(
      { error: "설문 상태를 변경하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
