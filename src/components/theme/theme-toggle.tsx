"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { applyTheme, readStoredTheme, THEMES, type Theme } from "./theme";

/**
 * 表示テーマの切り替え（システム / ライト / ダーク）。
 *
 * 初期値はマウント後に localStorage から読む。
 * サーバーでは localStorage が無く、lazy initializer で読むと
 * ハイドレーションの不一致になるため。
 * **画面の配色自体は ThemeScript が描画前に当てているので、ちらつかない。**
 * ここで一瞬ずれるのは「どのボタンが選択中か」の表示だけ。
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  return (
    <SegmentedControl
      legend="表示テーマ"
      name="theme"
      options={THEMES}
      value={theme}
      onChange={(next) => {
        setTheme(next);
        applyTheme(next);
      }}
    />
  );
}
