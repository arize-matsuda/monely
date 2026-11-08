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

  // biome-ignore lint/security/noDangerouslySetInnerHtml: 定数のみを埋め込む。利用者の入力は含まない（上のコメント参照）
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
