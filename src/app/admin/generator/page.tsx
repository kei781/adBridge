'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 작업 상태 배지 색상 매핑
const statusConfig: Record<string, { label: string; className: string }> = {
  QUEUED: { label: '대기중', className: 'bg-gray-100 text-gray-700' },
  SCRAPING: { label: '스크래핑', className: 'bg-blue-100 text-blue-700' },
  ANALYZING: { label: '분석중', className: 'bg-purple-100 text-purple-700' },
  GENERATING: { label: '생성중', className: 'bg-orange-100 text-orange-700' },
  REVIEW_READY: { label: '검토 대기', className: 'bg-green-100 text-green-700' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700' },
};

// 작업 타입
interface GenerationJob {
  id: string;
  targetUrl: string;
  status: string;
  createdAt: string;
  generatedSurveyIds: string[];
  errorMessage: string | null;
}

// 콘텐츠 생성 메인 페이지
export default function AdminGeneratorPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 작업 목록 조회
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/generator/start');
      const json = await res.json();
      if (res.ok) {
        setJobs(json.data ?? []);
      }
    } catch (err) {
      console.error('작업 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // URL 제출 → 새 작업 생성 후 상세 페이지로 이동
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/generator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: url.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '작업 생성에 실패했습니다');
        return;
      }

      // 생성 성공 → 상세 페이지로 이동
      router.push(`/admin/generator/${json.data.id}`);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // URL 텍스트 truncate
  const truncateUrl = (urlStr: string, maxLen = 50) => {
    if (urlStr.length <= maxLen) return urlStr;
    return urlStr.slice(0, maxLen) + '...';
  };

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">콘텐츠 생성</h1>
        <Link
          href="/admin/generator/queue"
          className="inline-flex items-center justify-center px-4 py-2 bg-white text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          📋 검토 대기 목록
        </Link>
      </div>

      {/* URL 입력 폼 */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          경쟁사 설문 URL 분석
        </h2>
        <p className="text-xs text-muted mb-4">
          분석할 설문/퀴즈 페이지 URL을 입력하면 자동으로 구조를 분석하고 새로운 콘텐츠를 생성합니다.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/quiz/..."
            required
            className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              submitting || !url.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {submitting ? '생성 중...' : '✨ 분석 시작'}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* 최근 작업 목록 */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">최근 작업</h2>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">불러오는 중...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">
            아직 생성 작업이 없습니다. URL을 입력하여 시작하세요.
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 */}
            <div className="hidden md:block bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted">대상 URL</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted">상태</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted">생성 설문</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted">생성일</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground" title={job.targetUrl}>
                          {truncateUrl(job.targetUrl)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            statusConfig[job.status]?.className ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {statusConfig[job.status]?.label ?? job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted">
                        {job.generatedSurveyIds.length}개
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/generator/${job.id}`}
                          className="text-sm text-primary font-medium hover:underline"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/generator/${job.id}`}
                  className="block bg-white rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm text-foreground break-all" title={job.targetUrl}>
                      {truncateUrl(job.targetUrl, 40)}
                    </span>
                    <span
                      className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                        statusConfig[job.status]?.className ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {statusConfig[job.status]?.label ?? job.status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted">
                    <span>생성 설문 {job.generatedSurveyIds.length}개</span>
                    <span>{formatDate(job.createdAt)}</span>
                  </div>
                  {job.errorMessage && (
                    <p className="mt-2 text-xs text-red-600 truncate">{job.errorMessage}</p>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
