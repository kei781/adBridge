import Link from 'next/link';
import Image from 'next/image';
import type { Survey } from '@/generated/prisma';

interface SurveyCardProps {
  survey: Pick<Survey, 'slug' | 'title' | 'thumbnailUrl' | 'completionCount'>;
}

/**
 * 설문 카드 — 리스트 페이지에서 개별 설문을 표시하는 서버 컴포넌트
 * 썸네일 이미지(없으면 그라디언트 플레이스홀더), 제목, 참여자 수를 보여준다.
 */
export default function SurveyCard({ survey }: SurveyCardProps) {
  const { slug, title, thumbnailUrl, completionCount } = survey;

  // 참여자 수 포맷 (한국어 로캘)
  const formattedCount = completionCount.toLocaleString('ko-KR');

  return (
    <Link
      href={`/survey/${slug}`}
      className="group block rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      {/* 썸네일 영역 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          // 이미지 없을 때 그라디언트 플레이스홀더
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-pink-400 to-orange-300" />
        )}
      </div>

      {/* 카드 정보 */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {title}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {formattedCount}명 참여
        </p>
      </div>
    </Link>
  );
}
