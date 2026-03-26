import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adCreateSchema } from "@/types";
import { validateImageSize } from "@/lib/ad-manager";
import type { AdSlot } from "@/generated/prisma";

// GET /api/admin/ads — 광고 목록 조회 (슬롯 필터 지원)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const slot = searchParams.get("slot") as AdSlot | null;

    // 필터 조건 구성
    const where: Record<string, unknown> = {};
    if (slot && ["SIDEBAR", "ANCHOR", "VIGNETTE"].includes(slot)) {
      where.slot = slot;
    }

    const ads = await prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: ads });
  } catch (error) {
    console.error("광고 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "광고 목록을 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/admin/ads — 광고 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Zod 유효성 검증
    const parsed = adCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slot, imageUrl, redirectUrl, imageWidth, imageHeight, startDate, endDate, isActive } = parsed.data;

    // 이미지 사이즈 검증
    const sizeValidation = validateImageSize(slot as AdSlot, imageWidth, imageHeight);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.message },
        { status: 400 }
      );
    }

    // 날짜 파싱 및 유효성 검증
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다" },
        { status: 400 }
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "종료일은 시작일보다 이후여야 합니다" },
        { status: 400 }
      );
    }

    const ad = await prisma.advertisement.create({
      data: {
        name,
        slot: slot as AdSlot,
        imageUrl,
        redirectUrl,
        imageWidth,
        imageHeight,
        startDate: start,
        endDate: end,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ data: ad }, { status: 201 });
  } catch (error) {
    console.error("광고 생성 실패:", error);
    return NextResponse.json(
      { error: "광고를 생성하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
