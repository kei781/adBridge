/**
 * 설문 이미지 자동 생성 모듈
 *
 * Gemini Image API (Nano Banana)로 후킹한 이미지를 생성합니다.
 * API 키가 없거나 실패 시 SVG 폴백.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// 파일명용 해시 생성 (한글 slug 문제 방지)
function slugHash(slug: string): string {
  return crypto.createHash("md5").update(slug).digest("hex").slice(0, 12);
}

/**
 * Gemini Image API로 이미지 생성 (Nano Banana 모델)
 */
async function generateWithGemini(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.log("[이미지] GOOGLE_AI_API_KEY 미설정, SVG 폴백");
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            responseMimeType: "text/plain",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[이미지] Gemini API ${response.status}:`, errText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    // 응답에서 이미지 파트 찾기
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        console.log("[이미지] AI 이미지 생성 성공");
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    console.log("[이미지] 응답에 이미지 없음, SVG 폴백");
    return null;
  } catch (error) {
    console.error("[이미지] Gemini 호출 실패:", error);
    return null;
  }
}

// ===== SVG 폴백 =====
const GRADIENTS = [
  { from: "#667eea", to: "#764ba2" }, { from: "#f093fb", to: "#f5576c" },
  { from: "#4facfe", to: "#00f2fe" }, { from: "#43e97b", to: "#38f9d7" },
  { from: "#fa709a", to: "#fee140" }, { from: "#a18cd1", to: "#fbc2eb" },
  { from: "#fccb90", to: "#d57eeb" }, { from: "#e0c3fc", to: "#8ec5fc" },
];

function pickGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function pickEmoji(title: string): string {
  const m: [string[], string][] = [
    [["연애", "사랑", "커플", "썸"], "💕"], [["음식", "맛", "먹"], "🍽️"],
    [["성격", "심리", "MBTI"], "🧠"], [["취향", "감성"], "✨"],
    [["재능", "숨은"], "🎯"], [["패턴", "일상"], "📊"], [["운", "행운"], "🍀"],
  ];
  for (const [kw, e] of m) if (kw.some(k => title.includes(k))) return e;
  return "🎮";
}

function makeSvg(w: number, h: number, title: string, sub: string, seed: string): string {
  const g = pickGradient(seed);
  const emoji = pickEmoji(title);
  const ts = title.length > 12 ? 36 : title.length > 8 ? 44 : 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${g.from}"/><stop offset="100%" style="stop-color:${g.to}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<text x="${w/2}" y="${h*0.28}" text-anchor="middle" font-size="72">${emoji}</text>
<text x="${w/2}" y="${h*0.48}" text-anchor="middle" fill="white" font-size="${ts}" font-weight="900" font-family="sans-serif">${esc(title)}</text>
<text x="${w/2}" y="${h*0.6}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="22" font-family="sans-serif">${esc(sub.slice(0,35))}</text>
<rect x="${w*0.25}" y="${h*0.72}" width="${w*0.5}" height="40" rx="20" fill="rgba(255,255,255,0.25)"/>
<text x="${w/2}" y="${h*0.75}" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="sans-serif">지금 테스트하기 →</text>
</svg>`;
}

/**
 * 설문 썸네일 이미지 생성
 */
export async function generateThumbnail(slug: string, title: string, description: string): Promise<string> {
  const dir = path.join(process.cwd(), "public/generated/thumbnails");
  await mkdir(dir, { recursive: true });
  const hash = slugHash(slug);

  // AI 이미지 생성 시도
  const prompt = `한국 바이럴 심리테스트/성격테스트 썸네일 이미지를 생성해줘.

제목: "${title}"
설명: "${description}"

요구사항:
- 한국 MZ세대가 클릭하고 싶은 귀여운 일러스트 스타일
- 제목 "${title}"을 큰 한글 텍스트로 이미지 안에 포함
- 밝고 화려한 색감, 귀여운 캐릭터나 아이콘 포함
- 실제 사람 얼굴 사용 금지
- SNS에서 눈에 띄는 디자인
- 세로 비율 (3:4)`;

  const imageBuffer = await generateWithGemini(prompt);
  if (imageBuffer) {
    const filePath = path.join(dir, `${hash}.png`);
    await writeFile(filePath, imageBuffer);
    return `/api/images/thumbnails/${hash}.png`;
  }

  // SVG 폴백
  const filePath = path.join(dir, `${hash}.svg`);
  await writeFile(filePath, makeSvg(480, 640, title, description, slug), "utf-8");
  return `/api/images/thumbnails/${hash}.svg`;
}

/**
 * 결과별 OG/공유 이미지 생성
 */
export async function generateResultImage(
  slug: string, resultKey: string, surveyTitle: string, resultTitle: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public/generated/results");
  await mkdir(dir, { recursive: true });
  const hash = slugHash(`${slug}-${resultKey}`);

  const prompt = `한국 바이럴 심리테스트 결과 이미지를 생성해줘.

테스트 이름: "${surveyTitle}"
결과: "${resultTitle}"

요구사항:
- 이 결과를 받은 사람이 자랑하고 싶어하는 축하 느낌의 이미지
- "${resultTitle}" 텍스트를 크고 눈에 띄게 한글로 이미지 안에 포함
- 귀여운 한국 일러스트 스타일, 축하 이모티콘/별/하트 장식
- 밝고 화려한 색감
- 실제 사람 얼굴 사용 금지
- SNS 공유 최적화 가로 비율 (약 2:1)
- "나도 해보기 →" 텍스트를 하단에 작게 포함`;

  const imageBuffer = await generateWithGemini(prompt);
  if (imageBuffer) {
    const filePath = path.join(dir, `${hash}.png`);
    await writeFile(filePath, imageBuffer);
    return `/api/images/results/${hash}.png`;
  }

  // SVG 폴백
  const filePath = path.join(dir, `${hash}.svg`);
  await writeFile(filePath, makeSvg(1200, 630, resultTitle, surveyTitle, `${slug}-${resultKey}`), "utf-8");
  return `/api/images/results/${hash}.svg`;
}

/**
 * 설문의 모든 이미지 일괄 생성
 */
export async function generateAllImages(survey: {
  slug: string; title: string; description: string;
  results: { resultKey: string; title: string }[];
}): Promise<{ thumbnailUrl: string; resultImages: Record<string, string> }> {
  console.log(`[이미지] 생성 시작: ${survey.title}`);

  const thumbnailUrl = await generateThumbnail(survey.slug, survey.title, survey.description);

  const resultImages: Record<string, string> = {};
  for (const r of survey.results) {
    resultImages[r.resultKey] = await generateResultImage(survey.slug, r.resultKey, survey.title, r.title);
  }

  console.log(`[이미지] 생성 완료: 썸네일 1 + 결과 ${survey.results.length}개`);
  return { thumbnailUrl, resultImages };
}
