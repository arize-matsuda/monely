import {
  formatBalance,
  formatIncome,
  formatYen,
  type Summary,
} from "@/lib/money";

/**
 * 月次の合計（FR-L4）。この画面で一番見る数字なので大きく出す。
 * 支出は中立色（赤にしない。毎日のことなので一覧が警告だらけになる）。
 */
export function MonthSummary({ summary }: { summary: Summary }) {
  return (
    <dl className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <Line label="支出" value={formatYen(summary.expense)} />
      <Line
        label="収入"
        value={formatIncome(summary.income)}
        className="text-income"
      />
      <div className="mt-1 border-t border-border pt-2">
        <Line
          label="差額"
          value={formatBalance(summary.balance)}
          className={summary.balance < 0 ? "text-danger" : "text-income"}
          emphasis
        />
      </div>
    </dl>
  );
}

function Line({
  label,
  value,
  className,
  emphasis,
}: {
  label: string;
  value: string;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={`tabular-nums ${emphasis ? "text-xl font-semibold" : "text-lg"} ${className ?? ""}`.trim()}
      >
        {value}
      </dd>
    </div>
  );
}
