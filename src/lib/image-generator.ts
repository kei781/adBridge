/**
 * 설문 이미지 자동 생성 모듈
 *
 * Gemini API (Imagen)를 사용하여 후킹한 이미지를 생성합니다.
 * - 설문 썸네일: 눈길을 끄는 일러스트 스타일 이미지
 * - 결과별 OG 이미지: 결과를 자랑하고 싶게 만드는 공유용 이미지
 * - API 키가 없으면 SVG 폴백
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 640;

// Gemini 클라이언트
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Gemini Imagen으로 이미지 생성
 */
async function generateImageWithAI(
  prompt: string,
  width: number,
  height: number
): Promise<Buffer | null> {
  const client = getGeminiClient();
  if (!client) {
    console.log("[이미지] Gemini API 키 없음, SVG 폴백 사용");
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `Generate an image: ${prompt}

Requirements:
- Size: ${width}x${height} pixels
- Style: Cute Korean illustration style, colorful, eye-catching
- Must include bold Korean text overlay
- Vibrant colors, modern design
- No real human faces
- Appeal to Korean young adults (20-30s)`,
        }],
      }],
      generationConfig: {
        responseMimeType: "text/plain",
      },
    });

    // Gemini 2.0 flash는 직접 이미지를 생성하지 않으므로
    // Imagen 모델을 사용해야 함
    console.log("[이미지] Gemini 응답:", result.response.text().slice(0, 100));
    return null;
  } catch (error) {
    console.error("[이미지] Gemini API 에러:", error);
    return null;
  }
}

/**
 * Imagen 3 모델로 이미지 생성 (REST API 직접 호출)
 */
async function generateImageWithImagen(
  prompt: string,
): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  try {
    // Imagen 3 REST API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "block_few",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[이미지] Imagen API 에러:", response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) {
      console.log("[이미지] Imagen 응답에 이미지 없음");
      return null;
    }

    return Buffer.from(base64Image, "base64");
  } catch (error) {
    console.error("[이미지] Imagen 호출 실패:", error);
    return null;
  }
}

// ===== 그라디언트 테마 팔레트 (SVG 폴백용) =====
const GRADIENTS = [
  { from: "#667eea", to: "#764ba2" },
  { from: "#f093fb", to: "#f5576c" },
  { from: "#4facfe", to: "#00f2fe" },
  { from: "#43e97b", to: "#38f9d7" },
  { from: "#fa709a", to: "#fee140" },
  { from: "#a18cd1", to: "#fbc2eb" },
  { from: "#fccb90", to: "#d57eeb" },
  { from: "#e0c3fc", to: "#8ec5fc" },
];

function pickGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pickEmoji(title: string): string {
  const map: [string[], string][] = [
    [["연애", "사랑", "커플", "썸"], "💕"], [["음식", "맛", "먹", "요리"], "🍽️"],
    [["성격", "심리", "MBTI", "유형"], "🧠"], [["여행", "휴가"], "✈️"],
    [["취향", "감성", "스타일"], "✨"], [["재능", "능력", "숨은"], "🎯"],
    [["패턴", "습관", "일상"], "📊"], [["운", "행운", "운세"], "🍀"],
  ];
  for (const [keywords, emoji] of map) {
    if (keywords.some((k) => title.includes(k))) return emoji;
  }
  return "🎮";
}

/**
 * SVG 폴백 이미지 생성
 */
function generateSvgFallback(opts: {
  width: number; height: number;
  title: string; subtitle?: string; bottomText?: string;
  seed: string;
}): string {
  const { width, height, title, subtitle, bottomText, seed } = opts;
  const gradient = pickGradient(seed);
  const emoji = pickEmoji(title);
  const titleSize = title.length > 12 ? 36 : title.length > 8 ? 44 : 52;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradient.from}"/>
      <stop offset="100%" style="stop-color:${gradient.to}"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <text x="${width / 2}" y="${height * 0.28}" text-anchor="middle" font-size="72" filter="url(#shadow)">${emoji}</text>
  <text x="${width / 2}" y="${height * 0.48}" text-anchor="middle" fill="white" font-size="${titleSize}" font-weight="900" font-family="sans-serif" filter="url(#shadow)">${escapeXml(title)}</text>
  ${subtitle ? `<text x="${width / 2}" y="${height * 0.6}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="24" font-family="sans-serif">${escapeXml(subtitle.slice(0, 30))}</text>` : ""}
  ${bottomText ? `<text x="${width / 2}" y="${height * 0.85}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="20" font-family="sans-serif">${escapeXml(bottomText)}</text>` : ""}
  <rect x="${width * 0.25}" y="${height * 0.7}" width="${width * 0.5}" height="40" rx="20" fill="rgba(255,255,255,0.25)"/>
  <text x="${width / 2}" y="${height * 0.73}" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="sans-serif">지금 테스트하기 →</text>
