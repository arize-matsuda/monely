"use server";

import { refresh } from "next/cache";
import { requestNow } from "@/lib/clock";
import {
  createRecurringForMe,
  listTransactionsByMonth,
} from "@/lib/data/transactions";
import { currentMonth, prevMonth } from "@/lib/month";
import { recurringCandidates } from "@/lib/recurring";
import { type ActionResult, failUnexpected, ok } from "@/lib/types";

/**
 * 先月の定期支出を今月にまとめて登録する（FR-R2）。
 *
 * **引数を取らない。** 対象は「先月の印つき記録のうち、今月にまだ
 * 無いもの」とサーバー側だけで決まる。クライアントから ID や金額を
 * 受け取らないので、改ざんの余地が無い。
 *
 * **デプロイ後は Cron からこの処理を呼ぶ。** 判定（`recurringCandidates`）と
 * 作成（`createRecurringForMe`）が分かれているので、
 * 月初に自動実行する形へ差し替えられる（ADR-0011）。
 */
export async function registerRecurring(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const now = await requestNow();
    const month = currentMonth(now);

    const [currentRows, previousRows] = await Promise.all([
      listTransactionsByMonth(month),
      listTransactionsByMonth(prevMonth(month)),
    ]);

    const candidates = recurringCandidates(previousRows, currentRows, month);
    if (candidates.length === 0) return ok({ count: 0 });

    const created = await createRecurringForMe(
      candidates.map((candidate) => ({
        kind: candidate.kind,
        amount: candidate.amount,
        occurredOn: candidate.occurredOn,
        categoryId: candidate.categoryId,
        paidById: candidate.paidById,
        memo: candidate.memo,
      })),
    );
    if (!created.ok) return created;

    refresh();
    return created;
  } catch (error) {
    return failUnexpected("registerRecurring", error);
  }
}
