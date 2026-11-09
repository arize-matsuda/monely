import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestNow } from "@/lib/clock";
import { listBudgets } from "@/lib/data/budgets";
import { listCategories, USAGE_WINDOW_DAYS } from "@/lib/data/transactions";
import { daysAgo } from "@/lib/month";
import { BudgetForm } from "./budget-form";

export const metadata = { title: "予算 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * カテゴリごとの月予算（FR-B1 / ADR-0011）。
 *
 * **支出のカテゴリだけを対象にする。** 収入に予算を立てる動機が無い。
 * **毎月同じ額が適用される。** 月ごとに変えたい要望が出たら
 * (household_id, category_id, month) に広げる。
 */
export default async function BudgetsPage() {
  const now = await requestNow();
  const [categories, budgets] = await Promise.all([
    listCategories("expense", daysAgo(now, USAGE_WINDOW_DAYS)),
    listBudgets(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-4 pb-4 md:max-w-2xl md:px-8 md:pt-8">
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href="/settings" aria-label="設定に戻る">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          予算
        </h1>
      </div>

      <Card className="[--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>カテゴリごとの月予算</CardTitle>
          <CardDescription>
            毎月この額を基準に、ホーム画面で消化率を出します。
            空欄にすると予算なしになります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              amount: budgets.get(category.id) ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
