import Link from "next/link";
import { formatMonth, type Month, nextMonth, prevMonth } from "@/lib/month";

/**
 * 月の移動（FR-L3）。
 * 表示中の月を URL に持つのでリロードしても戻るでも同じ月が開く。
 * 未来の月にも移動できる（先に予定の支出を入れたい場合があるため）。
 */
export function MonthSwitcher({ month }: { month: Month }) {
  return (
    <div className="flex items-center justify-between">
      <MonthLink month={prevMonth(month)} label="前の月へ">
        ‹
      </MonthLink>
      <h1 className="text-lg font-semibold tracking-tight tabular-nums">
        {formatMonth(month)}
      </h1>
      <MonthLink month={nextMonth(month)} label="次の月へ">
        ›
      </MonthLink>
    </div>
  );
}

function MonthLink({
  month,
  label,
  children,
}: {
  month: Month;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/?m=${month}`}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-lg text-2xl text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      {children}
    </Link>
  );
}
