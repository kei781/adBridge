import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// GET /api/og/[slug]/[resultKey] — 동적 OG 이미지 생성
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; resultKey: string }> }
) {
  try {
    const { slug, resultKey } = await params;

    const survey = await prisma.survey.findUnique({
      where: { slug },
      include: {
        results: {
          where: { resultKey },
        },
      },
    });

    const result = survey?.results[0];
    if (!survey || !result) {
      return new Response("Not found", { status: 404 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: OG_WIDTH,
            height: OG_HEIGHT,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          {/* 설문 제목 */}
          <div
            style={{
              fontSize: 28,
              opacity: 0.9,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {survey.title}
          </div>

          {/* 결과 제목 */}
          <div
            style={{
              fontSize: 52,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 1.2,
            }}
          >
            {result.title}
          </div>

          {/* 구분선 */}
          <div
            style={{
              width: 120,
              height: 4,
              backgroundColor: "rgba(255,255,255,0.5)",
              borderRadius: 2,
              marginBottom: 24,
            }}
          />

          {/* CTA */}
          <div
            style={{
              fontSize: 24,
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            나도 해보기 →
          </div>

          {/* 브랜드 */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 40,
              fontSize: 18,
              opacity: 0.6,
            }}
          >
            adBridge
          </div>
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    console.error("OG 이미지 생성 실패:", error);
    return new Response("OG 이미지 생성 실패", { status: 500 });
  }
}
