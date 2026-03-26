'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAd } from './AdProvider';

/**
 * 앵커 광고 — 화면 하단에 고정되는 배너
 * 모바일 320x100, 데스크톱 728x90
 */
export default function AnchorAd() {
  const { ad, slot, loading, trackImpression, handleClick } = useAd();
  const hasTrackedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  // 노출 추적 (마운트 시 한 번)
  useEffect(() => {
    if (ad && slot === 'ANCHOR' && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackImpression(ad.id);
    }
  }, [ad, slot, trackImpression]);

  // 로딩 중이거나 앵커 슬롯이 아니거나 닫힌 경우 렌더링하지 않음
  if (loading || !ad || slot !== 'ANCHOR' || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-white/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.1)] py-2 px-3">
      <div className="relative">
        {/* 광고 라벨 */}
        <span className="absolute -top-1 left-1 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white leading-none">
          광고
        </span>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white text-xs leading-none hover:bg-gray-700 transition-colors"
          aria-label="광고 닫기"
        >
          &times;
        </button>

        {/* 광고 이미지 — 모바일/데스크톱 반응형 */}
        <button
          type="button"
          onClick={() => handleClick(ad.id)}
          className="block cursor-pointer"
        >
          {/* 모바일 배너 (320x100) */}
          <div className="block md:hidden">
            <Image
              src={ad.imageUrl}
              alt="광고"
              width={320}
              height={100}
              className="block rounded"
            />
          </div>
          {/* 데스크톱 배너 (728x90) */}
          <div className="hidden md:block">
            <Image
              src={ad.imageUrl}
              alt="광고"
              width={728}
              height={90}
              className="block rounded"
            />
          </div>
        </button>
      </div>
    </div>
  );
}
