import type { Kind } from "./types";

/**
 * 当月の支出をカテゴリ別にまとめる（FR-L8 / ADR-0009）。
 *
 * **DB に問い合わせない。** ホーム画面が既に取得している行から計算する。
 * 集計用のクエリを足すと、`householdId` の条件を書き忘れる場所が
 * 1 つ増える（ADR-0005 の約束 B）。足さないのが一番安全。
 *
 * 収入は対象にしない。収入は件数が少なく、内訳を見る動機が薄い。
 */

type Breakable = {
  kind: Kind;
  amount: number;
  categoryId: string | null;
  category: { name: string } | null;
};

export type CategoryShare = {
  /** 未分類は null */
  categoryId: string | null;
  name: string;
  total: number;
  /** 支出合計に対する割合（0〜1）。支出が 0 なら 0 */
  ratio: number;
};

/** カテゴリが付いていない記録の表示名。用語集に合わせる */
export const UNCATEGORIZED_LABEL = "未分類";

/**
 * 金額の多い順に返す。同額なら名前順（表示が入れ替わらないように）。
 * 支出が 1 件も無ければ空配列。
 */
export function breakdownByCategory(
  rows: readonly Breakable[],
): CategoryShare[] {
  const totals = new Map<string | null, { name: string; total: number }>();
  let expenseTotal = 0;

  for (const row of rows) {
    if (row.kind !== "expense") continue;
    expenseTotal += row.amount;

    const key = row.categoryId;
    const name = row.category?.name ?? UNCATEGORIZED_LABEL;
    const existing = totals.get(key);
    if (existing) {
      existing.total += row.amount;
    } else {
      totals.set(key, { name, total: row.amount });
    }
  }

  return (
    [...totals.entries()]
      .map(([categoryId, { name, total }]) => ({
        categoryId,
        name,
        total,
        // 支出が 0 のときは 0 で割らない
        ratio: expenseTotal === 0 ? 0 : total / expenseTotal,
      }))
      // 同額のときに並びが毎回変わると「動いて見える」ので名前で固定する。
      // localeCompare(ja) は読み順（文字コード順ではない）
      .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name, "ja"))
  );
}
