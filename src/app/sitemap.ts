import { prisma } from "@/lib/db";
import type { MetadataRoute } from "next";

// sitemap.xml 자동 생성
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // 발행된 설문 조회
  const surveys = await prisma.survey.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });

  const surveyUrls: MetadataRoute.Sitemap = surveys.map((survey) => ({
    url: `${baseUrl}/survey/${survey.slug}`,
    lastModified: survey.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...surveyUrls,
  ];
}
