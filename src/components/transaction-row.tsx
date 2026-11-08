import Link from "next/link";
import { formatAmount } from "@/lib/money";
import type { Kind } from "@/lib/types";

type Props = {
  id: string;
  kind: Kind;
  amount: number;
  memo: string | null;
  categoryName: string | null;
  paidByName: string | null;
};

/**
 * 一覧の 1 行（FR-L7）。タップで編集画面へ。
 * 高さは 44px 以上を確保する（NFR-U7）。
 */
export function TransactionRow({
  id,
  kind,
  amount,
  memo,
  categoryName,
  paidByName,
}: Props) {
  const sub = [memo, paidByName].filter(Boolean).join("・");

  return (
    <Link
      href={`/transactions/${id}`}
      className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-background"
    >
      <span className="min-w-0">
        <span className="block truncate text-base">
          {categoryName ?? <span className="text-muted">未分類</span>}
        </span>
        {sub ? (
          <span className="block truncate text-xs text-muted">{sub}</span>
        ) : null}
      </span>
      <span
        className={`shrink-0 tabular-nums ${kind === "income" ? "text-income" : ""}`}
      >
        {formatAmount(amount, kind)}
      </span>
    </Link>
  );
}
