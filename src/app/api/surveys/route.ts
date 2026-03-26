import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/surveys — 발행된 설문 리스트 (페이지네이션, 정렬)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "12")));
    const sort = searchParams.get("sort") === "popular" ? "popular" : "latest";

    const where = { status: "PUBLISHED" as const };
    const orderBy = sort === "popular"
      ? { viewCount: "desc" as const }
      : { publishedAt: "desc" as const };

    const [surveys, totalCount] = await Promise.all([
      prisma.survey.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnailUrl: true,
          viewCount: true,
          completionCount: true,
          publishedAt: true,
        },
      }),
      prisma.survey.count({ where }),
    ]);

    return NextResponse.json({
      surveys,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("설문 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "설문 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
