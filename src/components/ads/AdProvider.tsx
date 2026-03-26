'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

/** 광고 데이터 타입 */
export interface AdData {
  id: string;
  slot: string;
  imageUrl: string;
  redirectUrl: string;
  imageWidth: number;
  imageHeight: number;
}

interface AdContextValue {
  /** 현재 활성 광고 (없으면 null) */
  ad: AdData | null;
  /** 광고 슬롯 타입 */
  slot: string | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 노출 추적 — 광고가 화면에 보일 때 한 번 호출 */
  trackImpression: (adId: string) => void;
  /** 클릭 추적 후 리다이렉트 URL을 새 탭으로 열기 */
  handleClick: (adId: string) => void;
}

const AdContext = createContext<AdContextValue>({
  ad: null,
  slot: null,
  loading: true,
  trackImpression: () => {},
  handleClick: () => {},
});

/** 광고 데이터를 하위 컴포넌트에 제공하는 프로바이더 */
export function AdProvider({ children }: { children: ReactNode }) {
  const [ad, setAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);

  // 이미 노출 추적한 광고 ID를 기억하여 중복 호출 방지
  const impressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch('/api/ads/active');
        if (!res.ok) throw new Error('광고 조회 실패');
        const data = await res.json();
        setAd(data);
      } catch {
        // 광고 로드 실패 시 null 유지 — 페이지 동작에 영향 없음
        setAd(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, []);

  /** 노출(impression) 추적 — 광고 ID 당 한 번만 전송 */
  const trackImpression = useCallback(
    (adId: string) => {
      if (impressedRef.current.has(adId)) return;
      impressedRef.current.add(adId);

      fetch(`/api/ads/${adId}/impression`, { method: 'POST' }).catch(() => {
        // 노출 추적 실패 시 무시 — 사용자 경험에 영향 없음
      });
    },
    [],
  );

  /** 클릭 추적 후 새 탭으로 리다이렉트 URL 열기 */
  const handleClick = useCallback(
    (adId: string) => {
      const redirectUrl = ad?.redirectUrl;

      fetch(`/api/ads/${adId}/click`, { method: 'POST' }).catch(() => {
        // 클릭 추적 실패해도 리다이렉트는 진행
      });

      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
      }
    },
    [ad],
  );

  return (
    <AdContext.Provider
      value={{ ad, slot: ad?.slot ?? null, loading, trackImpression, handleClick }}
    >
      {children}
    </AdContext.Provider>
  );
}

/** 광고 데이터에 접근하기 위한 훅 */
export function useAd() {
  return useContext(AdContext);
}
