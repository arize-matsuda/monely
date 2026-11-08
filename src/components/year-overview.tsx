import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatBalance, formatIncome, formatYen } from "@/lib/money";
import { formatMonthShort } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { MonthSummaryRow, YearSummary } from "@/lib/year-summary";

/**
 * 年の月別一覧（FR-L10 / ADR-0010）。
 *
 * **12 か月を必ず並べる。** 記録が無い月を抜くと「1 月 → 3 月」のように
 * 詰まり、使っていない月なのか記録を忘れた月なのかが分からなくなる。
 *
 * 棒の長さは「支出が最も多い月」を基準にした相対値。
 * 月どうしの大小が一目で分かることがこの画面の目的なので、
 * 絶対額ではなく相対で見せる。
 */
export function YearOverview({ summary }: { summary: YearSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {summary.year}年の合計
          </p>
          <dl className="grid grid-cols-2 gap-3">
            <Total label="支出" value={formatYen(summary.total.expense)} />
            <Total
              label="収入"
              value={formatIncome(summary.total.income)}
              tone="text-income"
            />
          </dl>
          <Separator />
          <dl className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">差額</dt>
            <dd
              className={cn(
                "text-2xl font-semibold tabular-nums",
                summary.total.balance < 0 ? "text-deficit" : "text-income",
              )}
            >
              {formatBalance(summary.total.balance)}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(1)]">
        <ul className="divide-y divide-border">
          {summary.months.map((row) => (
            <li key={row.month}>
              <MonthLine row={row} maxExpense={summary.maxExpense} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-medium tabular-nums", tone)}>{value}</dd>
    </div>
  );
}

function MonthLine({
  row,
  maxExpense,
}: {
  row: MonthSummaryRow;
  maxExpense: number;
}) {
  // 支出が最も多い月を 100% とした相対値。全月 0 のときは 0
  const ratio = maxExpense === 0 ? 0 : row.summary.expense / maxExpense;

  return (
    <Link
      href={`/?m=${row.month}`}
      className="flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      <span className="w-10 shrink-0 text-sm tabular-nums">
        {formatMonthShort(row.month)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        {row.empty ? (
          <span className="text-sm text-muted-foreground">記録なし</span>
        ) : (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium tabular-nums">
                {formatYen(row.summary.expense)}
              </span>
              {/* 収入と差額は横幅があるときだけ。スマホでは支出に絞る */}
              <span className="hidden items-baseline gap-3 text-xs tabular-nums sm:flex">
                {row.summary.income > 0 ? (
                  <span className="text-income">
                    {formatIncome(row.summary.income)}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "w-24 text-right",
                    row.summary.balance < 0
                      ? "text-deficit"
                      : "text-muted-foreground",
                  )}
                >
                  {formatBalance(row.summary.balance)}
                </span>
              </span>
            </span>
            {/* 棒は装飾。金額は上に文字で出している */}
            <span
              className="block h-2 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-chart-1"
                style={{ width: `${Math.max(ratio * 100, 2)}%` }}
              />
            </span>
          </>
        )}
      </span>

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/60"
        aria-hidden
      />
    </Link>
  );
}