</svg>`;
}

/**
 * 설문 썸네일 이미지 생성
 */
export async function generateThumbnail(
  slug: string,
  title: string,
  description: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public/generated/thumbnails");
  await mkdir(dir, { recursive: true });

  // AI 이미지 생성 시도
  const aiPrompt = `Create a cute, eye-catching thumbnail image for a Korean personality quiz titled "${title}". ${description}. Style: colorful Korean illustration, kawaii style, bold text "${title}" in Korean, vibrant background, no real human faces, appealing to Korean young adults. The image should make people want to click and take the quiz.`;

  const imageBuffer = await generateImageWithImagen(aiPrompt);

  if (imageBuffer) {
    const filePath = path.join(dir, `${slug}.png`);
    await writeFile(filePath, imageBuffer);
    console.log(`[이미지] AI 썸네일 생성 완료: ${title}`);
    return `/generated/thumbnails/${slug}.png`;
  }

  // SVG 폴백
  const svg = generateSvgFallback({
    width: THUMB_WIDTH, height: THUMB_HEIGHT,
    title, subtitle: description, bottomText: "지금 테스트하기 →",
    seed: slug,
  });
  const filePath = path.join(dir, `${slug}.svg`);
  await writeFile(filePath, svg, "utf-8");
  return `/generated/thumbnails/${slug}.svg`;
}

/**
 * 결과별 OG 이미지 생성
 */
export async function generateResultImage(
  slug: string,
  resultKey: string,
  surveyTitle: string,
  resultTitle: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public/generated/results");
  await mkdir(dir, { recursive: true });
  const fileName = `${slug}-${resultKey}`;

  // AI 이미지 생성 시도
  const aiPrompt = `Create a shareable result image for a Korean personality quiz. The quiz is "${surveyTitle}" and this person's result is "${resultTitle}". Style: celebratory, fun Korean illustration, the text "${resultTitle}" should be prominently displayed in Korean, colorful and cute style, something people would be proud to share on social media. Include decorative elements like confetti, stars, or cute characters. No real human faces.`;

  const imageBuffer = await generateImageWithImagen(aiPrompt);

  if (imageBuffer) {
    const filePath = path.join(dir, `${fileName}.png`);
    await writeFile(filePath, imageBuffer);
    console.log(`[이미지] AI 결과 이미지 생성 완료: ${resultTitle}`);
    return `/generated/results/${fileName}.png`;
  }

  // SVG 폴백
  const svg = generateSvgFallback({
    width: OG_WIDTH, height: OG_HEIGHT,
    title: resultTitle, subtitle: surveyTitle, bottomText: "나도 해보기 → adBridge",
    seed: `${slug}-${resultKey}`,
  });
  const filePath = path.join(dir, `${fileName}.svg`);
  await writeFile(filePath, svg, "utf-8");
  return `/generated/results/${fileName}.svg`;
}

/**
 * 설문의 모든 이미지 일괄 생성
 */
export async function generateAllImages(survey: {
  slug: string;
  title: string;
  description: string;
  results: { resultKey: string; title: string }[];
}): Promise<{
  thumbnailUrl: string;
  resultImages: Record<string, string>;
}> {
  console.log(`[이미지] 이미지 생성 시작: ${survey.title}`);

  const thumbnailUrl = await generateThumbnail(
    survey.slug, survey.title, survey.description
  );

  const resultImages: Record<string, string> = {};
  for (const result of survey.results) {
    const imageUrl = await generateResultImage(
      survey.slug, result.resultKey, survey.title, result.title
    );
    resultImages[result.resultKey] = imageUrl;
  }

  console.log(`[이미지] 이미지 생성 완료: 썸네일 1개 + 결과 ${survey.results.length}개`);
  return { thumbnailUrl, resultImages };
}
