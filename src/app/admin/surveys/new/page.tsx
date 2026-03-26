'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 스텝 데이터 타입
type OptionData = { label: string; weightMap: Record<string, number> };
type StepData = { questionText: string; options: OptionData[] };
type ResultData = { resultKey: string; title: string; description: string; shareText: string };

// 설문 수동 생성 페이지
export default function NewSurveyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 기본 정보
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // 스텝 목록
  const [steps, setSteps] = useState<StepData[]>([
    { questionText: '', options: [{ label: '', weightMap: {} }, { label: '', weightMap: {} }] },
  ]);

  // 결과 목록
  const [results, setResults] = useState<ResultData[]>([
    { resultKey: '', title: '', description: '', shareText: '' },
    { resultKey: '', title: '', description: '', shareText: '' },
  ]);

  // slug 자동 생성: 공백→하이픈, 소문자, 한글 허용
  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, ''));
  };

  // 스텝 추가
  const addStep = () => {
    setSteps([...steps, { questionText: '', options: [{ label: '', weightMap: {} }, { label: '', weightMap: {} }] }]);
  };

  // 스텝 삭제
  const removeStep = (i: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  // 선택지 추가
  const addOption = (stepIdx: number) => {
    const newSteps = [...steps];
    newSteps[stepIdx].options.push({ label: '', weightMap: {} });
    setSteps(newSteps);
  };

  // 선택지 삭제
  const removeOption = (stepIdx: number, optIdx: number) => {
    if (steps[stepIdx].options.length <= 2) return;
    const newSteps = [...steps];
    newSteps[stepIdx].options = newSteps[stepIdx].options.filter((_, i) => i !== optIdx);
    setSteps(newSteps);
  };

  // 결과 추가
  const addResult = () => {
    setResults([...results, { resultKey: '', title: '', description: '', shareText: '' }]);
  };

  // 결과 삭제
  const removeResult = (i: number) => {
    if (results.length <= 2) return;
    setResults(results.filter((_, idx) => idx !== i));
  };

  // 스텝 필드 업데이트 헬퍼
  const updateStep = (stepIdx: number, field: keyof StepData, value: string) => {
    const newSteps = [...steps];
    (newSteps[stepIdx] as Record<string, unknown>)[field] = value;
    setSteps(newSteps);
  };

  // 선택지 라벨 업데이트 헬퍼
  const updateOptionLabel = (stepIdx: number, optIdx: number, value: string) => {
    const newSteps = [...steps];
    newSteps[stepIdx].options[optIdx].label = value;
    setSteps(newSteps);
  };

  // 선택지 가중치 업데이트 헬퍼
  const updateOptionWeight = (stepIdx: number, optIdx: number, key: string, value: number) => {
    const newSteps = [...steps];
    newSteps[stepIdx].options[optIdx].weightMap = {
      ...newSteps[stepIdx].options[optIdx].weightMap,
      [key]: value,
    };
    setSteps(newSteps);
  };

  // 결과 필드 업데이트 헬퍼
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

      const res = await fetch('/api/admin/surveys', {
        method: 'POST',
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

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">새 설문 만들기</h1>

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
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="당신의 연애 유형은?"
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
                placeholder="love-type-test"
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
                placeholder="5가지 상황으로 알아보는 나의 연애 스타일!"
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
                  onChange={(e) => updateStep(stepIdx, 'questionText', e.target.value)}
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
                        {/* 가중치 입력: 결과 키가 입력된 결과만 표시 */}
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
            {saving ? '저장 중...' : '설문 저장'}
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
