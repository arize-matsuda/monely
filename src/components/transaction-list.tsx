import type { TransactionRow as Row } from "@/lib/data/transactions";
import { formatYen } from "@/lib/money";
import { formatDateLabel } from "@/lib/month";
import { groupByDate } from "@/lib/transaction-groups";
import { TransactionRow } from "./transaction-row";

/**
 * 日付ごとにまとめた一覧（FR-L2, FR-L5）。
 *
 * 「今日 / 昨日」の判定はサーバーの時計で行う。
 * **アプリは JST 固定**（`TZ=Asia/Tokyo`）という前提に依る。
 * → docs/01-requirements/non-functional-requirements.md NFR-D8
 */
export function TransactionList({
  rows,
  today,
}: {
  rows: readonly Row[];
  /** 「今日 / 昨日」の判定に使う。ページが requestNow() から渡す */
  today: Date;
}) {
  const groups = groupByDate(rows);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.dateKey}>
          <h2 className="flex items-baseline justify-between px-1 pb-1.5 text-sm text-muted">
            <span>{formatDateLabel(group.date, today)}</span>
            {group.expenseTotal > 0 ? (
              <span className="tabular-nums">
                {formatYen(group.expenseTotal)}
              </span>
            ) : null}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {group.rows.map((row) => (
              <li key={row.id}>
                <TransactionRow
                  id={row.id}
                  kind={row.kind}
                  amount={row.amount}
                  memo={row.memo}
                  categoryName={row.category?.name ?? null}
                  paidByName={row.paidBy?.displayName ?? null}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
