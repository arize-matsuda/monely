"use client";

import { useLayoutEffect } from "react";
import { readStoredTheme } from "./theme";

/**
 * `data-theme` が外れたときに貼り直す。**開発時のための保険。**
 *
 * React の Strict Mode は開発時にコンポーネントを 1 度再マウントし、
 * そのとき `<html>` の属性を **JSX に書かれているものだけ**に戻す。
 * `ThemeScript` が付けた `data-theme` は JSX に無いので消える。
 * 消えると、ライトを選んでいても OS のダークに戻って見える。
 *
 * `useLayoutEffect` は**描画前**に走るので、ちらつかない。
 * 本番では属性が消えないので何もしない（空振りする）。
 * → node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 *   「Re-applying attributes in development」
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const theme = readStoredTheme();
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  return null;
}
