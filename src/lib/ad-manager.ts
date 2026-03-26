import type { AdSlot } from "@/generated/prisma";

// 슬롯별 허용 이미지 사이즈
export const AD_SLOT_SIZES: Record<AdSlot, { width: number; height: number }[]> = {
  SIDEBAR: [
    { width: 300, height: 600 },
    { width: 300, height: 250 },
  ],
  ANCHOR: [
    { width: 728, height: 90 },
    { width: 320, height: 100 },
  ],
  VIGNETTE: [
    { width: 480, height: 320 },
  ],
};

/**
 * 광고 이미지 사이즈 유효성 검증
 */
export function validateImageSize(
  slot: AdSlot,
  width: number,
  height: number
): { valid: boolean; message?: string } {
  const allowedSizes = AD_SLOT_SIZES[slot];
  const isValid = allowedSizes.some(
    (size) => size.width === width && size.height === height
  );

  if (!isValid) {
    const sizeStr = allowedSizes
      .map((s) => `${s.width}x${s.height}`)
      .join(" 또는 ");
    return {
      valid: false,
      message: `${slot} 슬롯은 ${sizeStr} 사이즈만 허용됩니다.`,
    };
  }

  return { valid: true };
}

// Frequency Capping 쿠키 이름
export const AD_EXPOSURE_COOKIE = "ad_exposure";

// Frequency Capping TTL (1시간, 밀리초)
export const AD_EXPOSURE_TTL = 60 * 60 * 1000;

/**
 * Frequency Capping 쿠키 파싱
 */
export function parseExposureCookie(
  cookieValue: string | undefined
): { slot: AdSlot; expiresAt: number } | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(cookieValue);
    if (parsed.slot && parsed.expiresAt && parsed.expiresAt > Date.now()) {
      return parsed;
    }
    return null; // 만료됨
  } catch {
    return null;
  }
}

/**
 * Frequency Capping 쿠키 값 생성
 */
export function createExposureCookie(slot: AdSlot): string {
  return JSON.stringify({
    slot,
    expiresAt: Date.now() + AD_EXPOSURE_TTL,
  });
}
