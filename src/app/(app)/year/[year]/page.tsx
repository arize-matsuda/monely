import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BottomTabs } from "@/components/bottom-tabs";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { Button } from "@/components/ui/button";
import { YearOverview } from "@/components/year-overview";
import { requestNow } from "@/lib/clock";
import { listTransactionsByYear } from "@/lib/data/transactions";
import { parseYear } from "@/lib/month";
import { summarizeYear } from "@/lib/year-summary";

export const metadata = { title: "年の一覧 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * 年のページ（FR-L10 / ADR-0010）。
 *
 * **月どうしを比べるための画面。** 12 か月の支出を棒で並べ、
 * 各行からその月のホームへ飛べる。
 *
 * 不正な年（`/year/abc`）は今年として扱う（`?m=abc` と同じ方針。AC-7）。
 */
export default async function YearPage({ params }: PageProps<"/year/[year]">) {
  const { year: raw } = await params;
  const now = await requestNow();
  const year = parseYear(raw, now);

  const rows = await listTransactionsByYear(year);
  const summary = summarizeYear(year, rows);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-4 pb-28 md:max-w-6xl md:px-8 md:pt-8 md:pb-10">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/year/${year - 1}`} aria-label="前の年へ">
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <h1 className="font-heading text-lg font-semibold tracking-tight tabular-nums">
          {year}年
        </h1>
        <Button asChild variant="ghost" size="icon">
          <Link href={`/year/${year + 1}`} aria-label="次の年へ">
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start md:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="md:order-1">
          <YearOverview summary={summary} />
        </div>

        {/* 年間のカテゴリ別内訳。PC だけ（スマホは縦に伸びすぎる。ADR-0009） */}
        <div className="hidden md:order-2 md:sticky md:top-8 md:block">
          <CategoryBreakdown rows={rows} />
        </div>
      </div>

      <BottomTabs />
    </main>
  );
}
