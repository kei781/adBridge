'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ProgressBar from '@/components/ui/ProgressBar';
import type {
  Survey,
  SurveyStep,
  StepOption,
  SurveyResult,
} from '@/generated/prisma';

// 설문 데이터 타입 (관계 포함)
type StepWithOptions = SurveyStep & {
  options: StepOption[];
};

type SurveyWithRelations = Survey & {
  steps: StepWithOptions[];
  results: SurveyResult[];
};

interface SurveyFlowProps {
  survey: SurveyWithRelations;
}

// 진행 단계
type Phase = 'intro' | 'playing' | 'loading';

/**
 * 설문 플로우 — 인트로 → 질문 진행 → 결과 로딩까지의 전체 인터랙션을 관리
 */
export default function SurveyFlow({ survey }: SurveyFlowProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // 정렬된 스텝 목록
  const sortedSteps = survey.steps;
  const currentStep = sortedSteps[currentStepIndex];
  const totalSteps = sortedSteps.length;

  // 스텝 전환 애니메이션 상태
  const [stepTransition, setStepTransition] = useState(false);

  // 플레이 중 beforeunload + 뒤로가기(popstate) 방지
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    // 뒤로가기 방지: history에 더미 상태 추가
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      if (window.confirm('정말 나가시겠어요? 진행 상황이 저장되지 않습니다.')) {
        window.removeEventListener('popstate', handlePopState);
        router.back();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [phase, router]);

  // 결과 제출 처리
  const submitAnswers = useCallback(
    async (finalAnswers: Record<string, string>) => {
      setPhase('loading');

      try {
        const res = await fetch(`/api/surveys/${survey.slug}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: finalAnswers }),
        });

        if (!res.ok) {
          throw new Error('결과 처리에 실패했습니다.');
        }

        const data = await res.json();
        router.push(`/survey/${survey.slug}/result/${data.resultKey}`);
      } catch (error) {
        console.error('설문 완료 실패:', error);
        // 에러 시 마지막 질문으로 복귀
        setPhase('playing');
      }
    },
    [survey.slug, router]
  );

  // 선택지 클릭 핸들러
  const handleOptionSelect = useCallback(
    (stepId: string, optionId: string) => {
      // 이미 선택 애니메이션 중이면 무시
      if (selectedOptionId) return;

      setSelectedOptionId(optionId);

      // 답변 기록
      const newAnswers = { ...answers, [stepId]: optionId };
      setAnswers(newAnswers);

      // 300ms 후 다음 단계로 이동
      setTimeout(() => {
        setSelectedOptionId(null);

        if (currentStepIndex < totalSteps - 1) {
          // 다음 질문 (슬라이드 전환)
          setStepTransition(true);
          setTimeout(() => {
            setCurrentStepIndex((prev) => prev + 1);
            setStepTransition(false);
          }, 200);
        } else {
          // 마지막 질문 — 결과 제출
          submitAnswers(newAnswers);
        }
      }, 300);
    },
    [answers, currentStepIndex, totalSteps, selectedOptionId, submitAnswers]
  );

  // 시작 핸들러
  const handleStart = () => {
    setPhase('playing');
  };

  // 참여자 수 포맷
  const formattedCount = survey.completionCount.toLocaleString('ko-KR');

  // === 인트로 화면 ===
  if (phase === 'intro') {
    return (
      <div className="relative min-h-dvh flex flex-col items-center justify-center px-4">
        {/* 블러 배경 이미지 */}
        {survey.coverImageUrl && (
          <Image
            src={survey.coverImageUrl}
            alt=""
            fill
            className="object-cover blur-md brightness-50"
            priority
          />
        )}

        {/* 이미지 없을 때 기본 배경 */}
        {!survey.coverImageUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        )}

        {/* 콘텐츠 */}
        <div className="relative z-10 text-center max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-white leading-tight mb-3">
            {survey.title}
          </h1>
          <p className="text-sm text-white/80 mb-2">{survey.description}</p>
          <p className="text-xs text-white/60 mb-8">
            {formattedCount}명 참여
          </p>

          {/* CTA 버튼 */}
          <button
            onClick={handleStart}
            className="w-full max-w-xs mx-auto py-4 px-8 rounded-2xl bg-white text-gray-900 font-bold text-lg shadow-xl animate-pulse hover:animate-none hover:scale-105 active:scale-95 transition-transform"
          >
            지금 시작하기
          </button>
        </div>
      </div>
    );
  }

  // === 로딩 화면 ===
  if (phase === 'loading') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-white">
        {/* 스피너 */}
        <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">결과를 분석하고 있어요...</p>
      </div>
    );
  }

  // === 플레이 화면 ===
  // 선택지 수에 따른 그리드: 2개면 1열, 3개 이상이면 2열
  const optionCount = currentStep.options.length;
  const gridClass = optionCount >= 3 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="flex flex-col bg-white">
      {/* 상단 프로그레스 바 */}
      <div className="px-4 pt-4 pb-2">
        <ProgressBar current={currentStepIndex + 1} total={totalSteps} />
      </div>

      {/* 질문 영역 (슬라이드 전환 애니메이션) */}
      <div className={`flex flex-col px-4 pb-6 transition-all duration-200 ${
        stepTransition ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}>
        {/* 질문 이미지 */}
        {currentStep.questionImageUrl && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4">
            <Image
              src={currentStep.questionImageUrl}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* 질문 텍스트 */}
        <h2 className="text-lg font-bold text-gray-900 text-center mt-4 mb-6 leading-snug">
          {currentStep.questionText}
        </h2>

        {/* 선택지 그리드 */}
        <div className={`grid ${gridClass} gap-3`}>
          {currentStep.options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(currentStep.id, option.id)}
                disabled={selectedOptionId !== null}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 min-h-[80px] transition-all duration-200 ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 scale-95'
                    : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50 active:scale-95'
                } ${selectedOptionId !== null && !isSelected ? 'opacity-50' : ''}`}
              >
                {/* 선택지 이미지 */}
                {option.imageUrl && (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2">
                    <Image
                      src={option.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* 선택지 텍스트 */}
                <span className="text-sm font-medium text-gray-800 text-center leading-snug">
                  {option.label}
                </span>

                {/* 선택 체크 표시 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
