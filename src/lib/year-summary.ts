import { type Summary, summarize } from "./money";
import { type Month, monthOf, monthsOfYear } from "./month";
import type { Kind } from "./types";

/**
 * 年のページ用の月別集計（FR-L10 / ADR-0010）。
 *
 * **DB で集計しない。** その年の行をまとめて取ってから、ここで月に振り分ける。
 * 集計用のクエリを足すと `householdId` の条件を書き忘れうる場所が増える
 * （ADR-0005 の約束 B）。家族の家計簿なら 1 年で数百件なので十分軽い。
 */

type Monthly = {
  occurredOn: Date;
  kind: Kind;
  amount: number;
};

export type MonthSummaryRow = {
  month: Month;
  summary: Summary;
  /** 記録が 1 件も無い月。棒を出さず「記録なし」と出すために使う */
  empty: boolean;
};

export type YearSummary = {
  year: number;
  /** 1 月から 12 月まで**必ず 12 件**。記録が無い月も 0 として並ぶ */
  months: MonthSummaryRow[];
  /** 年間の合計 */
  total: Summary;
  /** 月別の棒の長さを決める基準。支出が最も多い月の額（全月 0 なら 0） */
  maxExpense: number;
};

/**
 * 月を抜かさず 12 件返す。
 *
 * **記録が無い月も並べる**のが要点。抜けると「1 月 → 3 月」のように
 * 詰まって表示され、使っていない月なのか記録を忘れた月なのかが
 * 分からなくなる。
 *
 * 月の振り分けは `monthOf`（UTC）で行う。`@db.Date` は UTC 0 時で返るため。
 */
export function summarizeYear(
  year: number,
  rows: readonly Monthly[],
): YearSummary {
  const byMonth = new Map<Month, Monthly[]>();
  for (const row of rows) {
    const month = monthOf(row.occurredOn);
    const existing = byMonth.get(month);
    if (existing) {
      existing.push(row);
    } else {
      byMonth.set(month, [row]);
    }
  }

  const months = monthsOfYear(year).map((month) => {
    const monthRows = byMonth.get(month) ?? [];
    return {
      month,
      summary: summarize(monthRows),
      empty: monthRows.length === 0,
    };
  });

  return {
    year,
    months,
    total: summarize(rows),
    maxExpense: months.reduce(
      (max, row) => Math.max(max, row.summary.expense),
      0,
    ),
  };
}
