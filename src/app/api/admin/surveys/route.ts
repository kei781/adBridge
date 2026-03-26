import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { surveyCreateSchema } from "@/types";
import { SurveyStatus } from "@/generated/prisma";

// GET /api/admin/surveys — 설문 목록 조회 (페이지네이션, 상태 필터, 검색)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status") as SurveyStatus | null;
    const search = searchParams.get("search");

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    if (status && Object.values(SurveyStatus).includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    // 총 개수와 목록을 병렬 조회
    const [total, surveys] = await Promise.all([
      prisma.survey.count({ where }),
      prisma.survey.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { steps: true, results: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: surveys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("설문 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "설문 목록을 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/admin/surveys — 설문 생성 (중첩 스텝/선택지/결과 포함)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Zod 유효성 검증
    const parsed = surveyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, slug, description, thumbnailUrl, coverImageUrl, steps, results } = parsed.data;

    // slug 중복 확인
    const existing = await prisma.survey.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 slug입니다" },
        { status: 409 }
      );
    }

    // 트랜잭션으로 설문 + 스텝 + 선택지 + 결과 일괄 생성
    const survey = await prisma.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          title,
          slug,
          description,
          thumbnailUrl: thumbnailUrl ?? null,
          coverImageUrl: coverImageUrl ?? null,
          // PUBLISHED 상태로 생성 시 published_at 자동 설정
          publishedAt: body.status === "PUBLISHED" ? new Date() : null,
          status: body.status ?? "DRAFT",
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

      return created;
    });

    return NextResponse.json({ data: survey }, { status: 201 });
  } catch (error) {
    console.error("설문 생성 실패:", error);
    return NextResponse.json(
      { error: "설문을 생성하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
