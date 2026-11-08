import { createTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/transaction-form";
import { FormPageHeader } from "@/components/ui/form-page-header";
import { requireMember } from "@/lib/auth";
import { requestNow } from "@/lib/clock";
import { listMembers } from "@/lib/data/household";
import { listCategories, USAGE_WINDOW_DAYS } from "@/lib/data/transactions";
import { dateShortcuts, daysAgo, todayKey } from "@/lib/month";
import { parsePrefill } from "@/lib/prefill";

export const metadata = { title: "記録する | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * 記録する（FR-T1〜T6）。**最もよく使う画面。**
 * 既定値は 支出 / 今日 / 自分（UI/UX設計 §5.2）。
 *
 * `?amount=&category=&paidBy=&memo=&kind=` で初期値を受け取る（FR-T11）。
 * 記録の複製と「記録忘れ」からの導線で使う。
 * **URL は書き換えられるので、選択肢に無い ID は捨てる**（`parsePrefill`）。
 * 保存の可否は Server Action と DAL が判断する。
 */
export default async function NewTransactionPage({
  searchParams,
}: PageProps<"/new">) {
  const me = await requireMember();
  const now = await requestNow();
  const params = await searchParams;
  // カテゴリは直近 30 日の使用頻度順に出す（UI/UX設計 §5.3）
  const usageSince = daysAgo(now, USAGE_WINDOW_DAYS);
  const [expense, income, members] = await Promise.all([
    listCategories("expense", usageSince),
    listCategories("income", usageSince),
    listMembers(),
  ]);

  const categories = [...expense, ...income];
  const prefill = parsePrefill({
    params,
    categoryIds: categories.map((category) => category.id),
    memberIds: members.map((member) => member.id),
    defaultPaidById: me.profileId,
  });

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-6 md:py-10">
      <FormPageHeader title="記録する" />
      <TransactionForm
        action={createTransaction}
        categories={categories}
        members={members}
        initial={{
          ...prefill,
          // 日付は常に今日。複製でも引き継がない（FR-T3）
          occurredOn: todayKey(now),
          // 新規は既定で off。複製元が定期でも、押したのは「今月分を 1 件」
          recurring: false,
        }}
        dateShortcuts={dateShortcuts(now)}
        submitLabel="保存する"
        pendingLabel="保存中…"
      />
    </main>
  );
}
