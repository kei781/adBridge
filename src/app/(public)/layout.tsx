import Link from "next/link";
import { AdProvider } from "@/components/ads/AdProvider";
import SidebarAd from "@/components/ads/SidebarAd";
import AnchorAd from "@/components/ads/AnchorAd";

// 공개 페이지 레이아웃
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdProvider>
      <div className="min-h-screen flex flex-col">
        {/* 헤더 */}
        <header className="border-b border-[var(--color-border)] bg-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
            <Link href="/" className="text-xl font-bold text-[var(--color-primary)]">
              adBridge
            </Link>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="flex-1">
          {children}
        </main>

        {/* 푸터 */}
        <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-[var(--color-muted)]">
          <p>&copy; 2024 adBridge. All rights reserved.</p>
        </footer>

        {/* 광고: 사이드바 (데스크톱) + 앵커 (모바일) */}
        <SidebarAd />
        <AnchorAd />
      </div>
    </AdProvider>
  );
}
