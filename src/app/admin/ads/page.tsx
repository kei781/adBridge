'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// 광고 슬롯 배지 스타일 매핑
const slotConfig: Record<string, { label: string; className: string }> = {
  SIDEBAR: { label: 'SIDEBAR', className: 'bg-blue-100 text-blue-700' },
  ANCHOR: { label: 'ANCHOR', className: 'bg-green-100 text-green-700' },
  VIGNETTE: { label: 'VIGNETTE', className: 'bg-purple-100 text-purple-700' },
};

// 광고 목록 아이템 타입
interface AdListItem {
  id: string;
  name: string;
  slot: string;
  imageUrl: string;
  redirectUrl: string;
  imageWidth: number;
  imageHeight: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  clickCount: number;
  impressionCount: number;
}

// 날짜 포맷 헬퍼
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// 광고 관리 페이지
export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 광고 목록 조회
  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ads');
      const json = await res.json();
      setAds(json.data ?? []);
    } catch (error) {
      console.error('광고 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // 활성 상태 토글
  const handleToggleActive = async (ad: AdListItem) => {
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });

      if (!res.ok) throw new Error('상태 변경 실패');

      // 로컬 상태 즉시 업데이트
      setAds((prev) =>
        prev.map((item) =>
          item.id === ad.id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } catch (error) {
      console.error('광고 활성 상태 변경 실패:', error);
      alert('광고 상태 변경에 실패했습니다.');
    }
  };

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">광고 관리</h1>
        <Link
          href="/admin/ads/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
        >
          + 새 광고 만들기
        </Link>
      </div>

      {/* 광고 목록 */}
      {loading ? (
        <div className="text-center py-12 text-muted">불러오는 중...</div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 text-muted">
          아직 광고가 없습니다. 새 광고를 만들어보세요!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors"
            >
              {/* 썸네일 이미지 */}
              <Link href={`/admin/ads/${ad.id}`}>
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={ad.imageUrl}
                    alt={ad.name}
                    className="w-full h-full object-contain"
                  />
                  {/* 슬롯 배지 */}
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                      slotConfig[ad.slot]?.className ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {slotConfig[ad.slot]?.label ?? ad.slot}
                  </span>
                </div>
              </Link>

              {/* 카드 정보 */}
              <div className="p-3">
                <Link href={`/admin/ads/${ad.id}`}>
                  <h3 className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                    {ad.name}
                  </h3>
                </Link>

                {/* 기간 */}
                <p className="text-xs text-muted mt-1">
                  {formatDate(ad.startDate)} ~ {formatDate(ad.endDate)}
                </p>

                {/* 크기 정보 */}
                <p className="text-xs text-muted mt-0.5">
                  {ad.imageWidth}x{ad.imageHeight}
                </p>

                {/* 활성 토글 */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted">
                    {ad.isActive ? '활성' : '비활성'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(ad)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      ad.isActive ? 'bg-primary' : 'bg-gray-300'
                    }`}
                    aria-label={`광고 ${ad.isActive ? '비활성화' : '활성화'}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        ad.isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
