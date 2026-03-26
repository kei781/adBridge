import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/images/thumbnails/abc123.png — 생성된 이미지 서빙
// public 폴더 대신 API로 서빙하여 런타임 생성 이미지도 즉시 접근 가능
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = await params;
  const filePath = path.join(process.cwd(), "public/generated", ...segments.path);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".svg" ? "image/svg+xml" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
