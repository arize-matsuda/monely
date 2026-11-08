/**
 * デザイントークンのコントラスト比を確認する（NFR-U6: WCAG AA 以上）。
 *
 *   node scripts/check-contrast.mjs
 *
 * globals.css の light-dark(ライト, ダーク) を読み、
 * 文字色と背景色の組み合わせを両モードで検証する。
 */
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);

/** `--name: light-dark(a, b);` と `--name: value;` を拾う */
function parseTokens(source) {
  const tokens = {};
  const root = source.slice(
    source.indexOf(":root {"),
    source.indexOf(':root[data-theme="light"]'),
  );
  const pattern = /--([a-z0-9-]+):\s*([^;]+);/gi;
  for (const match of root.matchAll(pattern)) {
    const [, name, raw] = match;
    const value = raw.trim();
    const pair = /^light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)$/s.exec(value);
    tokens[name] = pair
      ? { light: pair[1], dark: pair[2] }
      : { light: value, dark: value };
  }
  return tokens;
}

/** oklch(L C H) / oklch(L C H / A) を sRGB の 0..1 に変換する */
function oklchToSrgb(value) {
  const match =
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)%?)?\s*\)/i.exec(
      value,
    );
  if (!match) throw new Error(`oklch として読めない: ${value}`);
  const L = Number(match[1]);
  const C = Number(match[2]);
  const hDeg = Number(match[3]);
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // Oklab -> 線形 sRGB（Björn Ottosson の式）
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
}

/** 相対輝度 */
function luminance(linearRgb) {
  const [r, g, b] = linearRgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const a = luminance(oklchToSrgb(fg));
  const b = luminance(oklchToSrgb(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = parseTokens(css);

/** [文字色, 背景色, 用途, 必要な比率] */
const pairs = [
  ["foreground", "background", "本文 / ページ背景", 4.5],
  ["foreground", "card", "本文 / カード", 4.5],
  ["muted-foreground", "background", "補助テキスト / ページ背景", 4.5],
  ["muted-foreground", "card", "補助テキスト / カード", 4.5],
  ["primary-foreground", "primary", "主要ボタンの文字", 4.5],
  [
    "destructive-foreground",
    "destructive",
    "破壊的ボタンの文字（地色塗り）",
    4.5,
  ],
  ["destructive", "background", "破壊的ボタンの文字（薄塗り）", 4.5],
  ["destructive", "card", "エラーメッセージ / カード", 4.5],
  ["income", "card", "収入の金額 / カード", 4.5],
  ["income", "background", "収入の金額 / ページ背景", 4.5],
  ["deficit", "card", "差額マイナス / カード", 4.5],
  ["deficit", "background", "差額マイナス / ページ背景", 4.5],
  ["secondary-foreground", "secondary", "副ボタンの文字", 4.5],
  ["accent-foreground", "accent", "ホバー時の文字", 4.5],
  ["primary", "background", "UI 部品としての主要色", 3],
];

let failed = 0;
for (const mode of ["light", "dark"]) {
  console.log(`\n=== ${mode === "light" ? "ライト" : "ダーク"} ===`);
  for (const [fgName, bgName, label, required] of pairs) {
    const fg = tokens[fgName]?.[mode];
    const bg = tokens[bgName]?.[mode];
    if (!fg || !bg) {
      console.log(`  ?  ${label}: トークンが見つからない`);
      failed += 1;
      continue;
    }
    let ratio;
    try {
      ratio = contrast(fg, bg);
    } catch {
      console.log(`  -  ${label}: 透明度つきの値なので判定を省略`);
      continue;
    }
    const ok = ratio >= required;
    if (!ok) failed += 1;
    console.log(
      `  ${ok ? "OK" : "NG"} ${label.padEnd(30)} ${ratio.toFixed(2)}:1 (必要 ${required}:1)`,
    );
  }
}

console.log(
  failed === 0
    ? "\nすべて基準を満たしている"
    : `\n★ ${failed} 件が基準を下回っている`,
);
process.exit(failed === 0 ? 0 : 1);
