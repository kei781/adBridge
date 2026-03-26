'use client';

import { useEffect, useState, useCallback } from 'react';

// 분석 데이터 타입 정의
interface FunnelData {
  pageViews: number;
  surveyStarts: number;
  completions: number;
  shares: number;
}

interface DropoffItem {
  step: number;
  count: number;
}

interface ReferrerItem {
  referrer: string;
  count: number;
}

interface AdStatItem {
  slot: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface DailyTrendItem {
  date: string;
  views: number;
  completions: number;
}

interface SurveyOption {
  id: string;
  title: string;
}

interface AnalyticsData {
  funnel: FunnelData;
  dropoff: DropoffItem[];
  referrers: ReferrerItem[];
  adStats: AdStatItem[];
  dailyTrend: DailyTrendItem[];
}

type Period = 'today' | '7d' | '30d';

// 기간 필터 옵션
const periodOptions: { value: Period; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
];

// 퍼널 단계 라벨
const funnelSteps: { key: keyof FunnelData; label: string }[] = [
  { key: 'pageViews', label: '페이지 조회' },
  { key: 'surveyStarts', label: '설문 시작' },
  { key: 'completions', label: '설문 완료' },
  { key: 'shares', label: '공유' },
];

// 광고 슬롯 한글 라벨
const slotLabels: Record<string, string> = {
  SIDEBAR: '사이드바 (A)',
  ANCHOR: '앵커 (B)',
  VIGNETTE: '비넷 (C)',
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [surveyId, setSurveyId] = useState<string>('');
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // 설문 목록 로드
  useEffect(() => {
    fetch('/api/admin/surveys?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.surveys) {
          setSurveys(
            json.surveys.map((s: { id: string; title: string }) => ({
              id: s.id,
              title: s.title,
            }))
          );
        }
      })
      .catch(() => {
        // 설문 목록 로드 실패 — 무시
      });
  }, []);

  // 분석 데이터 로드
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (surveyId) params.set('surveyId', surveyId);

      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (!res.ok) throw new Error('데이터 로드 실패');

      const json: AnalyticsData = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, surveyId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // 퍼널 최대값 (바 너비 비율 계산용)
  const funnelMax = data
    ? Math.max(
        data.funnel.pageViews,
        data.funnel.surveyStarts,
        data.funnel.completions,
        data.funnel.shares,
        1
      )
    : 1;

  // 일별 트렌드 최대값
  const trendMax = data
    ? Math.max(...data.dailyTrend.map((d) => Math.max(d.views, d.completions)), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">분석</h1>
        <p className="text-sm text-muted mt-1">설문 퍼널, 유입 경로, 광고 성과를 확인하세요.</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 기간 필터 */}
        <div className="flex gap-1 bg-white rounded-lg border border-border p-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 설문 선택 */}
        <select
          value={surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">전체 설문</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* 데이터 없음 */}
      {!loading && !data && (
        <div className="text-center py-16 text-muted">
          데이터를 불러올 수 없습니다.
        </div>
      )}

      {/* 분석 결과 */}
      {!loading && data && (
        <div className="space-y-6">
          {/* 퍼널 섹션 */}
          <section className="bg-white rounded-xl border border-border p-4 md:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">전환 퍼널</h2>
            <div className="space-y-3">
              {funnelSteps.map((step, index) => {
                const count = data.funnel[step.key];
                const widthPercent = (count / funnelMax) * 100;

                // 이전 단계 대비 이탈률 계산
                let dropoffRate: number | null = null;
                if (index > 0) {
                  const prevKey = funnelSteps[index - 1].key;
                  const prevCount = data.funnel[prevKey];
                  if (prevCount > 0) {
                    dropoffRate = ((prevCount - count) / prevCount) * 100;
                  }
                }

                return (
                  <div key={step.key}>
                    {/* 이탈률 표시 */}
                    {dropoffRate !== null && (
                      <div className="flex items-center gap-2 mb-1 ml-2">
                        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-xs text-red-400">
                          -{dropoffRate.toFixed(1)}% 이탈
                        </span>
                      </div>
                    )}
                    {/* 바 */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted w-20 shrink-0">{step.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${Math.max(widthPercent, 2)}%` }}
                        >
                          {widthPercent > 15 && (
                            <span className="text-xs font-medium text-white">
                              {count.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {widthPercent <= 15 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                            {count.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 단계별 이탈 */}
          {data.dropoff.length > 0 && (
            <section className="bg-white rounded-xl border border-border p-4 md:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">단계별 완료 수</h2>
              <div className="space-y-2">
                {data.dropoff.map((item) => {
                  const maxStep = Math.max(...data.dropoff.map((d) => d.count), 1);
                  const widthPercent = (item.count / maxStep) * 100;
                  return (
                    <div key={item.step} className="flex items-center gap-3">
                      <span className="text-sm text-muted w-16 shrink-0">
                        {item.step + 1}단계
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(widthPercent, 2)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-16 text-right">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 일별 트렌드 */}
          <section className="bg-white rounded-xl border border-border p-4 md:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">일별 트렌드</h2>
            {data.dailyTrend.length === 0 ? (
              <p className="text-sm text-muted">데이터가 없습니다.</p>
            ) : (
              <>
                {/* 범례 */}
                <div className="flex gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-primary/70" />
                    <span className="text-xs text-muted">조회</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                    <span className="text-xs text-muted">완료</span>
                  </div>
                </div>

                {/* 차트 */}
                <div className="flex items-end gap-1 h-40 overflow-x-auto pb-6 relative">
                  {data.dailyTrend.map((item) => {
                    const viewHeight = (item.views / trendMax) * 100;
                    const compHeight = (item.completions / trendMax) * 100;
                    // MM-DD 형식으로 날짜 표시
                    const dateLabel = item.date.slice(5);

                    return (
                      <div
                        key={item.date}
                        className="flex-1 min-w-[28px] flex flex-col items-center gap-0.5 relative group"
                      >
                        {/* 툴팁 */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap z-10">
                          <div>{item.date}</div>
                          <div>조회: {item.views.toLocaleString()}</div>
                          <div>완료: {item.completions.toLocaleString()}</div>
                        </div>
                        {/* 바 */}
                        <div className="flex gap-0.5 items-end h-32 w-full justify-center">
                          <div
                            className="w-1/3 max-w-3 bg-primary/70 rounded-t transition-all duration-300"
                            style={{ height: `${Math.max(viewHeight, 1)}%` }}
                          />
                          <div
                            className="w-1/3 max-w-3 bg-emerald-400 rounded-t transition-all duration-300"
                            style={{ height: `${Math.max(compHeight, 1)}%` }}
                          />
                        </div>
                        {/* 날짜 라벨 */}
                        <span className="text-[10px] text-muted absolute -bottom-5 whitespace-nowrap">
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* 하단 그리드: 리퍼러 + 광고 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 리퍼러 섹션 */}
            <section className="bg-white rounded-xl border border-border p-4 md:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">유입 경로 (Top 10)</h2>
              {data.referrers.length === 0 ? (
                <p className="text-sm text-muted">리퍼러 데이터가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-1 font-medium text-muted">경로</th>
                        <th className="text-right py-2 px-1 font-medium text-muted w-20">방문수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrers.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 px-1 text-foreground truncate max-w-[200px]">
                            {item.referrer}
                          </td>
                          <td className="py-2 px-1 text-right font-medium text-foreground">
                            {item.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 광고 CTR 섹션 */}
            <section className="bg-white rounded-xl border border-border p-4 md:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">광고 성과</h2>
              {data.adStats.length === 0 ? (
                <p className="text-sm text-muted">광고 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {data.adStats.map((item) => (
                    <div
                      key={item.slot}
                      className="bg-gray-50 rounded-lg p-4 border border-border/50"
                    >
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {slotLabels[item.slot] ?? item.slot}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted">노출수</p>
                          <p className="text-lg font-bold text-foreground">
                            {item.impressions.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">클릭수</p>
                          <p className="text-lg font-bold text-foreground">
                            {item.clicks.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">CTR</p>
                          <p className="text-lg font-bold text-primary">
                            {item.ctr}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
