"use server";

import { refresh } from "next/cache";
import { setBudgetsForMe } from "@/lib/data/budgets";
import { type ActionResult, fail, failUnexpected } from "@/lib/types";
import { MAX_AMOUNT, normalizeDigits } from "@/lib/validation";

/**
 * 予算の設定（FR-B1）。
 *
 * **認証と世帯の確認は DAL の requireMember() が行う。**
 * 他世帯のカテゴリ ID を送られても DAL が所属を確認して無視する。
 * → docs/03-guidelines/security-guidelines.md §5
 *
 * フォームは `budget-<categoryId>` という名前で全カテゴリ分を送る。
 * 1 件ずつ保存させると、13 カテゴリで 13 回の送信になる。
 */

const FIELD_PREFIX = "budget-";

/**
 * 予算の 1 件を読む。**空欄は 0（予算なし）として扱う。**
 * 数字以外は入力ミスなので、保存せずエラーにする。
 */
function parseBudgetAmount(value: FormDataEntryValue | null): number | null {
  const raw = normalizeDigits(typeof value === "string" ? value : "")
    .trim()
    .replace(/,/g, "");
  if (raw.length === 0) return 0;
  if (!/^\d+$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_AMOUNT) {
    return null;
  }
  return amount;
}

export async function setBudgets(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const entries: { categoryId: string; amount: number }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(FIELD_PREFIX)) continue;
    const categoryId = key.slice(FIELD_PREFIX.length);
    if (categoryId.length === 0 || categoryId.length > 64) continue;

    const amount = parseBudgetAmount(value);
    if (amount === null) {
      return fail(
        "VALIDATION",
        "予算は数字で入力してください（空欄にすると予算なしになります）",
        key,
      );
    }
    entries.push({ categoryId, amount });
  }

  let result: ActionResult;
  try {
    result = await setBudgetsForMe(entries);
  } catch (error) {
    return failUnexpected("setBudgets", error);
  }
  if (!result.ok) return result;

  refresh();
  return result;
}
