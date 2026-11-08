import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatBalance,
  formatIncome,
  formatYen,
  type Summary,
} from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * 月次の合計（FR-L4）。この画面で一番見る数字なので大きく出す。
 * 支出は中立色（赤にしない。毎日のことなので一覧が警告だらけになる）。
 */
export function MonthSummary({ summary }: { summary: Summary }) {
  const deficit = summary.balance < 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-3">
          <Cell
            icon={ArrowUpRight}
            label="支出"
            value={formatYen(summary.expense)}
          />
          <Cell
            icon={ArrowDownLeft}
            label="収入"
            value={formatIncome(summary.income)}
            tone="text-income"
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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className={cn("text-lg font-medium tabular-nums", tone)}>{value}</dd>
    </div>
  );
}
