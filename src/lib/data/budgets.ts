import "server-only";
import { requireMember } from "@/lib/auth";
import { type ActionResult, ok } from "@/lib/types";
import { prisma } from "./db";

/**
 * 予算の DAL（FR-B1〜B3 / ADR-0011）。
 *
 * 記録の DAL と同じ規律に従う。すべての関数が内部で `requireMember()` を
 * 呼び、`householdId` で絞る。**世帯 ID を引数で受け取らない**（約束 B）。
 * → docs/03-guidelines/security-guidelines.md §4
 */

/** カテゴリ ID → 予算額（円）。予算を設定していないカテゴリは入らない */
export type BudgetMap = Map<string, number>;

/** 自分の世帯の予算をすべて返す */
export async function listBudgets(): Promise<BudgetMap> {
  const me = await requireMember();
  const rows = await prisma.budget.findMany({
    where: { householdId: me.householdId },
    select: { categoryId: true, amount: true },
  });
  return new Map(rows.map((row) => [row.categoryId, row.amount]));
}

/**
 * 予算をまとめて設定する（FR-B1）。
 *
 * **0 円は「予算なし」として行を消す。** 別に削除の操作を用意すると
 * 画面にボタンが増える。空欄か 0 を入れれば消える、で足りる。
 *
 * 他世帯のカテゴリ ID を渡されても、**存在しない組み合わせとして
 * 何も起きない**（`categoryId` の所属を先に確認する）。
 */
export async function setBudgetsForMe(
  entries: readonly { categoryId: string; amount: number }[],
): Promise<ActionResult> {
  const me = await requireMember();

  // 自分の世帯のカテゴリだけに絞る。外部キーだけでは他世帯の ID を防げない
  // → docs/03-guidelines/security-guidelines.md §5
  const owned = await prisma.category.findMany({
    where: {
      householdId: me.householdId,
      id: { in: entries.map((entry) => entry.categoryId) },
    },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((category) => category.id));

  const toUpsert = entries.filter(
    (entry) => ownedIds.has(entry.categoryId) && entry.amount > 0,
  );
  const toDelete = entries.filter(
    (entry) => ownedIds.has(entry.categoryId) && entry.amount <= 0,
  );

  await prisma.$transaction([
    ...toUpsert.map((entry) =>
      prisma.budget.upsert({
        where: {
          householdId_categoryId: {
            householdId: me.householdId,
            categoryId: entry.categoryId,
          },
        },
        create: {
          householdId: me.householdId,
          categoryId: entry.categoryId,
          amount: entry.amount,
        },
        update: { amount: entry.amount },
      }),
    ),
    // 0 円 / 空欄は行を消す
    prisma.budget.deleteMany({
      where: {
        householdId: me.householdId,
        categoryId: { in: toDelete.map((entry) => entry.categoryId) },
      },
    }),
  ]);

  return ok();
}
