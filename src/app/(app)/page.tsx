import Link from "next/link";
import { EmptyMonth } from "@/components/empty-month";
import { MonthSummary } from "@/components/month-summary";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionList } from "@/components/transaction-list";
import { requestNow } from "@/lib/clock";
import { listTransactionsByMonth } from "@/lib/data/transactions";
import { summarize } from "@/lib/money";
import { parseMonth } from "@/lib/month";

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
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // 現在時刻はリクエスト時に取る（src/lib/clock.ts のコメント参照）
  const now = await requestNow();
  const month = parseMonth(params.m, now);
  const rows = await listTransactionsByMonth(month);
  const summary = summarize(rows);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-4 pb-28">
      <MonthSwitcher month={month} />

      <div className="mt-4">
        <MonthSummary summary={summary} />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyMonth />
        ) : (
          <TransactionList rows={rows} today={now} />
        )}
      </div>

      {/* M4 で下部タブに置き換える。それまでは画面下の固定ボタン */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[480px] items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href="/new"
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent text-base font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            記録する
          </Link>
          <Link
            href="/settings"
            className="flex h-12 items-center justify-center rounded-xl border border-border px-5 text-sm text-muted transition-colors hover:text-foreground"
          >
            設定
          </Link>
        </div>
      </div>
    </main>
  );
}
