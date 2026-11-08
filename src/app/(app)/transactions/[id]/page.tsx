import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { updateTransaction } from "@/actions/transactions";
import { DeleteTransaction } from "@/components/delete-transaction";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FormPageHeader } from "@/components/ui/form-page-header";
import { listMembers } from "@/lib/data/household";
import { getTransaction, listCategories } from "@/lib/data/transactions";
import { toDateKey } from "@/lib/month";

export const metadata = { title: "記録の編集 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * 記録の編集・削除（FR-T7, FR-T8）。
 *
 * **他世帯の記録や存在しない ID は「見つかりませんでした」**。
 * 権限不足と区別しない（ID の存在を漏らさない）。認可は DAL が行う。
 */
export default async function EditTransactionPage({
  params,
}: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  const [transaction, members] = await Promise.all([
    getTransaction(id),
    listMembers(),
  ]);

  if (!transaction) {
    return (
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX aria-hidden />
            </EmptyMedia>
            <EmptyTitle>見つかりませんでした</EmptyTitle>
            <EmptyDescription>
              この記録は削除されたか、表示する権限がありません。
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft aria-hidden />
                ホームに戻る
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  const [expense, income] = await Promise.all([
    listCategories("expense"),
    listCategories("income"),
  ]);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-6">
      <FormPageHeader title="記録の編集" />
      <TransactionForm
        action={updateTransaction}
        categories={[...expense, ...income]}
        members={members}
        initial={{
          id: transaction.id,
          kind: transaction.kind,
          amount: String(transaction.amount),
          occurredOn: toDateKey(transaction.occurredOn),
          categoryId: transaction.categoryId ?? "",
          paidById: transaction.paidById ?? "",
          memo: transaction.memo ?? "",
        }}
        submitLabel="更新する"
        pendingLabel="更新中…"
        footer={<DeleteTransaction id={transaction.id} />}
      />
    </main>
  );
}
