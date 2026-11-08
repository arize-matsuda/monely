import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
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
  //
  // viewport-fit=cover が無いと env(safe-area-inset-*) が常に 0 になる。
  // 下部タブはこれを使ってホームバーを避けているので、指定しないと
  // PWA（standalone）で潜る。
  viewportFit: "cover",
  // globals.css の --background と同じ値。
  // **ずれると起動直後に色が切り替わって見える。**
  // 数値は oklch で書いてあるので、pnpm check:contrast が一致を検査する
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// instant = false はここ（ルートレイアウト）に置かない。
// アプリ全体の静的シェル検証が外れてしまう。認証後の (app) レイアウトに置く。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning は ThemeScript が data-theme を書き換えるため必要
    <html
      lang="ja"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
