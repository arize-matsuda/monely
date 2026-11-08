import type { MetadataRoute } from "next";

/**
 * PWA の manifest（M5-5 / FR-X6）。
 *
 * ホーム画面から全画面で開くための最小構成。
 * **`display: "standalone"` がブラウザの UI を隠す**ので、
 * 月の移動や戻るはアプリ内の導線だけで完結する必要がある。
 *
 * - `theme_color` は端末のステータスバーの色。ライトの背景色に合わせる
 *   （ダークは `src/app/layout.tsx` の viewport で切り替える）
 * - iOS は**この icons を見ない**。`apple-icon.tsx` が生成する PNG を使う
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monely — わが家の家計簿",
    short_name: "Monely",
    description: "スマホで数秒で記録できて、家族と同じ家計簿を見られる家計簿",
    lang: "ja",
    start_url: "/",
    // ホームに戻る導線が画面内にあるので、ブラウザの UI は隠してよい
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
