"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// 설문 진행 중(/survey/[slug] 직접 경로, /result 제외)에는 광고 숨김
export function AdVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // /survey/xxx 형태이면서 /result가 아닌 경우 = 설문 진행 중
  const isSurveyPlaying =
    /^\/survey\/[^/]+$/.test(pathname);

  if (isSurveyPlaying) return null;

  return <>{children}</>;
}
