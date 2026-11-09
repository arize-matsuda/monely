import { ArrowLeft, ChartPie } from "lucide-react";
import Link from "next/link";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionList } from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { budgetUsage } from "@/lib/budget-usage";
import { breakdownByCategory } from "@/lib/category-breakdown";
import { requestNow } from "@/lib/clock";
import { listBudgets } from "@/lib/data/budgets";
import { listTransactionsByMonth } from "@/lib/data/transactions";
import { formatYen } from "@/lib/money";
import { formatMonth, parseMonth, prevMonth } from "@/lib/month";

export const metadata = { title: "カテゴリ別の内訳 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * カテゴリ別の内訳（FR-L8, FR-L13 / ADR-0012）。
 *
 * **ホームの右カラムは PC だけだった**ので、スマホでも見られる専用画面にした。
 * ADR-0009 で「必要になったら別画面として足す」と保留していたもの。
 *
 * `?c=<カテゴリID>` を付けると、**その月のそのカテゴリの記録だけ**を出す
 * （FR-L13）。「内訳を見る → 何に使ったか確かめる」を 1 タップで繋ぐ。
 *
 * **DB のクエリは増やしていない。** 絞り込みは取得済みの行から行う
 * （ADR-0005 の約束 B / ADR-0009 §4）。
 */
export default async function BreakdownPage({
  searchParams,
}: PageProps<"/breakdown">) {
  const params = await searchParams;
  const now = await requestNow();
  const month = parseMonth(params.m, now);

  const [rows, previousRows, budgets] = await Promise.all([
    listTransactionsByMonth(month),
    listTransactionsByMonth(prevMonth(month)),
    listBudgets(),
  ]);

  const shares = breakdownByCategory(rows, previousRows);

  /*
   * 絞り込み対象。**URL は書き換えられる**ので、その月に実在する
   * カテゴリだけを受け付ける。他世帯の ID を入れられても
   * `shares` に無いので一致しない（行は DAL が世帯で絞っている）。
   */
  const requested = typeof params.c === "string" ? params.c : null;
  const selected =
    requested === null
      ? null
      : (shares.find((share) => share.categoryId === requested) ?? null);

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-4 pb-4 md:max-w-3xl md:px-8 md:pt-8 md:pb-10">
      <MonthSwitcher month={month} basePath="/breakdown" linkToYear={false} />

      {selected === null ? (
        <div className="mt-4 md:mt-6">
          {shares.length === 0 ? (
            <Empty className="rounded-xl border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartPie aria-hidden />
                </EmptyMedia>
                <EmptyTitle>
                  {formatMonth(month)}の支出はまだありません
                </EmptyTitle>
                <EmptyDescription>
                  記録を入れると、カテゴリごとの内訳が出ます。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <CategoryBreakdown
              rows={rows}
              previousRows={previousRows}
              budgets={budgets}
              hrefFor={(categoryId) =>
                `/breakdown?m=${month}${categoryId === null ? "" : `&c=${categoryId}`}`
              }
            />
          )}
        </div>
      ) : (
        <SelectedCategory
          month={month}
          name={selected.name}
          total={selected.total}
          count={
            rows.filter(
              (row) =>
                row.kind === "expense" &&
                row.categoryId === selected.categoryId,
            ).length
          }
          budget={budgetUsage(budgets, selected.categoryId, selected.total)}
          rows={rows.filter(
            (row) =>
              row.kind === "expense" && row.categoryId === selected.categoryId,
          )}
          today={now}
        />
      )}
    </main>
  );
}

/** 1 カテゴリに絞った表示（FR-L13） */
function SelectedCategory({
  month,
  name,
  total,
  count,
  budget,
  rows,
  today,
}: {
  month: string;
  name: string;
  total: number;
  count: number;
  budget: ReturnType<typeof budgetUsage>;
  rows: Awaited<ReturnType<typeof listTransactionsByMonth>>;
  today: Date;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4 md:mt-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href={`/breakdown?m=${month}`}>
          <ArrowLeft aria-hidden />
          内訳に戻る
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>
            {formatMonth(month)}・{count} 件
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-2xl font-semibold tabular-nums text-deficit">
            {formatYen(total)}
          </p>
          {budget === null ? null : (
            <p className="text-xs text-muted-foreground tabular-nums">
              予算 {formatYen(budget.budget)} の{Math.round(budget.ratio * 100)}
              %
              {budget.over ? (
                <span className="ml-1 font-medium text-destructive">
                  {formatYen(-budget.remaining)} 超過
                </span>
              ) : (
                <span className="ml-1">残り {formatYen(budget.remaining)}</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <TransactionList rows={rows} today={today} />
    </div>
  );
}
