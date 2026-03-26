import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  parseExposureCookie,
  createExposureCookie,
  AD_EXPOSURE_COOKIE,
} from "@/lib/ad-manager";
import type { AdSlot } from "@/generated/prisma";

// GET /api/ads/active — Frequency Capping 기반 활성 광고 조회
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // 쿠키에서 노출 정보 파싱
    const exposureCookie = request.cookies.get(AD_EXPOSURE_COOKIE)?.value;
    const exposure = parseExposureCookie(exposureCookie);

    // 활성 광고 조회 (isActive && 기간 내)
    const activeAds = await prisma.advertisement.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        slot: true,
        imageUrl: true,
        redirectUrl: true,
        imageWidth: true,
        imageHeight: true,
      },
    });

    if (activeAds.length === 0) {
      return NextResponse.json({ ad: null, slot: null });
    }

    // 유효한 쿠키가 있으면 해당 슬롯의 광고 반환
    if (exposure) {
      const slotAds = activeAds.filter((ad) => ad.slot === exposure.slot);
      if (slotAds.length > 0) {
        const randomAd = slotAds[Math.floor(Math.random() * slotAds.length)];
        return NextResponse.json({ ad: randomAd, slot: exposure.slot });
      }
      // 해당 슬롯에 활성 광고가 없으면 아래로 진행하여 새 슬롯 선택
    }

    // 슬롯별 그룹핑
    const slotGroups = new Map<AdSlot, typeof activeAds>();
    for (const ad of activeAds) {
      const group = slotGroups.get(ad.slot) ?? [];
      group.push(ad);
      slotGroups.set(ad.slot, group);
    }

    // 랜덤 슬롯 선택
    const slots = Array.from(slotGroups.keys());
    const selectedSlot = slots[Math.floor(Math.random() * slots.length)];
    const slotAds = slotGroups.get(selectedSlot)!;

    // 해당 슬롯에서 랜덤 광고 선택
    const selectedAd = slotAds[Math.floor(Math.random() * slotAds.length)];

    // Frequency Capping 쿠키 설정 (1시간)
    const response = NextResponse.json({
      ad: selectedAd,
      slot: selectedSlot,
    });

    response.cookies.set(AD_EXPOSURE_COOKIE, createExposureCookie(selectedSlot), {
      maxAge: 3600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("활성 광고 조회 실패:", error);
    return NextResponse.json(
      { error: "광고를 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
