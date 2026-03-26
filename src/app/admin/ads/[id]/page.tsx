'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

// 슬롯별 허용 이미지 사이즈 규격
const slotSizeMap: Record<string, { width: number; height: number }[]> = {
  SIDEBAR: [
    { width: 300, height: 600 },
    { width: 300, height: 250 },
  ],
  ANCHOR: [
    { width: 728, height: 90 },
    { width: 320, height: 100 },
  ],
  VIGNETTE: [{ width: 480, height: 320 }],
};

// 슬롯별 사이즈 안내 텍스트
const slotSizeGuide: Record<string, string> = {
  SIDEBAR: '300x600 또는 300x250',
  ANCHOR: '728x90 또는 320x100',
  VIGNETTE: '480x320',
};

// 광고 데이터 타입
interface AdData {
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

// 광고 수정 페이지
export default function EditAdPage() {
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // 폼 필드
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<string>('SIDEBAR');
  const [imageUrl, setImageUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageWidth, setImageWidth] = useState(300);
  const [imageHeight, setImageHeight] = useState(600);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  // 통계
  const [clickCount, setClickCount] = useState(0);
  const [impressionCount, setImpressionCount] = useState(0);

  // 광고 데이터 조회
  const fetchAd = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ads/${adId}`);
      if (!res.ok) throw new Error('광고를 불러올 수 없습니다.');

      const json = await res.json();
      const ad: AdData = json.data;

      setName(ad.name);
      setSlot(ad.slot);
      setImageUrl(ad.imageUrl);
      setRedirectUrl(ad.redirectUrl);
      setImageWidth(ad.imageWidth);
      setImageHeight(ad.imageHeight);
      setStartDate(new Date(ad.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(ad.endDate).toISOString().split('T')[0]);
      setIsActive(ad.isActive);
      setClickCount(ad.clickCount);
      setImpressionCount(ad.impressionCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    fetchAd();
  }, [fetchAd]);

  // 슬롯 변경 시 이미지 사이즈 자동 설정
  const handleSlotChange = (newSlot: string) => {
    setSlot(newSlot);
    const firstSize = slotSizeMap[newSlot]?.[0];
    if (firstSize) {
      setImageWidth(firstSize.width);
      setImageHeight(firstSize.height);
    }
  };

  // 사이즈 선택 변경
  const handleSizeChange = (sizeStr: string) => {
    const [w, h] = sizeStr.split('x').map(Number);
    setImageWidth(w);
    setImageHeight(h);
  };

  // CTR 계산
  const ctr =
    impressionCount > 0
      ? ((clickCount / impressionCount) * 100).toFixed(2)
      : '0.00';

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name,
        slot,
        imageUrl,
        redirectUrl,
        imageWidth,
        imageHeight,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isActive,
      };

      const res = await fetch(`/api/admin/ads/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '저장 실패');
      }

      router.push('/admin/ads');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류 발생');
    } finally {
      setSaving(false);
    }
  };

  // 광고 삭제
  const handleDelete = async () => {
    if (!confirm('정말로 이 광고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/ads/${adId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '삭제 실패');
      }

      router.push('/admin/ads');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류 발생');
      setDeleting(false);
    }
  };

  // 로딩 상태
  if (loading) {
    return <div className="text-center py-12 text-muted">불러오는 중...</div>;
  }

  const allowedSizes = slotSizeMap[slot] ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">광고 수정</h1>

      {/* 통계 섹션 */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted mb-1">노출 수</p>
          <p className="text-lg font-bold text-foreground">
            {impressionCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted mb-1">클릭 수</p>
          <p className="text-lg font-bold text-foreground">
            {clickCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted mb-1">CTR</p>
          <p className="text-lg font-bold text-primary">{ctr}%</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        {/* 기본 정보 섹션 */}
        <section className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          <div className="space-y-4">
            {/* 광고명 */}
            <div>
              <label className="block text-sm font-medium mb-1">광고명</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="광고 이름을 입력하세요"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* 슬롯 선택 */}
            <div>
              <label className="block text-sm font-medium mb-1">슬롯</label>
              <select
                value={slot}
                onChange={(e) => handleSlotChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <option value="SIDEBAR">SIDEBAR</option>
                <option value="ANCHOR">ANCHOR</option>
                <option value="VIGNETTE">VIGNETTE</option>
              </select>
              {/* 사이즈 안내 */}
              <p className="text-xs text-muted mt-1">
                허용 사이즈: {slotSizeGuide[slot]}
              </p>
            </div>

            {/* 이미지 사이즈 선택 */}
            {allowedSizes.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  이미지 사이즈
                </label>
                <div className="flex gap-2">
                  {allowedSizes.map((size) => {
                    const sizeStr = `${size.width}x${size.height}`;
                    const isSelected =
                      imageWidth === size.width && imageHeight === size.height;
                    return (
                      <button
                        key={sizeStr}
                        type="button"
                        onClick={() => handleSizeChange(sizeStr)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-white text-muted border border-border hover:bg-gray-50'
                        }`}
                      >
                        {sizeStr}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 활성 상태 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">활성 상태</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-primary' : 'bg-gray-300'
                }`}
                aria-label={`광고 ${isActive ? '비활성화' : '활성화'}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-muted">
                {isActive ? '활성' : '비활성'}
              </span>
            </div>
          </div>
        </section>

        {/* 이미지 및 링크 섹션 */}
        <section className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">이미지 및 링크</h2>
          <div className="space-y-4">
            {/* 이미지 URL */}
            <div>
              <label className="block text-sm font-medium mb-1">
                이미지 URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/ad-image.png"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              {/* 이미지 미리보기 */}
              {imageUrl && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted mb-1">미리보기</p>
                  <img
                    src={imageUrl}
                    alt="미리보기"
                    className="max-w-full max-h-48 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* 리다이렉트 URL */}
            <div>
              <label className="block text-sm font-medium mb-1">
                클릭 시 이동 URL
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://example.com/landing"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>
        </section>

        {/* 기간 섹션 */}
        <section className="bg-white rounded-xl border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">노출 기간</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>
        </section>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-danger bg-danger/10 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* 하단 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                saving
                  ? 'bg-primary/60 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-hover'
              }`}
            >
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-foreground hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>

          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={`sm:ml-auto px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              deleting
                ? 'bg-danger/60 text-white cursor-not-allowed'
                : 'bg-danger/10 text-danger hover:bg-danger/20'
            }`}
          >
            {deleting ? '삭제 중...' : '광고 삭제'}
          </button>
        </div>
      </form>
    </div>
  );
}
