/**
 * 설문 이미지 자동 생성 모듈
 *
 * 설문 생성/승인 시 호출하여:
 * 1. 설문 썸네일 이미지 (리스트 카드용)
 * 2. 각 결과별 OG 이미지 (공유용 1200x630)
 * 를 사전 생성하여 public/generated/에 저장합니다.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 640;

// 그라디언트 테마 팔레트 (랜덤 선택)
const GRADIENTS = [
  { from: "#667eea", to: "#764ba2" }, // 보라-인디고
  { from: "#f093fb", to: "#f5576c" }, // 핑크-레드
  { from: "#4facfe", to: "#00f2fe" }, // 파랑-시안
  { from: "#43e97b", to: "#38f9d7" }, // 초록-민트
  { from: "#fa709a", to: "#fee140" }, // 핑크-노랑
  { from: "#a18cd1", to: "#fbc2eb" }, // 라벤더-핑크
  { from: "#fccb90", to: "#d57eeb" }, // 오렌지-보라
  { from: "#e0c3fc", to: "#8ec5fc" }, // 연보라-하늘
];

function pickGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/**
 * SVG를 PNG로 변환 (Sharp 없이 SVG 파일로 저장 — 브라우저 호환)
 * Next.js에서 SVG를 이미지로 서빙 가능
 */
function generateSvgImage(opts: {
  width: number;
  height: number;
  gradient: { from: string; to: string };
  title: string;
  subtitle?: string;
  bottomText?: string;
  emoji?: string;
}): string {
  const { width, height, gradient, title, subtitle, bottomText, emoji } = opts;

  // 텍스트 길이에 따라 폰트 사이즈 조정
  const titleSize = title.length > 12 ? 36 : title.length > 8 ? 44 : 52;
  const subtitleSize = 22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradient.from}"/>
      <stop offset="100%" style="stop-color:${gradient.to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" rx="0"/>
  ${emoji ? `<text x="${width / 2}" y="${height * 0.3}" text-anchor="middle" font-size="64">${emoji}</text>` : ""}
  <text x="${width / 2}" y="${height * 0.48}" text-anchor="middle" fill="white" font-size="${titleSize}" font-weight="bold" font-family="sans-serif">${escapeXml(title)}</text>
  ${subtitle ? `<text x="${width / 2}" y="${height * 0.58}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="${subtitleSize}" font-family="sans-serif">${escapeXml(subtitle)}</text>` : ""}
  ${bottomText ? `<text x="${width / 2}" y="${height * 0.88}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="18" font-family="sans-serif">${escapeXml(bottomText)}</text>` : ""}
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 설문 썸네일 이미지 생성
 * @returns 이미지 URL 경로 (예: /generated/thumbnails/my-slug.svg)
 */
export async function generateThumbnail(
  slug: string,
  title: string,
  description: string
): Promise<string> {
  const gradient = pickGradient(slug);
  const emoji = pickEmoji(title);

  const svg = generateSvgImage({
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    gradient,
    title,
    subtitle: description.length > 30 ? description.slice(0, 30) + "..." : description,
    bottomText: "지금 테스트하기 →",
    emoji,
  });

  const dir = path.join(process.cwd(), "public/generated/thumbnails");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${slug}.svg`);
  await writeFile(filePath, svg, "utf-8");

  return `/generated/thumbnails/${slug}.svg`;
}

/**
 * 결과별 OG 이미지 생성
 * @returns 이미지 URL 경로 (예: /generated/results/my-slug-result_a.svg)
 */
export async function generateResultImage(
  slug: string,
  resultKey: string,
  surveyTitle: string,
  resultTitle: string
): Promise<string> {
  const gradient = pickGradient(`${slug}-${resultKey}`);

  const svg = generateSvgImage({
    width: OG_WIDTH,
    height: OG_HEIGHT,
    gradient,
    title: resultTitle,
    subtitle: surveyTitle,
    bottomText: "나도 해보기 → adBridge",
  });

  const dir = path.join(process.cwd(), "public/generated/results");
  await mkdir(dir, { recursive: true });
  const fileName = `${slug}-${resultKey}.svg`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, svg, "utf-8");

  return `/generated/results/${fileName}`;
}

/**
 * 설문 제목에서 관련 이모지 추출
 */
function pickEmoji(title: string): string {
  const emojiMap: [string[], string][] = [
    [["연애", "사랑", "커플", "연인", "썸"], "💕"],
    [["음식", "맛", "먹", "요리", "카페"], "🍽️"],
    [["성격", "심리", "MBTI", "유형"], "🧠"],
    [["여행", "휴가", "해외"], "✈️"],
    [["운동", "헬스", "스포츠"], "💪"],
    [["돈", "재테크", "주식", "경제"], "💰"],
    [["취향", "감성", "스타일"], "✨"],
    [["재능", "능력", "숨은"], "🎯"],
    [["패턴", "습관", "일상"], "📊"],
    [["친구", "우정", "인간관계"], "👫"],
  ];

  for (const [keywords, emoji] of emojiMap) {
    if (keywords.some((k) => title.includes(k))) return emoji;
  }
  return "🎮";
}

/**
 * 설문의 모든 이미지 일괄 생성 (썸네일 + 결과별 OG)
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
  // 썸네일 생성
  const thumbnailUrl = await generateThumbnail(
    survey.slug,
    survey.title,
    survey.description
  );

  // 결과별 OG 이미지 생성
  const resultImages: Record<string, string> = {};
  for (const result of survey.results) {
    const imageUrl = await generateResultImage(
      survey.slug,
      result.resultKey,
      survey.title,
      result.title
    );
    resultImages[result.resultKey] = imageUrl;
  }

  return { thumbnailUrl, resultImages };
}
