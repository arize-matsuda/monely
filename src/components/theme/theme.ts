/** 表示テーマ。`system` は OS の設定に追従する */
export type Theme = "system" | "light" | "dark";

export const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "システム" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

/** localStorage のキー。インラインスクリプトと共有するので変えるときは両方直す */
export const THEME_STORAGE_KEY = "monely-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * テーマを DOM と localStorage に反映する。
 * `system` のときは属性を外し、CSS の `color-scheme: light dark` に任せる。
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // プライベートモードなどで書けないことがある。表示は切り替わるので続行する
  }
}

/** 保存されたテーマを読む。無効な値や読めない場合は system */
export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}
