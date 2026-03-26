import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import SurveyCard from "@/components/survey/SurveyCard";
import AdCard from "@/components/ads/AdCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "adBridge - 재미있는 테스트 모음",
  description: "나를 알아보는 재미있는 설문조사와 퀴즈!",
};

// 리스트 페이지 (SSR)
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { sort, page } = await searchParams;
  const currentPage = Math.max(1, Number(page || "1"));
  const limit = 12;
  const sortBy = sort === "popular" ? "popular" : "latest";

  const where = { status: "PUBLISHED" as const };
  const orderBy = sortBy === "popular"
    ? { viewCount: "desc" as const }
    : { publishedAt: "desc" as const };

  const [surveys, totalCount] = await Promise.all([
    prisma.survey.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * limit,
      take: limit,
    }),
    prisma.survey.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 정렬 탭 */}
      <div className="flex gap-2 mb-6">
        <SortTab href="/?sort=latest" active={sortBy === "latest"}>
          최신순
        </SortTab>
        <SortTab href="/?sort=popular" active={sortBy === "popular"}>
          인기순
        </SortTab>
      </div>

      {/* 설문 그리드 */}
      {surveys.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-muted)]">
          <p className="text-lg">아직 등록된 테스트가 없어요</p>
          <p className="mt-2 text-sm">곧 재미있는 테스트가 올라올 예정이에요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {surveys.map((survey, index) => (
            <>
              <SurveyCard key={survey.id} survey={survey} />
              {/* 3번째 카드 뒤에 광고 카드 삽입 */}
              {index === 2 && <AdCard key="ad-card" />}
            </>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/?sort=${sortBy}&page=${p}`}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === currentPage
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// 정렬 탭 컴포넌트
function SortTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[var(--color-card)] text-[var(--color-muted)] hover:bg-[var(--color-border)]"
      }`}
    >
      {children}
    </a>
  );
}
