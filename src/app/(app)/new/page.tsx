import { createTransaction } from "@/actions/transactions";
import { TransactionForm } from "@/components/transaction-form";
import { requireMember } from "@/lib/auth";
import { requestNow } from "@/lib/clock";
import { listMembers } from "@/lib/data/household";
import { listCategories } from "@/lib/data/transactions";
import { todayKey } from "@/lib/month";

export const metadata = { title: "記録する | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * 記録する（FR-T1〜T6）。**最もよく使う画面。**
 * 既定値は 支出 / 今日 / 自分（UI/UX設計 §5.2）。
 */
export default async function NewTransactionPage() {
  const me = await requireMember();
  const now = await requestNow();
  const [expense, income, members] = await Promise.all([
    listCategories("expense"),
    listCategories("income"),
    listMembers(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-6">
      <h1 className="mb-5 font-heading text-xl font-semibold tracking-tight">
        記録する
      </h1>
      <TransactionForm
        action={createTransaction}
        categories={[...expense, ...income]}
        members={members}
        initial={{
          kind: "expense",
          amount: "",
          occurredOn: todayKey(now),
          categoryId: "",
          paidById: me.profileId,
          memo: "",
        }}
        submitLabel="保存する"
        pendingLabel="保存中…"
      />
    </main>
  );
}
