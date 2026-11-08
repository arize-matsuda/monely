"use client";

import { THEME_STORAGE_KEY } from "./theme";

/**
 * 保存されたテーマを**最初の描画より前**に `<html>` へ反映する。
 *
 * これが無いと、OS がダークで利用者がライトを選んでいる場合に
 * 一瞬ダークで描画されてから切り替わる（ちらつき）。
 *
 * Next.js の公式手順どおり `<head>` 内のインラインスクリプトで行う。
 * → node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 *
 * **`dangerouslySetInnerHTML` を使う唯一の場所。**
 * 埋め込む文字列はこのファイル内の定数だけで、利用者の入力は一切入らない。
 * → docs/03-guidelines/security-guidelines.md §7.3
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

  return (
    <script
      /*
       * **type をサーバーとクライアントで変える。**
       *
       * クライアントの描画で <script> を作っても実行されないため、React は
       * 開発時にエラーを出す（「Encountered a script tag while rendering
       * React component」）。Server Action のあとに refresh() を呼ぶと
       * ルートレイアウトまで再描画されるので、この経路に入る。
       *
       * サーバーでは text/javascript（HTML の解析中に実行される）、
       * クライアントでは text/plain（実行されない代わりにエラーも出ない）。
       * type の食い違いは suppressHydrationWarning で黙らせる。
       * → 上記の公式ガイド「Extracting a reusable component」
       *
       * **この仕掛けのために "use client" が要る。** Server Component だと
       * typeof window はサーバーでしか評価されず、RSC ペイロードには
       * text/javascript が載ったままになる。クライアントがそれを描画した
       * 時点で同じエラーになる（1 度これで直し損ねた）。
       */
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 定数のみを埋め込む。利用者の入力は含まない（上のコメント参照）
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
