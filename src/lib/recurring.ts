import { type Month, monthRange } from "./month";
import type { Kind } from "./types";

/**
 * 定期支出の写し込み（FR-R1〜R3 / ADR-0011）。
 *
 * **「定期のルール」を別テーブルで持たない。** 記録そのものに印
 * （`recurring`）を付け、先月の印つき記録を今月に写す。
 * **写した記録にも印が付く**ので、翌月も同じ仕組みで候補に出る。
 *
 * 判定をここに純関数で出してある理由は、**デプロイ後に Cron から
 * 同じ処理を呼べるようにするため**。Server Action と Cron の
 * どちらからでも `recurringCandidates` → 作成、の流れで動く。
 */

type Recurring = {
  kind: Kind;
  amount: number;
  occurredOn: Date;
  categoryId: string | null;
  /** 画面に出す名前のために持つ。作成時には使わない */
  category: { name: string } | null;
  paidById: string | null;
  memo: string | null;
  recurring: boolean;
};

export type RecurringCandidate = {
  kind: Kind;
  amount: number;
  /** 写し先の日付（UTC 0 時） */
  occurredOn: Date;
  categoryId: string | null;
  paidById: string | null;
  memo: string | null;
  /** 画面に出す名前。作成時には使わない */
  categoryName: string | null;
  /** 元の記録の日付。画面で「先月は 11/25」と出すために持つ */
  sourceOccurredOn: Date;
};

/**
 * 先月と同じ日に写す。**その月に存在しない日は末日に寄せる。**
 * 1/31 の記録を 2 月に写すと 2/31 になってしまう。
 */
export function shiftToMonth(source: Date, month: Month): Date {
  const { start, nextStart } = monthRange(month);
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth();
  // その月の日数 = 翌月 1 日の 1 日前
  const lastDay = new Date(nextStart.getTime() - 86_400_000).getUTCDate();
  const day = Math.min(source.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * 今月に写すべき定期支出を返す。
 *
 * **二重登録を防ぐため、同じカテゴリ・同じ金額の記録が今月に既にあれば
 * 候補にしない。** 手で入れたあとに「まとめて登録」を押しても増えない。
 *
 * @param previousRows 先月の記録（印の有無を含む）
 * @param currentRows 今月の記録
 * @param month 写し先の月
 */
export function recurringCandidates(
  previousRows: readonly Recurring[],
  currentRows: readonly Recurring[],
  month: Month,
): RecurringCandidate[] {
  // 今月に既にある「カテゴリ + 金額」の組み合わせ
  const existing = new Set(
    currentRows.map((row) => `${row.categoryId ?? ""}:${row.amount}`),
  );

  return (
    previousRows
      .filter((row) => row.recurring)
      .filter((row) => !existing.has(`${row.categoryId ?? ""}:${row.amount}`))
      .map((row) => ({
        kind: row.kind,
        amount: row.amount,
        occurredOn: shiftToMonth(row.occurredOn, month),
        categoryId: row.categoryId,
        paidById: row.paidById,
        memo: row.memo,
        categoryName: row.category?.name ?? null,
        sourceOccurredOn: row.occurredOn,
      }))
      // 日付の早い順。登録後の一覧で自然な並びになる
      .sort((x, y) => x.occurredOn.getTime() - y.occurredOn.getTime())
  );
}
