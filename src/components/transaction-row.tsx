import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/money";
import type { Kind } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  return (
    <Link
      href={`/transactions/${id}`}
      className="group flex min-h-[60px] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <Badge variant={categoryName ? "secondary" : "outline"}>
            {categoryName ?? "未分類"}
          </Badge>
          {paidByName ? (
            <span className="truncate text-xs text-muted-foreground">
              {paidByName}
            </span>
          ) : null}
        </span>
        {memo ? (
          <span className="truncate text-sm text-muted-foreground">{memo}</span>
        ) : null}
      </span>

      <span
        className={cn(
          "shrink-0 text-base font-medium tabular-nums",
          kind === "income" && "text-income",
        )}
      >
        {formatAmount(amount, kind)}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground"
        aria-hidden
      />
    </Link>
  );
}
