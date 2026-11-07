import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monely",
  description: "わが家の家計簿。スマホで数秒で記録して、家族と同じ家計を見る。",
  applicationName: "Monely",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 拡大を禁止しない（maximumScale / userScalable を指定しない）。NFR-U12〜U15
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// instant = false はここ（ルートレイアウト）に置かない。
// アプリ全体の静的シェル検証が外れてしまう。認証後の (app) レイアウトに置く。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
