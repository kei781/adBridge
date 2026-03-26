'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
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

// 로그 엔트리 타입
interface LogEntry {
  step: number;
  title: string;
  status: 'completed' | 'in_progress' | 'failed';
  detail: string;
  timestamp: string;
}

// 생성된 설문 정보
interface GeneratedSurvey {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: string;
  steps?: unknown[];
  results?: unknown[];
}

// 작업 타입
interface GenerationJob {
  id: string;
  targetUrl: string;
  status: string;
  logs: LogEntry[];
  generatedSurveyIds: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// 로그 상태 아이콘
const logIcon: Record<string, string> = {
  completed: '✅',
  in_progress: '⏳',
  failed: '❌',
};

// 작업 상세 페이지 — SSE로 실시간 업데이트
export default function AdminGeneratorJobPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<GenerationJob | null>(null);
  const [surveys, setSurveys] = useState<GeneratedSurvey[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 로그 영역 자동 스크롤
  const scrollToBottom = useCallback(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 작업 상태 폴링 (1초 간격, 완료/실패 시 중지)
  useEffect(() => {
    let active = true;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/admin/generator/${jobId}`);
        if (!res.ok) throw new Error("조회 실패");
        const json = await res.json();
        const data = json.data as GenerationJob;
        if (active) {
          setJob(data);
          setConnectionError(false);
        }
        // 완료/실패 상태면 폴링 중지
        if (data.status === "REVIEW_READY" || data.status === "FAILED") {
          return false;
        }
        return true;
      } catch {
        if (active) setConnectionError(true);
        return false;
      }
    };

    // 즉시 1회 호출 후 폴링 시작
    fetchJob().then((shouldContinue) => {
      if (!shouldContinue || !active) return;
      const interval = setInterval(async () => {
        const cont = await fetchJob();
        if (!cont) clearInterval(interval);
      }, 1500);
      // cleanup에서 interval도 정리
      const cleanup = () => { active = false; clearInterval(interval); };
      // useEffect cleanup을 위해 ref에 저장
      eventSourceRef.current = { close: cleanup } as unknown as EventSource;
    });

    return () => {
      active = false;
      eventSourceRef.current?.close();
    };
  }, [jobId]);

  // 로그 업데이트 시 자동 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [job?.logs, scrollToBottom]);

  // REVIEW_READY 상태일 때 생성된 설문 정보 가져오기
  useEffect(() => {
    if (
      job?.status !== 'REVIEW_READY' ||
      job.generatedSurveyIds.length === 0
    ) {
      return;
    }

    const fetchSurveys = async () => {
      try {
        // 각 설문 개별 조회 (일괄 조회 API가 없으므로)
        const results = await Promise.all(
          job.generatedSurveyIds.map(async (id) => {
            const res = await fetch(`/api/admin/surveys/${id}`);
            if (!res.ok) return null;
            const json = await res.json();
            return json.data as GeneratedSurvey;
          })
        );
        setSurveys(results.filter((s): s is GeneratedSurvey => s !== null));
      } catch (err) {
        console.error('설문 조회 실패:', err);
      }
    };

    fetchSurveys();
  }, [job?.status, job?.generatedSurveyIds]);

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

  // 승인 처리
  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0 || approving) return;

    setApproving(true);
    setApproveMessage(null);

    try {
      const res = await fetch(`/api/admin/generator/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyIds: ids, action: 'approve' }),
      });

      const json = await res.json();

