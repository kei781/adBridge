import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runGenerationJob } from "@/lib/job-runner";
import { z } from "zod";

// 요청 바디 스키마
const startSchema = z.object({
  url: z.string().url("유효한 URL을 입력해주세요"),
});

// GET /api/admin/generator/start — 전체 작업 목록 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const jobs = await prisma.generationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: jobs });
  } catch (error) {
    console.error("작업 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "작업 목록을 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/admin/generator/start — 콘텐츠 생성 작업 시작
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 요청 바디 파싱 및 검증
    const body = await request.json();
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    // GenerationJob 생성 (QUEUED 상태)
    const job = await prisma.generationJob.create({
      data: {
        targetUrl: url,
        status: "QUEUED",
        logs: [],
        generatedSurveyIds: [],
      },
    });

    // 백그라운드에서 파이프라인 실행 (await하지 않음)
    runGenerationJob(job.id).catch((error) => {
      console.error(`[API] 백그라운드 작업 ${job.id} 에러:`, error);
    });

    return NextResponse.json({ data: job }, { status: 201 });
  } catch (error) {
    console.error("콘텐츠 생성 작업 시작 실패:", error);
    return NextResponse.json(
      { error: "콘텐츠 생성 작업을 시작하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
