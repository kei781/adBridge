export { auth as middleware } from "@/lib/auth";

// /admin/* 경로만 미들웨어 적용 (로그인 페이지 제외는 auth 콜백에서 처리)
export const config = {
  matcher: ["/admin/:path*"],
};