      if (res.ok) {
        setApproveMessage(`${json.data.processedCount}개 설문이 승인되었습니다.`);
        setSelectedIds(new Set());
        // 승인된 설문 상태 업데이트
        setSurveys((prev) =>
          prev.map((s) =>
            ids.includes(s.id) ? { ...s, status: 'PUBLISHED' } : s
          )
        );
      } else {
        setApproveMessage(json.error ?? '승인에 실패했습니다.');
      }
    } catch {
      setApproveMessage('네트워크 오류가 발생했습니다.');
    } finally {
      setApproving(false);
    }
  };

  // 날짜 포맷
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 로딩 상태
  if (!job) {
    return (
      <div className="text-center py-12">
        {connectionError ? (
          <div>
            <p className="text-red-600 text-sm mb-2">연결에 실패했습니다.</p>
            <Link
              href="/admin/generator"
              className="text-sm text-primary hover:underline"
            >
              목록으로 돌아가기
            </Link>
          </div>
        ) : (
          <p className="text-muted text-sm">작업 정보를 불러오는 중...</p>
        )}
      </div>
    );
  }

  const logs = (Array.isArray(job.logs) ? job.logs : []) as LogEntry[];

  return (
    <div>
      {/* 뒤로가기 + 헤더 */}
      <div className="mb-6">
        <Link
          href="/admin/generator"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← 콘텐츠 생성 목록
        </Link>
      </div>

      {/* 작업 요약 */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <h1 className="text-lg font-bold">작업 상세</h1>
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
              statusConfig[job.status]?.className ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {statusConfig[job.status]?.label ?? job.status}
          </span>
        </div>
        <div className="space-y-1 text-sm text-muted">
          <p>
            <span className="font-medium text-foreground">대상 URL:</span>{' '}
            <a
              href={job.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {job.targetUrl}
            </a>
          </p>
          <p>
            <span className="font-medium text-foreground">생성일:</span>{' '}
            {formatDate(job.createdAt)}
          </p>
        </div>
      </div>

      {/* 에러 메시지 */}
      {job.status === 'FAILED' && job.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-lg shrink-0">❌</span>
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-1">오류 발생</h3>
              <p className="text-sm text-red-600">{job.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* 로그 타임라인 */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">진행 로그</h2>

        {logs.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            {job.status === 'QUEUED' ? '작업 시작을 대기 중입니다...' : '로그가 없습니다.'}
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`flex gap-3 p-3 rounded-lg border ${
                  log.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : log.status === 'in_progress'
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-border bg-gray-50'
                }`}
              >
                {/* 상태 아이콘 */}
                <span className="text-lg shrink-0 leading-6">
                  {logIcon[log.status] ?? '⏳'}
                </span>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted">
                      Step {log.step}
                    </span>
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {log.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted">{log.detail}</p>
                </div>

                {/* 시각 */}
                <span className="text-xs text-muted shrink-0 tabular-nums">
                  {formatTime(log.timestamp)}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* 진행중 인디케이터 */}
        {job.status !== 'REVIEW_READY' && job.status !== 'FAILED' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            작업 진행 중...
          </div>
        )}
      </div>

      {/* 생성된 설문 검토 (REVIEW_READY 상태) */}
      {job.status === 'REVIEW_READY' && surveys.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              생성된 설문 ({surveys.length}개)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(Array.from(selectedIds))}
                disabled={selectedIds.size === 0 || approving}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedIds.size === 0 || approving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}
              >
                선택 승인 ({selectedIds.size})
              </button>
              <button
                onClick={() => handleApprove(surveys.map((s) => s.id))}
                disabled={approving}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  approving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                전체 승인
              </button>
            </div>
          </div>

          {approveMessage && (
            <p className="text-sm text-green-600 mb-3">{approveMessage}</p>
          )}

          {/* 전체 선택 체크박스 */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === surveys.length && surveys.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted">전체 선택</span>
          </label>

          {/* 설문 카드 목록 */}
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedIds.has(survey.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                } ${survey.status === 'PUBLISHED' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* 체크박스 */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(survey.id)}
                    onChange={() => toggleSelect(survey.id)}
                    disabled={survey.status === 'PUBLISHED'}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />

                  {/* 설문 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {survey.title}
                      </h3>
                      {survey.status === 'PUBLISHED' && (
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          승인됨
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mb-2 line-clamp-2">
                      {survey.description}
                    </p>
                    <div className="flex gap-3 text-xs text-muted">
                      <span>질문 {survey.steps?.length ?? 0}개</span>
                      <span>결과 {survey.results?.length ?? 0}개</span>
                      <span className="font-mono text-muted">/{survey.slug}</span>
                    </div>
                  </div>

                  {/* 상세 링크 */}
                  <Link
                    href={`/admin/surveys/${survey.id}`}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    편집
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
