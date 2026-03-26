'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { SurveyStatus } from '@/generated/prisma';

// 스텝/옵션/결과 데이터 타입
type OptionData = { label: string; weightMap: Record<string, number> };
type StepData = { questionText: string; options: OptionData[] };
type ResultData = { resultKey: string; title: string; description: string; shareText: string };

// 상태 배지 스타일
const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '임시저장', className: 'bg-gray-100 text-gray-700' },
  PENDING_REVIEW: { label: '검토중', className: 'bg-yellow-100 text-yellow-700' },
  PUBLISHED: { label: '발행됨', className: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: '보관됨', className: 'bg-red-100 text-red-700' },
};

// 상태별 전환 가능한 버튼 목록
const statusTransitions: Record<string, { status: SurveyStatus; label: string; className: string }[]> = {
  DRAFT: [
    { status: 'PENDING_REVIEW', label: '검토 요청', className: 'bg-yellow-500 text-white hover:bg-yellow-600' },
    { status: 'PUBLISHED', label: '바로 발행', className: 'bg-green-500 text-white hover:bg-green-600' },
  ],
  PENDING_REVIEW: [
    { status: 'PUBLISHED', label: '발행', className: 'bg-green-500 text-white hover:bg-green-600' },
    { status: 'DRAFT', label: '임시저장으로', className: 'bg-gray-500 text-white hover:bg-gray-600' },
  ],
  PUBLISHED: [
    { status: 'ARCHIVED', label: '보관', className: 'bg-red-500 text-white hover:bg-red-600' },
    { status: 'DRAFT', label: '임시저장으로', className: 'bg-gray-500 text-white hover:bg-gray-600' },
  ],
  ARCHIVED: [
    { status: 'DRAFT', label: '임시저장으로 복원', className: 'bg-gray-500 text-white hover:bg-gray-600' },
    { status: 'PUBLISHED', label: '다시 발행', className: 'bg-green-500 text-white hover:bg-green-600' },
  ],
};

