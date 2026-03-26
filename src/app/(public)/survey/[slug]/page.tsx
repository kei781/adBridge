import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import SurveyFlow from "@/components/survey/SurveyFlow";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

// 동적 메타데이터
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const survey = await prisma.survey.findUnique({
    where: { slug },
    select: { title: true, description: true, thumbnailUrl: true },
  });

  if (!survey) return {};

  return {
    title: `${survey.title} | adBridge`,
    description: survey.description,
    openGraph: {
      title: survey.title,
      description: survey.description,
      ...(survey.thumbnailUrl && { images: [survey.thumbnailUrl] }),
    },
  };
}

// 설문 상세/진행 페이지
export default async function SurveyPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
        },
      },
      results: true,
    },
  });

  if (!survey || survey.status !== "PUBLISHED") {
    notFound();
  }

  return <SurveyFlow survey={survey} />;
}
