'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAd } from './AdProvider';

/**
 * 광고 카드 — 설문 리스트 그리드에 네이티브 광고로 삽입
 * SurveyCard와 동일한 비율(aspect-[3/4])로 표시
 */
export default function AdCard() {
  const { ad, slot, loading, trackImpression, handleClick } = useAd();
  const hasTrackedRef = useRef(false);

  // 노출 추적 (마운트 시 한 번)
  useEffect(() => {
    if (ad && slot === 'VIGNETTE' && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackImpression(ad.id);
    }
  }, [ad, slot, trackImpression]);

  // 로딩 중이거나 VIGNETTE 슬롯이 아니면 렌더링하지 않음
  if (loading || !ad || slot !== 'VIGNETTE') return null;

  return (
    <button
      type="button"
      onClick={() => handleClick(ad.id)}
      className="group block w-full rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 text-left cursor-pointer"
    >
      {/* 이미지 영역 — SurveyCard와 동일한 비율 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <Image
          src={ad.imageUrl}
          alt="광고"
          width={480}
          height={320}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* 광고 뱃지 */}
        <span className="absolute top-2 left-2 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white leading-none">
          광고
        </span>
      </div>

      {/* 카드 하단 정보 — SurveyCard 스타일 매칭 */}
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          광고
        </p>
      </div>
    </button>
  );
}
