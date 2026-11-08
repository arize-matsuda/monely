import { BottomTabs } from "@/components/bottom-tabs";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { EmptyMonth } from "@/components/empty-month";
import { MonthSummary } from "@/components/month-summary";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionList } from "@/components/transaction-list";
import { requestNow } from "@/lib/clock";
import { listTransactionsByMonth } from "@/lib/data/transactions";
import { summarize } from "@/lib/money";
import { parseMonth, prevMonth } from "@/lib/month";

// セッションを読むため、サーバーでブロックして描画する。
//
// **レイアウトの instant = false だけでは足りない。** Page セグメントは
// validationLevel: 'warning'（既定）で暗黙に個別検証されるため、
// 認証後の各ページにも宣言が必要。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * ホーム（月次一覧）。アプリの中心（FR-L1〜L7）。
 *
 * 表示中の月は URL に持つ（`/?m=2026-11`）。リロードしても同じ月が開き、
 * ブラウザの戻るで前の月に戻れる。不正な値は当月として扱う（AC-7）。
 *
 * **PC では 2 カラム**（ADR-0009）。左に一覧、右に合計と内訳を置く。
 * スマホは 1 カラムで、合計 → 一覧の縦並び。
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // 現在時刻はリクエスト時に取る（src/lib/clock.ts のコメント参照）
  const now = await requestNow();
  const month = parseMonth(params.m, now);

  /*
   * 先月ぶんも取って比較に使う（FR-L9）。
   *
   * **合計だけを取る DAL 関数を足していない。** 足すと householdId の
   * 条件を書き忘れうる場所が 1 つ増える（ADR-0005 の約束 B / ADR-0009）。
   * 1 か月の件数は家族の家計簿なら数十件なので、行ごと取っても軽い。
   */
  const [rows, previousRows] = await Promise.all([
    listTransactionsByMonth(month),
    listTransactionsByMonth(prevMonth(month)),
  ]);
  const summary = summarize(rows);
  const previous = summarize(previousRows);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-4 pb-28 md:max-w-6xl md:px-8 md:pt-8 md:pb-10">
      <MonthSwitcher month={month} />

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start md:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* スマホでは合計を先に見せたいので、順序を CSS で入れ替える */}
        <div className="md:order-2 md:sticky md:top-8 md:flex md:flex-col md:gap-4">
          <MonthSummary summary={summary} previous={previous} />
          {/* 内訳は PC だけ。スマホは縦に伸びすぎる（ADR-0009） */}
          <div className="hidden md:block">
            <CategoryBreakdown rows={rows} previousRows={previousRows} />
          </div>
        </div>

        <div className="mt-6 md:order-1 md:mt-0">
          {rows.length === 0 ? (
            <EmptyMonth />
          ) : (
            <TransactionList rows={rows} today={now} />
          )}
        </div>
      </div>

      <BottomTabs />
    </main>
  );
}
