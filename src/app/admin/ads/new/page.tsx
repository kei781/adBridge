'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

// 광고 생성 페이지
export default function NewAdPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 폼 필드
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<string>('SIDEBAR');
  const [imageUrl, setImageUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageWidth, setImageWidth] = useState(slotSizeMap.SIDEBAR[0].width);
  const [imageHeight, setImageHeight] = useState(slotSizeMap.SIDEBAR[0].height);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      };

      const res = await fetch('/api/admin/ads', {
        method: 'POST',
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

  const allowedSizes = slotSizeMap[slot] ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">새 광고 만들기</h1>

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
        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
              saving
                ? 'bg-primary/60 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {saving ? '저장 중...' : '광고 저장'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-foreground hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
