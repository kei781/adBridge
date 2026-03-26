'use client';

import { useCallback, useEffect, useState } from 'react';

interface ShareButtonsProps {
  slug: string;
  title: string;
  description: string;
  /** 결과 유형 키 (OG 이미지 등에 활용) */
  resultKey: string;
  /** 공유 링크의 기본 URL (예: https://example.com) */
  baseUrl: string;
}

/** Kakao SDK 전역 타입 선언 */
declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

/**
 * 공유 버튼 모음 컴포넌트
 * - 카카오톡, 트위터/X, 페이스북, 링크 복사
 * - 공유 시 POST /api/surveys/[slug]/share 호출
 */
export default function ShareButtons({
  slug,
  title,
  description,
  resultKey,
  baseUrl,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${baseUrl}/survey/${slug}/result/${resultKey}`;

  // Kakao SDK 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Kakao?.isInitialized()) return;

    // 이미 스크립트가 있으면 중복 로드 방지
    if (document.getElementById('kakao-sdk')) return;

    const script = document.createElement('script');
    script.id = 'kakao-sdk';
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    script.async = true;
    script.onload = () => {
      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (kakaoKey && window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
    };
    document.head.appendChild(script);
  }, []);

  // 공유 이벤트 기록 API 호출
  const trackShare = useCallback(
    async (platform: string) => {
      try {
        await fetch(`/api/surveys/${slug}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, resultKey }),
        });
      } catch {
        // 공유 추적 실패는 사용자 경험을 방해하지 않음
      }
    },
    [slug, resultKey],
  );

  // 카카오톡 공유
  const handleKakao = useCallback(() => {
    if (!window.Kakao?.isInitialized()) {
      alert('카카오 SDK가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: `${baseUrl}/api/og/${slug}/${resultKey}`,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: '나도 해보기',
          link: { mobileWebUrl: `${baseUrl}/survey/${slug}`, webUrl: `${baseUrl}/survey/${slug}` },
        },
      ],
    });

    trackShare('kakao');
  }, [title, description, baseUrl, slug, resultKey, shareUrl, trackShare]);

  // 트위터/X 공유
  const handleTwitter = useCallback(() => {
    const text = `${title}\n${description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    trackShare('twitter');
  }, [title, description, shareUrl, trackShare]);

  // 페이스북 공유
  const handleFacebook = useCallback(() => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    trackShare('facebook');
  }, [shareUrl, trackShare]);

  // 링크 복사
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      // 2초 후 상태 초기화
      setTimeout(() => setCopied(false), 2000);
      trackShare('link_copy');
    } catch {
      // clipboard API 미지원 환경 대비 fallback
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare('link_copy');
    }
  }, [shareUrl, trackShare]);

  // 공통 버튼 스타일
  const btnBase =
    'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm transition-colors duration-150 active:scale-95 transform';

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {/* 카카오톡 */}
      <button
        type="button"
        onClick={handleKakao}
        className={`${btnBase} bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]`}
      >
        <KakaoIcon />
        카카오톡 공유
      </button>

      {/* 트위터/X */}
      <button
        type="button"
        onClick={handleTwitter}
        className={`${btnBase} bg-black text-white hover:bg-gray-800`}
      >
        <TwitterIcon />
        X(트위터) 공유
      </button>

      {/* 페이스북 */}
      <button
        type="button"
        onClick={handleFacebook}
        className={`${btnBase} bg-[#1877F2] text-white hover:bg-[#166FE5]`}
      >
        <FacebookIcon />
        페이스북 공유
      </button>

      {/* 링크 복사 */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={`${btnBase} border border-border text-foreground hover:bg-gray-50 relative`}
      >
        <LinkIcon />
        {copied ? '복사 완료!' : '링크 복사'}
        {/* 복사 완료 토스트 피드백 */}
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-3 py-1 rounded-full shadow-lg animate-fade-in">
            클립보드에 복사되었습니다
          </span>
        )}
      </button>
    </div>
  );
}

// --- 아이콘 컴포넌트 ---

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.794 5.11 4.504 6.46-.159.568-.577 2.058-.661 2.378-.104.397.146.392.307.285.126-.084 2.005-1.362 2.816-1.922.664.098 1.345.149 2.034.149 5.523 0 10-3.463 10-7.691S17.523 3 12 3z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
