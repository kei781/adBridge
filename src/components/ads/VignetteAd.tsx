'use client';

import { useEffect, useRef, useState } from 'react';

import { useAd } from './AdProvider';

interface VignetteAdProps {
  /** 모달 표시 여부 */
  show: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 비네트 광고 — 전체 화면 모달 오버레이
 * 처음 3초간 닫기 버튼 비활성화, 카운트다운 표시
 */
export default function VignetteAd({ show, onClose }: VignetteAdProps) {
  const { ad, slot, trackImpression, handleClick } = useAd();
  const hasTrackedRef = useRef(false);
  const [countdown, setCountdown] = useState(3);
  const [canClose, setCanClose] = useState(false);

  // 표시될 때 카운트다운 시작
  useEffect(() => {
    if (!show || slot !== 'VIGNETTE') return;

    // 카운트다운 초기화
    setCountdown(3);
    setCanClose(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show, slot]);

  // 노출 추적 (표시될 때 한 번)
  useEffect(() => {
    if (show && ad && slot === 'VIGNETTE' && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      trackImpression(ad.id);
    }
  }, [show, ad, slot, trackImpression]);

  // 표시 조건이 아니면 렌더링하지 않음
  if (!show || !ad || slot !== 'VIGNETTE') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 max-w-lg w-full">
        {/* 닫기 버튼 / 카운트다운 */}
        <div className="absolute -top-3 -right-3 z-10">
          {canClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg text-lg leading-none hover:bg-gray-100 transition-colors"
              aria-label="광고 닫기"
            >
              &times;
            </button>
          ) : (
            <span className="flex h-8 items-center rounded-full bg-white/90 px-3 text-xs text-gray-500 shadow-lg">
              {countdown}초 후 닫기 가능
            </span>
          )}
        </div>

        {/* 광고 라벨 */}
        <span className="absolute top-2 left-2 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white leading-none">
          광고
        </span>

        {/* 광고 이미지 */}
        <button
          type="button"
          onClick={() => handleClick(ad.id)}
          className="block w-full cursor-pointer overflow-hidden rounded-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt="광고"
            width={ad.imageWidth}
            height={ad.imageHeight}
            className="block w-full h-auto"
          />
        </button>
      </div>
    </div>
  );
}
