'use client';

import { useEffect, useRef } from 'react';

import { useAd } from './AdProvider';

/**
 * 사이드바 광고 — 데스크톱 전용, 페이지 우측에 고정 표시
 * 모바일에서는 숨김 (hidden md:block)
 */
export default function SidebarAd() {
  const { ad, slot, loading, trackImpression, handleClick } = useAd();
  const hasTrackedRef = useRef(false);

  // 노출 추적 (마운트 시 한 번)
  useEffect(() => {
    if (ad && slot === 'SIDEBAR' && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackImpression(ad.id);
    }
  }, [ad, slot, trackImpression]);

  // 로딩 중이거나 사이드바 슬롯이 아니면 렌더링하지 않음
  if (loading || !ad || slot !== 'SIDEBAR') return null;

  return (
    <div className="hidden md:block fixed right-4 top-1/2 -translate-y-1/2 z-40">
      <div className="relative">
        {/* 광고 라벨 */}
        <span className="absolute top-1 right-1 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white leading-none">
          광고
        </span>

        {/* 광고 이미지 */}
        <button
          type="button"
          onClick={() => handleClick(ad.id)}
          className="block cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt="광고"
            width={ad.imageWidth}
            height={ad.imageHeight}
            className="block"
          />
        </button>
      </div>
    </div>
  );
}
