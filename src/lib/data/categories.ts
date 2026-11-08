import "server-only";
import { requireMember } from "@/lib/auth";
import { type ActionResult, fail, type Kind, ok } from "@/lib/types";
import { prisma } from "./db";

/**
 * カテゴリ管理の DAL（FR-C3〜C5）。
 *
 * 記録の DAL（`transactions.ts`）と同じ規律に従う。
 * すべての関数が内部で `requireMember()` を呼び、`householdId` で絞る。
 * **世帯 ID を引数で受け取らない**（ADR-0005 約束 B）。
 * 更新は `updateMany` を使い、`count === 0` を `NOT_FOUND` にする。
 * → docs/03-guidelines/security-guidelines.md §4
 */

/** 新しいカテゴリを「その他」（999）の手前に入れるための間隔 */
const SORT_ORDER_STEP = 10;
/** 「その他」の固定位置。これより手前に新しいものを置く */
const TRAILING_SORT_ORDER = 999;

/** Prisma の一意制約違反（同じ世帯・種別に同名が既にある） */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

const DUPLICATE_MESSAGE = "同じ名前のカテゴリが既にあります";

/**
 * 管理画面の一覧。**非表示のものも含めて全部返す**（FR-C5 の操作対象）。
 *
 * 記録の件数も返す。非表示にしてよいか判断する材料になる
 * （過去の記録では名前が残るので、件数があっても非表示にして構わない）。
 */
export async function listCategoriesForManagement() {
  const me = await requireMember();
  return prisma.category.findMany({
    where: { householdId: me.householdId },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      kind: true,
      name: true,
      sortOrder: true,
      archived: true,
      _count: { select: { transactions: true } },
    },
  });
}

/** カテゴリを追加する（FR-C3） */
export async function createCategoryForMe(input: {
  kind: Kind;
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  const me = await requireMember();

  // 「その他」の手前に置く。_max は自分の世帯・種別だけを見る
  const highest = await prisma.category.aggregate({
    where: {
      householdId: me.householdId,
      kind: input.kind,
      sortOrder: { lt: TRAILING_SORT_ORDER },
    },
    _max: { sortOrder: true },
  });
  const sortOrder = (highest._max.sortOrder ?? 0) + SORT_ORDER_STEP;

  try {
    const created = await prisma.category.create({
      data: {
        householdId: me.householdId,
        kind: input.kind,
        name: input.name,
        sortOrder: Math.min(sortOrder, TRAILING_SORT_ORDER - 1),
      },
      select: { id: true },
    });
    return ok(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("VALIDATION", DUPLICATE_MESSAGE, "name");
    }
    throw error;
  }
}

/** 名称を変更する（FR-C4） */
export async function renameCategoryForMe(
  id: string,
  name: string,
): Promise<ActionResult> {
  const me = await requireMember();
  try {
    const result = await prisma.category.updateMany({
      where: { id, householdId: me.householdId },
      data: { name },
    });
    if (result.count === 0) {
      return fail("NOT_FOUND", "見つかりませんでした");
    }
    return ok();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("VALIDATION", DUPLICATE_MESSAGE, "name");
    }
    throw error;
  }
}

/**
 * 非表示にする / 戻す（FR-C5）。**削除はしない。**
 * 削除すると過去の記録のカテゴリが消えてしまう（FR-C6）。
 */
export async function setCategoryArchivedForMe(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const me = await requireMember();
  const result = await prisma.category.updateMany({
    where: { id, householdId: me.householdId },
    data: { archived },
  });
  if (result.count === 0) {
    return fail("NOT_FOUND", "見つかりませんでした");
  }
  return ok();
}
