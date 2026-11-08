import type { Kind } from "./types";

/**
 * 「先月はあったのに今月まだ無い」カテゴリ（FR-L11 / ADR-0011）。
 *
 * 家賃・通信・サブスクのような毎月同じ支出は、入れ忘れても
 * **何も表示されないので気づけない。** 先月との差から候補を出す。
 *
 * **DB に問い合わせない。** ホームは先月比（FR-L9）のために
 * 先月ぶんの行を既に取得している。その 2 つを比べるだけ。
 */

type Comparable = {
  kind: Kind;
  amount: number;
  categoryId: string | null;
  category: { name: string } | null;
};

export type MissingCategory = {
  categoryId: string;
  name: string;
  /** 先月の合計。入力の初期値に使う */
  previousTotal: number;
};

/** 先月の支出のうち、今月まだ記録が無いカテゴリ */
export function missingCategories(
  currentRows: readonly Comparable[],
  previousRows: readonly Comparable[],
): MissingCategory[] {
  const used = new Set(
    currentRows
      .filter((row) => row.kind === "expense")
      .map((row) => row.categoryId),
  );

  const totals = new Map<string, { name: string; total: number }>();
  for (const row of previousRows) {
    if (row.kind !== "expense") continue;
    // 未分類は候補にしない。「何を入れ忘れたか」が伝わらない
    if (row.categoryId === null) continue;
    if (used.has(row.categoryId)) continue;

    const existing = totals.get(row.categoryId);
    if (existing) {
      existing.total += row.amount;
    } else {
      totals.set(row.categoryId, {
        name: row.category?.name ?? "",
        total: row.amount,
      });
    }
  }

  return (
    [...totals.entries()]
      .map(([categoryId, { name, total }]) => ({
        categoryId,
        name,
        previousTotal: total,
      }))
      // 金額の大きい順。入れ忘れの影響が大きいものを先に出す
      .sort((x, y) => y.previousTotal - x.previousTotal)
  );
}
