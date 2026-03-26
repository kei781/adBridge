interface ProgressBarProps {
  /** 현재 단계 (1부터 시작) */
  current: number;
  /** 전체 단계 수 */
  total: number;
  className?: string;
}

/**
 * 설문 진행률 바
 * - "2 / 8" 형식의 텍스트 표시
 * - 애니메이션 너비 전환
 */
export default function ProgressBar({
  current,
  total,
  className = '',
}: ProgressBarProps) {
  // 퍼센트 계산 (최소 0%, 최대 100%)
  const percent = Math.min(Math.max((current / total) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {/* 진행 텍스트 */}
      <div className="flex justify-end mb-1">
        <span className="text-sm text-muted font-medium">
          {current} / {total}
        </span>
      </div>

      {/* 진행 바 트랙 */}
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        {/* 채워지는 바 — transition으로 부드러운 너비 변화 */}
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
}