// 설문 수정 페이지
export default function EditSurveyPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState<SurveyStatus>('DRAFT');

  // 기본 정보
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // 스텝/결과 목록
  const [steps, setSteps] = useState<StepData[]>([]);
  const [results, setResults] = useState<ResultData[]>([]);

  // 기존 데이터 조회
  const loadSurvey = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/surveys/${id}`);
      if (!res.ok) throw new Error('조회 실패');
      const json = await res.json();
      const survey = json.data;

      setTitle(survey.title);
      setSlug(survey.slug);
      setDescription(survey.description);
      setCurrentStatus(survey.status);

      // 스텝 데이터 변환
      setSteps(
        survey.steps.map((s: { questionText: string; options: { label: string; weightMap: Record<string, number> }[] }) => ({
          questionText: s.questionText,
          options: s.options.map((o: { label: string; weightMap: Record<string, number> }) => ({
            label: o.label,
            weightMap: o.weightMap as Record<string, number>,
          })),
        }))
      );

      // 결과 데이터 변환
      setResults(
        survey.results.map((r: { resultKey: string; title: string; description: string; shareText: string }) => ({
          resultKey: r.resultKey,
          title: r.title,
          description: r.description,
          shareText: r.shareText,
        }))
      );
    } catch {
      setError('설문을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  // 상태 변경
  const handleStatusChange = async (newStatus: SurveyStatus) => {
    try {
      const res = await fetch(`/api/admin/surveys/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '상태 변경 실패');
      }
      setCurrentStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 실패');
    }
  };

  // 스텝 추가/삭제
  const addStep = () => {
    setSteps([...steps, { questionText: '', options: [{ label: '', weightMap: {} }, { label: '', weightMap: {} }] }]);
  };
  const removeStep = (i: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  // 선택지 추가/삭제
  const addOption = (stepIdx: number) => {
    const newSteps = [...steps];
    newSteps[stepIdx].options.push({ label: '', weightMap: {} });
    setSteps(newSteps);
  };
  const removeOption = (stepIdx: number, optIdx: number) => {
    if (steps[stepIdx].options.length <= 2) return;
    const newSteps = [...steps];
    newSteps[stepIdx].options.splice(optIdx, 1);
    setSteps(newSteps);
  };

  // 결과 추가/삭제
  const addResult = () => {
    setResults([...results, { resultKey: '', title: '', description: '', shareText: '' }]);
  };
  const removeResult = (i: number) => {
    if (results.length <= 2) return;
    setResults(results.filter((_, idx) => idx !== i));
  };

  // 스텝 필드 업데이트
  const updateStepQuestion = (stepIdx: number, value: string) => {
    const newSteps = [...steps];
    newSteps[stepIdx].questionText = value;
    setSteps(newSteps);
  };

  // 선택지 라벨 업데이트
  const updateOptionLabel = (stepIdx: number, optIdx: number, value: string) => {
    const newSteps = [...steps];
    newSteps[stepIdx].options[optIdx].label = value;
    setSteps(newSteps);
  };

  // 선택지 가중치 업데이트
  const updateOptionWeight = (stepIdx: number, optIdx: number, key: string, value: number) => {
    const newSteps = [...steps];
    newSteps[stepIdx].options[optIdx].weightMap = {
      ...newSteps[stepIdx].options[optIdx].weightMap,
      [key]: value,
    };
    setSteps(newSteps);
  };

  // 결과 필드 업데이트
  const updateResult = (idx: number, field: keyof ResultData, value: string) => {
    const newResults = [...results];
    newResults[idx][field] = value;
    setResults(newResults);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        title,
        slug,
        description,
        steps: steps.map((step, i) => ({
          questionText: step.questionText,
          order: i,
          options: step.options.map((opt, j) => ({
            label: opt.label,
            order: j,
            weightMap: opt.weightMap,
          })),
        })),
        results: results.map((r) => ({
          resultKey: r.resultKey,
          title: r.title,
          description: r.description,
          shareText: r.shareText,
        })),
      };

      const res = await fetch(`/api/admin/surveys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '저장 실패');
      }

      router.push('/admin/surveys');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류 발생');
    } finally {
      setSaving(false);
    }
  };

  // 로딩 상태
  if (loading) {
    return <div className="text-center py-20 text-muted">불러오는 중...</div>;
  }

  return (
    <div>
      {/* 상단: 제목 + 상태 배지 + 상태 전환 버튼 */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h1 className="text-xl font-bold">설문 수정</h1>
          <span className={`inline-block w-fit px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig[currentStatus]?.className ?? ''}`}>
            {statusConfig[currentStatus]?.label ?? currentStatus}
          </span>
        </div>

        {/* 상태 전환 버튼 */}
        <div className="flex flex-wrap gap-2">
          {(statusTransitions[currentStatus] ?? []).map((transition) => (
            <button
              key={transition.status}
              onClick={() => handleStatusChange(transition.status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${transition.className}`}
            >
              {transition.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        {/* 기본 정보 섹션 */}
        <section className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">슬러그 (URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-muted mt-1">URL에 사용될 고유 식별자입니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                required
              />
            </div>
          </div>
        </section>

        {/* 질문 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">질문 ({steps.length}개)</h2>
            <button
              type="button"
              onClick={addStep}
              className="text-sm text-primary font-medium hover:text-primary-hover transition-colors"
            >
              + 질문 추가
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, stepIdx) => (
              <div key={stepIdx} className="bg-white rounded-xl border border-border p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted">질문 {stepIdx + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(stepIdx)}
                      className="text-xs text-danger hover:text-danger/80 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={step.questionText}
                  onChange={(e) => updateStepQuestion(stepIdx, e.target.value)}
                  placeholder="질문을 입력하세요"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
                  required
                />

                {/* 선택지 목록 */}
                <div className="space-y-3">
                  {step.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => updateOptionLabel(stepIdx, optIdx, e.target.value)}
                          placeholder={`선택지 ${optIdx + 1}`}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        {/* 가중치 입력 */}
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {results.map((r) =>
                            r.resultKey ? (
                              <div key={r.resultKey} className="flex items-center gap-1">
                                <span className="text-xs text-muted">{r.resultKey}:</span>
                                <input
                                  type="number"
                                  value={opt.weightMap[r.resultKey] || 0}
                                  onChange={(e) => updateOptionWeight(stepIdx, optIdx, r.resultKey, Number(e.target.value))}
                                  className="w-14 px-1.5 py-0.5 border border-border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                      {step.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(stepIdx, optIdx)}
                          className="text-xs text-danger mt-2 hover:text-danger/80 transition-colors"
                        >
                          X
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addOption(stepIdx)}
                  className="text-xs text-primary mt-3 hover:text-primary-hover transition-colors"
                >
                  + 선택지 추가
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 결과 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">결과 ({results.length}개)</h2>
            <button
              type="button"
              onClick={addResult}
              className="text-sm text-primary font-medium hover:text-primary-hover transition-colors"
            >
              + 결과 추가
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted">결과 {i + 1}</span>
                  {results.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeResult(i)}
                      className="text-xs text-danger hover:text-danger/80 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">결과 키</label>
                    <input
                      type="text"
                      value={result.resultKey}
                      onChange={(e) => updateResult(i, 'resultKey', e.target.value)}
                      placeholder="예: type_a"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">결과 제목</label>
                    <input
                      type="text"
                      value={result.title}
                      onChange={(e) => updateResult(i, 'title', e.target.value)}
                      placeholder="결과 제목"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-muted mb-1">결과 설명</label>
                  <textarea
                    value={result.description}
                    onChange={(e) => updateResult(i, 'description', e.target.value)}
                    placeholder="결과에 대한 상세 설명"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    required
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-muted mb-1">공유 텍스트</label>
                  <input
                    type="text"
                    value={result.shareText}
                    onChange={(e) => updateResult(i, 'shareText', e.target.value)}
                    placeholder="나는 '결과명'이래! 너도 해봐!"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-danger bg-danger/10 px-4 py-2 rounded-lg">{error}</p>
        )}

        {/* 하단 버튼 */}
        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
              saving
                ? 'bg-primary/60 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-foreground hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
