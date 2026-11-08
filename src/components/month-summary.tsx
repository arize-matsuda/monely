import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  compareAmount,
  formatBalance,
  formatDiff,
  formatDiffRatio,
  formatIncome,
  formatYen,
  type Summary,
} from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * 月次の合計（FR-L4）と先月との比較（FR-L9）。
 *
 * この画面で一番見る数字なので大きく出す。
 * 支出は中立色（赤にしない。毎日のことなので一覧が警告だらけになる）。
 *
 * **増減に色を付けない。** 支出が増えたことを赤で出すと、
 * 月初（まだ記録が少ない月）が常に「改善」に見えてしまう。
 * 矢印の向きだけで示し、判断は利用者に委ねる。
 */
export function MonthSummary({
  summary,
  previous,
}: {
  summary: Summary;
  /** 先月の合計。無い場合（データが無い月）は比較を出さない */
  previous?: Summary;
}) {
  const deficit = summary.balance < 0;
  // 先月に記録が 1 件も無ければ比較の意味が無い
  const hasPrevious =
    previous !== undefined && (previous.expense > 0 || previous.income > 0);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-3">
          <Cell
            icon={ArrowUpRight}
            label="支出"
            value={formatYen(summary.expense)}
            previous={hasPrevious ? previous.expense : undefined}
            current={summary.expense}
          />
          <Cell
            icon={ArrowDownLeft}
            label="収入"
            value={formatIncome(summary.income)}
            tone="text-income"
            previous={hasPrevious ? previous.income : undefined}
            current={summary.income}
          />
        </dl>

        <Separator />

        <dl className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Scale className="size-3.5" aria-hidden />
            差額
          </dt>
          <dd
            className={cn(
              "text-2xl font-semibold tabular-nums",
              deficit ? "text-deficit" : "text-income",
            )}
          >
            {formatBalance(summary.balance)}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function Cell({
  icon: Icon,
  label,
  value,
  tone,
  current,
  previous,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
  current: number;
  previous?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className={cn("text-lg font-medium tabular-nums", tone)}>{value}</dd>
      {previous === undefined ? null : (
        <dd className="text-xs text-muted-foreground">
          <PreviousMonth current={current} previous={previous} />
        </dd>
      )}
    </div>
  );
}

/** 「先月比 +¥12,400（+7%）」。先月が 0 のときは割合を出さない */
function PreviousMonth({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const { diff, ratio } = compareAmount(current, previous);

  return (
    <span className="tabular-nums">
      先月比 {formatDiff(diff)}
      {ratio === null || diff === 0 ? null : `（${formatDiffRatio(ratio)}）`}
    </span>
  );
}
