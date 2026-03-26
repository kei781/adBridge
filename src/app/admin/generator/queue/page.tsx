'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// 검토 대기 설문 타입
interface PendingReviewSurvey {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  createdAt: string;
  generationMeta: Record<string, unknown> | null;
  _count: { steps: number; results: number };
}

// 검토 대기 목록 페이지
export default function AdminGeneratorQueuePage() {
  const [surveys, setSurveys] = useState<PendingReviewSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 검토 대기 설문 조회
  const fetchSurveys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/generator/queue');
      const json = await res.json();
      if (res.ok) {
        setSurveys(json.data ?? []);
      }
    } catch (err) {
      console.error('검토 대기 설문 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // 체크박스 토글
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === surveys.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(surveys.map((s) => s.id)));
    }
  };

  // 일괄 승인/거절 처리
  const handleBulkAction = async (action: 'approve' | 'reject', ids?: string[]) => {
    const targetIds = ids ?? Array.from(selectedIds);
    if (targetIds.length === 0 || processing) return;

    setProcessing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/generator/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyIds: targetIds, action }),
      });

      const json = await res.json();

      if (res.ok) {
        const actionLabel = action === 'approve' ? '승인' : '거절';
        setMessage(`${targetIds.length}개 설문이 ${actionLabel}되었습니다.`);
        // 처리된 설문 목록에서 제거
        setSurveys((prev) => prev.filter((s) => !targetIds.includes(s.id)));
        setSelectedIds(new Set());
      } else {
        setMessage(json.error ?? '처리에 실패했습니다.');
      }
    } catch {
      setMessage('네트워크 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
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

  return (
    <div>
      {/* 뒤로가기 + 헤더 */}
      <div className="mb-6">
        <Link
          href="/admin/generator"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← 콘텐츠 생성
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">검토 대기 목록</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleBulkAction('approve')}
            disabled={selectedIds.size === 0 || processing}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedIds.size === 0 || processing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            선택 승인 ({selectedIds.size})
          </button>
          <button
            onClick={() => handleBulkAction('reject')}
            disabled={selectedIds.size === 0 || processing}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedIds.size === 0 || processing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            선택 거절 ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {message}
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">불러오는 중...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          검토 대기 중인 설문이 없습니다.
        </div>
      ) : (
        <div>
          {/* 전체 선택 */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === surveys.length && surveys.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted">
              전체 선택 ({surveys.length}개)
            </span>
          </label>

          {/* 데스크톱 테이블 */}
          <div className="hidden md:block bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">제목</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted">질문</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted">결과</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">생성일</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted">액션</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(survey.id)}
                        onChange={() => toggleSelect(survey.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/surveys/${survey.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {survey.title}
                      </Link>
                      <p className="text-xs text-muted mt-0.5">/{survey.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {survey._count.steps}개
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {survey._count.results}개
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {formatDate(survey.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleBulkAction('approve', [survey.id])}
                          disabled={processing}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleBulkAction('reject', [survey.id])}
                          disabled={processing}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className={`bg-white rounded-xl border p-4 transition-colors ${
                  selectedIds.has(survey.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(survey.id)}
                    onChange={() => toggleSelect(survey.id)}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/surveys/${survey.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {survey.title}
                    </Link>
                    <p className="text-xs text-muted mt-0.5 mb-2">/{survey.slug}</p>
                    <p className="text-xs text-muted line-clamp-2 mb-2">
                      {survey.description}
                    </p>
                    <div className="flex gap-3 text-xs text-muted mb-3">
                      <span>질문 {survey._count.steps}개</span>
                      <span>결과 {survey._count.results}개</span>
                      <span>{formatDate(survey.createdAt)}</span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBulkAction('approve', [survey.id])}
                        disabled={processing}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleBulkAction('reject', [survey.id])}
                        disabled={processing}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
