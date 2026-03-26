'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

// 사이드바 네비게이션 항목
const navItems = [
  { href: '/admin', label: '대시보드', icon: DashboardIcon },
  { href: '/admin/surveys', label: '설문 관리', icon: SurveyIcon },
  { href: '/admin/ads', label: '광고 관리', icon: AdIcon },
  { href: '/admin/generator', label: '콘텐츠 생성', icon: GeneratorIcon },
  { href: '/admin/analytics', label: '분석', icon: AnalyticsIcon },
];

// 대시보드 아이콘
function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

// 광고 관리 아이콘 (메가폰)
function AdIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

// 콘텐츠 생성 아이콘 (마법 지팡이)
function GeneratorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

// 분석 아이콘 (막대 차트)
function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

// 설문 관리 아이콘
function SurveyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

// 사이드바 컴포넌트
function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-border">
      {/* 로고 */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link href="/admin" className="text-xl font-bold text-primary">
          adBridge
        </Link>
        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          // 정확 매칭: /admin은 exact, /admin/surveys는 startsWith
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-gray-50 hover:text-foreground'
              }`}
            >
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// 모바일 상단 네비게이션
function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* 상단 헤더 */}
      <header className="h-14 flex items-center px-4 bg-white border-b border-border sticky top-0 z-50">
        <Link href="/admin" className="text-xl font-bold text-primary">
          adBridge
        </Link>
        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="flex bg-white border-b border-border sticky top-14 z-40">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// 어드민 레이아웃
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        {/* 데스크톱 사이드바 */}
        <Sidebar />

        {/* 모바일 네비게이션 */}
        <MobileNav />

        {/* 메인 콘텐츠 */}
        <main className="md:pl-60">
          <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
