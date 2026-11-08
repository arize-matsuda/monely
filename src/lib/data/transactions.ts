import "server-only";
import { requireMember } from "@/lib/auth";
import { type Month, monthRange, yearRange } from "@/lib/month";
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

/**
 * 年のページ用（FR-L10）。その年の記録をすべて返す。
 *
 * **集計は SQL で行わない。** 月別の合計は `summarizeYear`（純関数）が
 * 担う。集計用のクエリを足すと `householdId` の条件を書き忘れうる場所が
 * 1 つ増える（ADR-0005 の約束 B / ADR-0010）。
 * 家族の家計簿なら 1 年で数百件なので、行ごと取っても軽い。
 */
export async function listTransactionsByYear(year: number) {
  const me = await requireMember();
  const { start, nextStart } = yearRange(year);
  return prisma.transaction.findMany({
    where: {
      householdId: me.householdId,
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

/** カテゴリの並び替えに使う集計期間（UI/UX設計 §5.3） */
export const USAGE_WINDOW_DAYS = 30;

/**
 * 新規登録の選択肢（FR-C1, FR-C6, FR-C7）。非表示のカテゴリは出さない。
 *
 * **並びは「直近 30 日でその世帯が使った回数の多い順」**、同数なら
 * `sortOrder` → 名前（UI/UX設計 §5.3）。使うカテゴリは偏るので、
 * 固定順より 1 タップで届く確率が上がる。
 *
 * @param usageSince 集計期間の下限。`daysAgo(await requestNow(), USAGE_WINDOW_DAYS)`
 *   を渡す。**既定値を持たせない**（時計の読み忘れを型で防ぐ。coding-standards §8.0）
 */
export async function listCategories(kind: Kind, usageSince: Date) {
  const me = await requireMember();

  const [categories, usage] = await Promise.all([
    prisma.category.findMany({
      where: { householdId: me.householdId, kind, archived: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true, sortOrder: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      // householdId の条件を落とすと他世帯の使用回数で並びが変わる
      where: {
        householdId: me.householdId,
        kind,
        occurredOn: { gte: usageSince },
        categoryId: { not: null },
      },
      _count: { categoryId: true },
    }),
  ]);

  const countOf = new Map(
    usage.map((row) => [row.categoryId, row._count.categoryId]),
  );

  // findMany の orderBy で sortOrder → name の順になっているので、
  // 回数だけで安定ソートすれば同数の並びはそのまま保たれる
  return categories
    .map((category) => ({
      ...category,
      recentCount: countOf.get(category.id) ?? 0,
    }))
    .sort((x, y) => y.recentCount - x.recentCount);
}

/**
 * 定期支出をまとめて作る（FR-R2）。
 *
 * **`createMany` を使う。** 1 件ずつ作ると件数ぶんの往復になる。
 * `householdId` と `createdById` は me から埋める（約束 B）。
 *
 * 参照先（categoryId / paidById）の所属は、**呼び出し側が先月の
 * 自分の世帯の記録から作った値**なので改めて確認しない。
 * 外から渡される経路が無い（Server Action は ID を受け取らない）。
 */
export async function createRecurringForMe(
  entries: readonly {
    kind: Kind;
    amount: number;
    occurredOn: Date;
    categoryId: string | null;
    paidById: string | null;
    memo: string | null;
  }[],
): Promise<ActionResult<{ count: number }>> {
  const me = await requireMember();
  if (entries.length === 0) return ok({ count: 0 });

  const result = await prisma.transaction.createMany({
    data: entries.map((entry) => ({
      householdId: me.householdId, // ← クライアントから受け取らない
      createdById: me.profileId, // ← 同上
      kind: entry.kind,
      amount: entry.amount,
      occurredOn: entry.occurredOn,
      categoryId: entry.categoryId,
      paidById: entry.paidById,
      memo: entry.memo,
      // 写した記録にも印を付ける。翌月も候補に出るようにする
      recurring: true,
    })),
  });

  return ok({ count: result.count });
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
  /** 毎月くり返す支出の印（FR-R1） */
  recurring: boolean;
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
      recurring: input.recurring,
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
      recurring: input.recurring,
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
