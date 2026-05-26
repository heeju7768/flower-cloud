import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "마음꽃 워드클라우드",
  description: "초등학교 그림책 연극 프로젝트 수업용 실시간 마음꽃 워드클라우드"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
