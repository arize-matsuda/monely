import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatMonth,
  type Month,
  nextMonth,
  prevMonth,
  yearOf,
} from "@/lib/month";

/**
 * 月の移動（FR-L3）。
 * 表示中の月を URL に持つのでリロードしても戻るでも同じ月が開く。
 * 未来の月にも移動できる（先に予定の支出を入れたい場合があるため）。
 */
export function MonthSwitcher({ month }: { month: Month }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button asChild variant="ghost" size="icon">
        <Link href={`/?m=${prevMonth(month)}`} aria-label="前の月へ">
          <ChevronLeft aria-hidden />
        </Link>
      </Button>

      {/* 見出しから年のページへ。月を見ていて「他の月と比べたい」と
          思ったときの導線（ADR-0010） */}
      <h1 className="font-heading text-lg font-semibold tracking-tight tabular-nums">
        <Link
          href={`/year/${yearOf(month)}`}
          className="rounded-lg px-1 outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {formatMonth(month)}
        </Link>
      </h1>

      <Button asChild variant="ghost" size="icon">
        <Link href={`/?m=${nextMonth(month)}`} aria-label="次の月へ">
          <ChevronRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
