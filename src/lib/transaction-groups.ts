import { sumExpense } from "./money";
import { toDateKey } from "./month";
import type { Kind } from "./types";

/**
 * 一覧を日付ごとにまとめる（FR-L2）。
 *
 * 日付のキーは **UTC で取り出す**（`@db.Date` は UTC 0 時で返る）。
 * → docs/02-design/database-design.md §5.2
 */

type Groupable = {
  occurredOn: Date;
  kind: Kind;
  amount: number;
};

export type DateGroup<T> = {
  /** `"2026-11-07"` */
  dateKey: string;
  /** 見出しの整形に使う（UTC 0 時） */
  date: Date;
  rows: T[];
  /** その日の支出合計（FR-L5） */
  expenseTotal: number;
};

/**
 * 日付の新しい順にまとめる。
 * 各グループ内の並びは入力の順を保つ（DAL が createdAt 降順で返す）。
 */
export function groupByDate<T extends Groupable>(
  rows: readonly T[],
): DateGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const key = toDateKey(row.occurredOn);
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, groupRows]) => ({
      dateKey,
      // グループ内の行は同じ日付なので、先頭の値を見出しに使える
      date: (groupRows[0] as T).occurredOn,
      rows: groupRows,
      expenseTotal: sumExpense(groupRows),
    }));
}
