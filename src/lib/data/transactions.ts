import "server-only";
import { requireMember } from "@/lib/auth";
import { type Month, monthRange } from "@/lib/month";
import { type ActionResult, fail, type Kind, ok } from "@/lib/types";
import { prisma } from "./db";

/**
 * 記録の DAL。**認可の本体。**
 *
 * すべての関数が内部で `requireMember()` を呼び、`householdId` で絞る。
 * **世帯 ID を引数で受け取らない**（ADR-0005 約束 B）。
 * 呼び出し側が他世帯の ID を渡せる経路を作らないため。
 *
 * 更新・削除は `update` / `delete` ではなく `updateMany` / `deleteMany` を使う。
 * `update({ where: { id } })` は世帯の条件を付けられず、他世帯の記録を
 * 書き換えられてしまう。
 *
 * 関数を足したら、同じコミットで認可テストも足す（約束 C）。
 * → docs/03-guidelines/security-guidelines.md §4
 */

const LIST_INCLUDE = {
  category: { select: { name: true } },
  paidBy: { select: { displayName: true } },
} as const;

export type TransactionRow = Awaited<
  ReturnType<typeof listTransactionsByMonth>
>[number];

/** 月次一覧（FR-L1, FR-L2） */
export async function listTransactionsByMonth(month: Month) {
  const me = await requireMember();
  const { start, nextStart } = monthRange(month);

  return prisma.transaction.findMany({
    where: {
      householdId: me.householdId, // ← 認可。絶対に外さない
      occurredOn: { gte: start, lt: nextStart },
    },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    include: LIST_INCLUDE,
  });
}

/** 記録を 1 件取る。自分の世帯のものでなければ null（FR-T7） */
export async function getTransaction(id: string) {
  const me = await requireMember();
  return prisma.transaction.findFirst({
    where: { id, householdId: me.householdId },
    include: LIST_INCLUDE,
  });
}

/** 新規登録の選択肢（FR-C1, FR-C6）。非表示のカテゴリは出さない */
export async function listCategories(kind: Kind) {
  const me = await requireMember();
  return prisma.category.findMany({
    where: { householdId: me.householdId, kind, archived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true, sortOrder: true },
  });
}

export type TransactionInput = {
  kind: Kind;
  /** 円の正の整数 */
  amount: number;
  /** UTC 0 時の Date（@db.Date と揃える） */
  occurredOn: Date;
  categoryId: string | null;
  paidById: string | null;
  memo: string | null;
};

/**
 * 参照先が自分の世帯のものか確認する。
 *
 * **外部キーでは防げない。** 他世帯の ID でも行は存在するため、
 * `categoryId` / `paidById` に他世帯の値を入れられてしまう。
 * → docs/03-guidelines/security-guidelines.md §4.4
 */
async function validateReferences(
  input: Pick<TransactionInput, "kind" | "categoryId" | "paidById">,
  householdId: string,
): Promise<ActionResult> {
  if (input.categoryId !== null) {
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        householdId,
        kind: input.kind, // 種別が一致すること（支出に収入カテゴリを付けない）
        archived: false,
      },
      select: { id: true },
    });
    if (!category) {
      return fail("VALIDATION", "選択できないカテゴリです", "categoryId");
    }
  }

  if (input.paidById !== null) {
    const profile = await prisma.profile.findFirst({
      where: { id: input.paidById, householdId },
      select: { id: true },
    });
    if (!profile) {
      return fail("VALIDATION", "選択できないメンバーです", "paidById");
    }
  }

  return ok();
}

/** 記録を作る（FR-T1）。householdId と createdById は me から埋める（BR-5, BR-6） */
export async function createTransactionForMe(
  input: TransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireMember();

  const references = await validateReferences(input, me.householdId);
  if (!references.ok) return references;

  const created = await prisma.transaction.create({
    data: {
      householdId: me.householdId, // ← クライアントの値を使わない
      createdById: me.profileId, // ← 同上
      kind: input.kind,
      amount: input.amount,
      occurredOn: input.occurredOn,
      categoryId: input.categoryId,
      paidById: input.paidById,
      memo: input.memo,
    },
    select: { id: true },
  });

  return ok({ id: created.id });
}

/**
 * 記録を更新する（FR-T7）。同じ世帯なら他メンバーの記録も編集できる（BR-3）。
 * `householdId` と `createdById` は更新しない。
 */
export async function updateTransactionForMe(
  id: string,
  input: TransactionInput,
): Promise<ActionResult> {
  const me = await requireMember();

  const references = await validateReferences(input, me.householdId);
  if (!references.ok) return references;

  const result = await prisma.transaction.updateMany({
    where: { id, householdId: me.householdId }, // ← 世帯の条件が要
    data: {
      kind: input.kind,
      amount: input.amount,
      occurredOn: input.occurredOn,
      categoryId: input.categoryId,
      paidById: input.paidById,
      memo: input.memo,
    },
  });

  // 0 行なら、存在しないか他世帯のもの。どちらも NOT_FOUND（存在を漏らさない）
  if (result.count === 0) {
    return fail("NOT_FOUND", "見つかりませんでした");
  }
  return ok();
}

/** 記録を削除する（FR-T8） */
export async function deleteTransactionForMe(
  id: string,
): Promise<ActionResult> {
  const me = await requireMember();
  const result = await prisma.transaction.deleteMany({
    where: { id, householdId: me.householdId },
  });
  if (result.count === 0) {
    return fail("NOT_FOUND", "見つかりませんでした");
  }
  return ok();
}
