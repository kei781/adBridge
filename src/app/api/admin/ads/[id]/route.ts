import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adCreateSchema } from "@/types";
import { validateImageSize } from "@/lib/ad-manager";
import type { AdSlot } from "@/generated/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/ads/[id] — 단일 광고 상세 조회
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const ad = await prisma.advertisement.findUnique({
      where: { id },
    });

    if (!ad) {
      return NextResponse.json(
        { error: "광고를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: ad });
  } catch (error) {
    console.error("광고 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "광고를 불러오는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/ads/[id] — 광고 수정
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Zod 유효성 검증
    const parsed = adCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 기존 광고 존재 확인
    const existing = await prisma.advertisement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "광고를 찾을 수 없습니다" },
        { status: 404 }
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

    const ad = await prisma.advertisement.update({
      where: { id },
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

    return NextResponse.json({ data: ad });
  } catch (error) {
    console.error("광고 수정 실패:", error);
    return NextResponse.json(
      { error: "광고를 수정하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ads/[id] — 광고 삭제
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // 존재 확인
    const existing = await prisma.advertisement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "광고를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.advertisement.delete({ where: { id } });

    return NextResponse.json({ message: "광고가 삭제되었습니다" });
  } catch (error) {
    console.error("광고 삭제 실패:", error);
    return NextResponse.json(
      { error: "광고를 삭제하는 데 실패했습니다" },
      { status: 500 }
    );
  }
}
