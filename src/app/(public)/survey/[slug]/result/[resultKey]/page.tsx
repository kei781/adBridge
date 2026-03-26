import { prisma } from "@/lib/db";
import { getRecommendedSurveys } from "@/lib/recommendation";
import { notFound } from "next/navigation";
import ShareButtons from "@/components/survey/ShareButtons";
import { VignetteAdTrigger } from "@/components/ads/VignetteAdTrigger";
import Link from "next/link";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string; resultKey: string }>;
};

// 동적 메타데이터 — 바이럴 공유의 핵심
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, resultKey } = await params;

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: {
      results: { where: { resultKey } },
    },
  });

  const result = survey?.results[0];
  if (!survey || !result) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const ogImageUrl = `${baseUrl}/api/og/${slug}/${resultKey}`;
  const pageUrl = `${baseUrl}/survey/${slug}/result/${resultKey}`;

  return {
    title: `나는 '${result.title}'이래! | ${survey.title}`,
    description: result.shareText || result.description,
    openGraph: {
      title: `나는 '${result.title}'이래! 너는?`,
      description: `${survey.completionCount.toLocaleString("ko-KR")}명이 참여한 ${survey.title}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      url: pageUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `나는 '${result.title}'이래! 너는?`,
      description: result.shareText,
      images: [ogImageUrl],
    },
  };
}

// 결과 페이지 (SSR)
export default async function ResultPage({ params }: Props) {
  const { slug, resultKey } = await params;

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: {
      results: { where: { resultKey } },
    },
  });

  const result = survey?.results[0];
  if (!survey || !result) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // 추천 설문 (인기도 알고리즘)
  const recommended = await getRecommendedSurveys(survey.id, 4);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Vignette 전면 광고 (0.5초 딜레이) */}
      <VignetteAdTrigger />

      {/* 결과 이미지 */}
      {result.resultImageUrl && (
        <div className="rounded-2xl overflow-hidden mb-6">
          <img
            src={result.resultImageUrl}
            alt={result.title}
            className="w-full"
          />
        </div>
      )}

      {/* 결과 제목 */}
      <div className="text-center mb-6">
        <p className="text-sm text-[var(--color-muted)] mb-2">{survey.title}</p>
        <h1 className="text-3xl font-bold mb-4">{result.title}</h1>
        <p className="text-[var(--color-muted)] leading-relaxed">
          {result.description}
        </p>
      </div>

      {/* 공유 버튼 */}
      <div className="mb-8">
        <p className="text-center text-sm text-[var(--color-muted)] mb-3">
          친구에게 공유하기
        </p>
        <ShareButtons
          slug={slug}
          title={survey.title}
          description={result.shareText || result.description}
          resultKey={resultKey}
          baseUrl={baseUrl}
        />
      </div>

      {/* 다시하기 버튼 */}
      <div className="text-center mb-12">
        <Link
          href={`/survey/${slug}`}
          className="inline-block px-8 py-3 rounded-full bg-[var(--color-card)] text-[var(--color-foreground)] font-medium hover:bg-[var(--color-border)] transition-colors"
        >
          다시 하기
        </Link>
      </div>

      {/* 추천 콘텐츠 */}
      {recommended.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">이런 테스트는 어때요?</h2>
          <div className="grid grid-cols-2 gap-3">
            {recommended.map((s) => (
              <Link
                key={s.id}
                href={`/survey/${s.slug}`}
                className="block rounded-xl overflow-hidden bg-[var(--color-card)] hover:shadow-md transition-shadow"
              >
                <div className="aspect-[3/2] bg-gradient-to-br from-indigo-400 to-purple-500" />
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{s.title}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    {s.completionCount.toLocaleString("ko-KR")}명 참여
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
