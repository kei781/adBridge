import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EventType } from "@/generated/prisma";

// 기간별 시작일 계산
function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "7d":
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// GET /api/admin/analytics — 집계된 분석 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const surveyId = searchParams.get("surveyId") || undefined;
    const period = searchParams.get("period") || "7d";
    const startDate = getStartDate(period);

    // 공통 필터 조건
    const baseWhere = {
      createdAt: { gte: startDate },
      ...(surveyId ? { surveyId } : {}),
    };

    // 1. 퍼널 데이터: 이벤트 타입별 카운트
    const funnelCounts = await prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: baseWhere,
      _count: { id: true },
    });

    const funnelMap = new Map(
      funnelCounts.map((item) => [item.type, item._count.id])
    );

    const funnel = {
      pageViews: funnelMap.get(EventType.PAGE_VIEW) ?? 0,
      surveyStarts: funnelMap.get(EventType.SURVEY_START) ?? 0,
      completions: funnelMap.get(EventType.SURVEY_COMPLETE) ?? 0,
      shares: funnelMap.get(EventType.SHARE) ?? 0,
    };

    // 2. 단계별 이탈: STEP_COMPLETE 이벤트의 stepIndex별 카운트
    const stepCounts = await prisma.analyticsEvent.groupBy({
      by: ["stepIndex"],
      where: {
        ...baseWhere,
        type: EventType.STEP_COMPLETE,
        stepIndex: { not: null },
      },
      _count: { id: true },
      orderBy: { stepIndex: "asc" },
    });

    const dropoff = stepCounts.map((item) => ({
      step: item.stepIndex ?? 0,
      count: item._count.id,
    }));

    // 3. 상위 10개 리퍼러
    const referrerCounts = await prisma.analyticsEvent.groupBy({
      by: ["referrer"],
      where: {
        ...baseWhere,
        referrer: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const referrers = referrerCounts.map((item) => ({
      referrer: item.referrer ?? "(알 수 없음)",
      count: item._count.id,
    }));

    // 4. 광고 통계: Advertisement 모델에서 슬롯별 집계
    const adStats = await prisma.advertisement.groupBy({
      by: ["slot"],
      _sum: {
        impressionCount: true,
        clickCount: true,
      },
    });

    const adStatsFormatted = adStats.map((item) => {
      const impressions = item._sum.impressionCount ?? 0;
      const clicks = item._sum.clickCount ?? 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      return {
        slot: item.slot,
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
      };
    });

    // 5. 일별 트렌드: 기간 내 날짜별 조회수/완료수
    const dailyEvents = await prisma.analyticsEvent.findMany({
      where: {
        ...baseWhere,
        type: { in: [EventType.PAGE_VIEW, EventType.SURVEY_COMPLETE] },
      },
      select: {
        type: true,
        createdAt: true,
      },
    });

    // 날짜별 집계
    const dailyMap = new Map<string, { views: number; completions: number }>();

    // 기간 내 모든 날짜 초기화
    const now = new Date();
    const dayCount =
      period === "today"
        ? 1
        : period === "30d"
          ? 30
          : 7;

    for (let i = 0; i < dayCount; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatDate(d);
      dailyMap.set(key, { views: 0, completions: 0 });
    }

    // 이벤트 집계
    for (const event of dailyEvents) {
      const key = formatDate(event.createdAt);
      const entry = dailyMap.get(key);
      if (entry) {
        if (event.type === EventType.PAGE_VIEW) {
          entry.views++;
        } else {
          entry.completions++;
        }
      }
    }

    // 날짜 오름차순 정렬
    const dailyTrend = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        views: data.views,
        completions: data.completions,
      }));

    return NextResponse.json({
      funnel,
      dropoff,
      referrers,
      adStats: adStatsFormatted,
      dailyTrend,
    });
  } catch (error) {
    console.error("분석 데이터 조회 실패:", error);
    return NextResponse.json(
      { error: "분석 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
