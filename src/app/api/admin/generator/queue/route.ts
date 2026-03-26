import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/admin/generator/queue — 검토 대기(PENDING_REVIEW) 설문 목록 조회
export async function GET() {
  try {
    // 인증 확인
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // PENDING_REVIEW 상태 설문 조회
    const surveys = await prisma.survey.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      include: {
        steps: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        results: true,
        _count: {
          select: { steps: true, results: true },
        },
      },
    });

    // 각 설문에 대해 생성한 작업 정보를 매핑
    // generationMeta에 jobId가 포함되어 있으므로 이를 활용
    const surveysWithJobInfo = await Promise.all(
      surveys.map(async (survey) => {
        // generationMeta에서 jobId 추출
        const meta = survey.generationMeta as Record<string, unknown> | null;
        const jobId = meta?.jobId as string | undefined;

        let job = null;
        if (jobId) {
          job = await prisma.generationJob.findUnique({
            where: { id: jobId },
            select: {
              id: true,
              targetUrl: true,
              status: true,
              createdAt: true,
            },
          });
        }

        return {
          ...survey,
          generationJob: job,
        };
      })
    );

    return NextResponse.json({ data: surveysWithJobInfo });
  } catch (error) {
    console.error("검토 대기 설문 조회 실패:", error);
    return NextResponse.json(
      { error: "설문 목록을 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
