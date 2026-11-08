import type { Kind } from "./types";

/**
 * 金額の整形と集計。**金額の計算はすべてここを通す。**
 * 画面ごとに書くと必ずどこかでずれる（docs/03-guidelines/coding-standards.md §8）。
 *
 * 金額は常に「円」の正の整数。浮動小数点の演算をしない。
 */

/**
 * 桁区切りだけ Intl に任せ、**通貨記号は自前で付ける**。
 *
 * `style: "currency", currency: "JPY"` を使うと ja-JP では
 * **全角の ￥（U+FFE5）**が返る。半角数字と並べると幅が揃わず、
 * モバイルの一覧で見栄えが悪い。環境の ICU に依存する点も避けたい。
 * → テストで実際に気づいた（2026-11-08）
 */
const GROUPED = new Intl.NumberFormat("ja-JP");

/** 半角の円記号。全角の ￥（U+FFE5）と混ぜない */
export const YEN_SIGN = "¥";

/** `1280` → `"¥1,280"` */
export function formatYen(amount: number): string {
  return `${YEN_SIGN}${GROUPED.format(amount)}`;
}

/** 収入の表示。`320000` → `"+¥320,000"` */
export function formatIncome(amount: number): string {
  return `+${formatYen(amount)}`;
}

/**
 * 差額の表示。符号を必ず付ける。
 * `137600` → `"+¥137,600"` / `-12000` → `"−¥12,000"`（全角マイナス）
 */
export function formatBalance(balance: number): string {
  if (balance === 0) return formatYen(0);
  const sign = balance > 0 ? "+" : "−";
  return `${sign}${formatYen(Math.abs(balance))}`;
}

/** 種別に応じた表示。支出は符号なし、収入は + 付き */
export function formatAmount(amount: number, kind: Kind): string {
  return kind === "income" ? formatIncome(amount) : formatYen(amount);
}

export type Summary = {
  /** 支出の合計（円） */
  expense: number;
  /** 収入の合計（円） */
  income: number;
  /** 収入 − 支出。負になりうる */
  balance: number;
};

/**
 * 月次の合計。`kind` で分けて足す。
 * **金額に符号を持たせていないので、ここで向きを解釈する**（BR-2）。
 */
export function summarize(
  rows: readonly { kind: Kind; amount: number }[],
): Summary {
  let expense = 0;
  let income = 0;
  for (const row of rows) {
    if (row.kind === "income") {
      income += row.amount;
    } else {
      expense += row.amount;
    }
  }
  return { expense, income, balance: income - expense };
}

/** その日の支出合計（日付見出しに出す。FR-L5） */
export function sumExpense(
  rows: readonly { kind: Kind; amount: number }[],
): number {
  return rows.reduce(
    (total, row) => (row.kind === "expense" ? total + row.amount : total),
    0,
  );
}
