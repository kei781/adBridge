import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// 어드민 대시보드 (서버 컴포넌트)
export default async function AdminDashboardPage() {
  // 총 설문 수
  const totalSurveys = await prisma.survey.count();

  // 발행된 설문 수
  const publishedSurveys = await prisma.survey.count({
    where: { status: 'PUBLISHED' },
  });

  // 총 조회수
  const viewsResult = await prisma.survey.aggregate({
    _sum: { viewCount: true },
  });
  const totalViews = viewsResult._sum.viewCount ?? 0;

  // 총 완료수
  const completionsResult = await prisma.survey.aggregate({
    _sum: { completionCount: true },
  });
  const totalCompletions = completionsResult._sum.completionCount ?? 0;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">대시보드</h1>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="전체 설문"
          value={totalSurveys}
          color="text-foreground"
        />
        <StatCard
          label="발행됨"
          value={publishedSurveys}
          color="text-success"
        />
        <StatCard
          label="총 조회수"
          value={totalViews}
          color="text-primary"
        />
        <StatCard
          label="총 완료수"
          value={totalCompletions}
          color="text-warning"
        />
      </div>
    </div>
  );
}
