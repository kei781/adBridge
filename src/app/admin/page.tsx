import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value.toLocaleString('ko-KR')}
      </p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

// 어드민 대시보드 (서버 컴포넌트)
export default async function AdminDashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 전체 통계
  const [totalSurveys, publishedSurveys, pendingReview, stats] = await Promise.all([
    prisma.survey.count(),
    prisma.survey.count({ where: { status: 'PUBLISHED' } }),
    prisma.survey.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.survey.aggregate({
      _sum: { viewCount: true, completionCount: true, shareCount: true },
    }),
  ]);

  // 오늘의 이벤트 수
  const [todayViews, todayCompletions, todayShares] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: 'PAGE_VIEW', createdAt: { gte: today } } }),
    prisma.analyticsEvent.count({ where: { type: 'SURVEY_COMPLETE', createdAt: { gte: today } } }),
    prisma.analyticsEvent.count({ where: { type: 'SHARE', createdAt: { gte: today } } }),
  ]);

  // 인기 설문 TOP 5
  const topSurveys = await prisma.survey.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { completionCount: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      slug: true,
      viewCount: true,
      completionCount: true,
      shareCount: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">대시보드</h1>
        {pendingReview > 0 && (
          <Link
            href="/admin/generator/queue"
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
          >
            검토 대기 <span className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{pendingReview}</span>
          </Link>
        )}
      </div>

      {/* 오늘의 통계 */}
      <h2 className="text-sm font-medium text-muted mb-3">오늘</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="오늘 조회" value={todayViews} color="text-primary" />
        <StatCard label="오늘 완료" value={todayCompletions} color="text-warning" />
        <StatCard label="오늘 공유" value={todayShares} color="text-success" />
      </div>

      {/* 전체 통계 */}
      <h2 className="text-sm font-medium text-muted mb-3">전체</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="전체 설문" value={totalSurveys} color="text-foreground" />
        <StatCard label="발행됨" value={publishedSurveys} color="text-success" />
        <StatCard label="총 조회수" value={stats._sum.viewCount || 0} color="text-primary" />
        <StatCard label="총 완료수" value={stats._sum.completionCount || 0} color="text-warning" />
      </div>

      {/* 인기 설문 TOP 5 */}
      {topSurveys.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted mb-3">인기 설문 TOP 5</h2>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted">#</th>
                  <th className="text-left px-4 py-2 font-medium text-muted">제목</th>
                  <th className="text-right px-4 py-2 font-medium text-muted">조회</th>
                  <th className="text-right px-4 py-2 font-medium text-muted">완료</th>
                  <th className="text-right px-4 py-2 font-medium text-muted">공유</th>
                </tr>
              </thead>
              <tbody>
                {topSurveys.map((s, i) => (
                  <tr key={s.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5 font-bold text-primary">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/surveys/${s.id}`} className="hover:text-primary transition-colors">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">{s.viewCount.toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{s.completionCount.toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{s.shareCount.toLocaleString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
