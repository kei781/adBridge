import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "adBridge - 바이럴 설문조사 플랫폼",
  description: "재미있는 설문조사와 퀴즈로 나를 알아보세요!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
