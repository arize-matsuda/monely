import { BellRing, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TransactionRow } from "@/lib/data/transactions";
import { missingCategories } from "@/lib/missing-categories";
import { formatYen } from "@/lib/money";
import { duplicateHref } from "@/lib/prefill";

/**
 * 「先月はあったのに今月まだ無い」カテゴリの提示（FR-L11 / ADR-0011）。
 *
 * **今月を見ているときだけ出す。** 過去の月に「まだ記録がありません」と
 * 出しても意味が無い（その月はもう終わっている）。判断は呼び出し側。
 *
 * 各候補は `/new` への先月の金額つきリンク。1 タップで入力画面に入り、
 * 金額とカテゴリが埋まった状態から始められる。
 */
export function MissingCategoriesNotice({
  rows,
  previousRows,
}: {
  rows: readonly TransactionRow[];
  previousRows: readonly TransactionRow[];
}) {
  const missing = missingCategories(rows, previousRows);
  if (missing.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4 text-muted-foreground" aria-hidden />
          入れ忘れ？
        </CardTitle>
        <CardDescription>
          先月はあったのに、今月まだ記録がないものです
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {missing.map((category) => (
          <Button
            key={category.categoryId}
            asChild
            variant="outline"
            className="h-auto flex-col items-start gap-0.5 py-2"
          >
            <Link
              href={duplicateHref({
                kind: "expense",
                amount: category.previousTotal,
                categoryId: category.categoryId,
                paidById: null,
                memo: null,
              })}
            >
              <span className="flex items-center gap-1.5 text-sm">
                <Plus className="size-3.5" aria-hidden />
                {category.name}
              </span>
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                先月 {formatYen(category.previousTotal)}
              </span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
