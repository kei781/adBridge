import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { surveyCreateSchema } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/surveys/[id] — 단일 설문 상세 조회 (모든 관계 포함)
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        steps: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        results: true,
      },
    });

    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: survey });
  } catch (error) {
    console.error("설문 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "설문을 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/surveys/[id] — 설문 수정 (자식 삭제 후 재생성)
export async function PUT(
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
    const parsed = surveyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 기존 설문 존재 확인
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // slug 중복 확인 (자기 자신 제외)
    const { title, slug, description, thumbnailUrl, coverImageUrl, steps, results } = parsed.data;
    if (slug !== existing.slug) {
      const slugExists = await prisma.survey.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json(
          { error: "이미 사용 중인 slug입니다" },
          { status: 409 }
        );
      }
    }

    // 트랜잭션: 자식 삭제 → 설문 업데이트 + 자식 재생성
    const survey = await prisma.$transaction(async (tx) => {
      // 기존 스텝/선택지/결과 삭제 (Cascade로 options도 자동 삭제)
      await tx.surveyStep.deleteMany({ where: { surveyId: id } });
      await tx.surveyResult.deleteMany({ where: { surveyId: id } });

      // 설문 업데이트 + 자식 재생성
      const updated = await tx.survey.update({
        where: { id },
        data: {
          title,
          slug,
          description,
          thumbnailUrl: thumbnailUrl ?? null,
          coverImageUrl: coverImageUrl ?? null,
          steps: {
            create: steps.map((step) => ({
              questionText: step.questionText,
              questionImageUrl: step.questionImageUrl ?? null,
              order: step.order,
              options: {
                create: step.options.map((option) => ({
                  label: option.label,
                  imageUrl: option.imageUrl ?? null,
                  order: option.order,
                  weightMap: option.weightMap,
                })),
              },
            })),
          },
          results: {
            create: results.map((result) => ({
              resultKey: result.resultKey,
              title: result.title,
              description: result.description,
              resultImageUrl: result.resultImageUrl ?? null,
              ogImageUrl: result.ogImageUrl ?? null,
              shareText: result.shareText,
            })),
          },
        },
        include: {
          steps: { include: { options: true }, orderBy: { order: "asc" } },
          results: true,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: survey });
  } catch (error) {
    console.error("설문 수정 실패:", error);
    return NextResponse.json(
      { error: "설문을 수정하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/surveys/[id] — 설문 삭제 (Cascade로 자식도 삭제)
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // 존재 확인
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.survey.delete({ where: { id } });

    return NextResponse.json({ message: "설문이 삭제되었습니다" });
  } catch (error) {
    console.error("설문 삭제 실패:", error);
    return NextResponse.json(
      { error: "설문을 삭제하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
