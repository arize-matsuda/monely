import { isMonth } from "./month";
import type { Kind } from "./types";
import { MAX_AMOUNT, normalizeDigits } from "./validation";

/**
 * `/new?...` の初期値（FR-T11 / ADR-0011）。
 *
 * **URL は利用者が自由に書き換えられる。** ここは「画面に何を初期表示するか」
 * だけを決める層で、保存の可否は Server Action と DAL が判断する。
 * 他世帯のカテゴリ ID を URL に入れられても、保存時に DAL が弾く
 * （ADR-0005 約束 B）。それでも**存在しない ID を選択済みに見せない**ため、
 * 選択肢に無い ID はここで捨てる。
 */

export type Prefill = {
  kind: Kind;
  amount: string;
  categoryId: string;
  paidById: string;
  memo: string;
};

type Options = {
  /** `searchParams` の生の値 */
  params: Record<string, string | string[] | undefined>;
  /** 選択肢にあるカテゴリの ID。ここに無い値は捨てる */
  categoryIds: readonly string[];
  /** 選択肢にあるメンバーの ID。ここに無い値は捨てる */
  memberIds: readonly string[];
  /** 既定の支払者（自分） */
  defaultPaidById: string;
};

/** `?a=1&a=2` のような配列は先頭だけ見る */
function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** 金額。数字以外と上限超えは捨てる（保存時の検証とは別物） */
function parseAmountParam(value: string): string {
  const digits = normalizeDigits(value).trim().replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return "";
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return "";
  }
  return String(amount);
}

export function parsePrefill(options: Options): Prefill {
  const { params, categoryIds, memberIds, defaultPaidById } = options;

  const kindParam = one(params.kind);
  const kind: Kind = kindParam === "income" ? "income" : "expense";

  const categoryId = one(params.category);
  const paidById = one(params.paidBy);
  const memo = one(params.memo).trim();

  return {
    kind,
    amount: parseAmountParam(one(params.amount)),
    categoryId: categoryIds.includes(categoryId) ? categoryId : "",
    paidById: memberIds.includes(paidById) ? paidById : defaultPaidById,
    // 保存時に 200 文字で弾かれるので、ここでも切る（弾くのではなく切る）
    memo: memo.slice(0, 200),
  };
}

/**
 * 記録を複製するためのリンク先。
 *
 * **日付は引き継がない。** 複製の用途は「毎月同じものを今月も入れる」
 * なので、日付は常に今日が正しい。
 */
export function duplicateHref(transaction: {
  kind: Kind;
  amount: number;
  categoryId: string | null;
  paidById: string | null;
  memo: string | null;
}): string {
  const params = new URLSearchParams({
    kind: transaction.kind,
    amount: String(transaction.amount),
  });
  if (transaction.categoryId) params.set("category", transaction.categoryId);
  if (transaction.paidById) params.set("paidBy", transaction.paidById);
  if (transaction.memo) params.set("memo", transaction.memo);
  return `/new?${params.toString()}`;
}

/** 月が「今月」かどうか。過去の月に「まだ記録がありません」を出さないため */
export function isCurrentMonth(month: string, currentMonthValue: string) {
  return isMonth(month) && month === currentMonthValue;
}
