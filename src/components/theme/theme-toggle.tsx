"use client";

import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, THEMES, type Theme } from "./theme";

/**
 * 表示テーマの切り替え（システム / ライト / ダーク）。
 *
 * 初期値はマウント後に localStorage から読む。
 * サーバーでは localStorage が無く、lazy initializer で読むと
 * ハイドレーションの不一致になるため。
 * **画面の配色自体は ThemeScript が描画前に当てているので、ちらつかない。**
 * ここで一瞬ずれるのは「どのボタンが選択中か」の表示だけ。
 *
 * 見た目はセグメントコントロールだが、中身は本物の radio。
 * 矢印キーでの移動とスクリーンリーダーの読み上げが標準で効く。
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  return (
    <fieldset className="flex gap-1 rounded-xl border border-border bg-background p-1">
      <legend className="sr-only">表示テーマ</legend>
      {THEMES.map((option) => {
        const selected = option.value === theme;
        return (
          <label
            key={option.value}
            className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-accent ${
              selected
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={selected}
              onChange={() => {
                setTheme(option.value);
                applyTheme(option.value);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
