"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTransactionForMe,
  deleteTransactionForMe,
  type TransactionInput,
  updateTransactionForMe,
} from "@/lib/data/transactions";
import { monthOf } from "@/lib/month";
import { type ActionResult, failUnexpected } from "@/lib/types";
import {
  parseAmount,
  parseKind,
  parseOccurredOn,
  parseOptionalId,
  parseOptionalText,
} from "@/lib/validation";

/**
 * 記録の登録・更新・削除（FR-T1〜T8）。
 *
 * **認証と世帯の確認は DAL の requireMember() が行う。**
 * householdId / createdById はクライアントから受け取らない（BR-5, BR-6）。
 * 参照先（categoryId / paidById）の所属確認も DAL が行う。
 * → docs/03-guidelines/security-guidelines.md §5
 */

/** フォームの共通項目を検証する */
function parseInput(formData: FormData): ActionResult<TransactionInput> {
  const kind = parseKind(formData.get("kind"));
  if (!kind.ok) return kind;

  const amount = parseAmount(formData.get("amount"));
  if (!amount.ok) return amount;

  const occurredOn = parseOccurredOn(formData.get("occurredOn"));
  if (!occurredOn.ok) return occurredOn;

  const categoryId = parseOptionalId(formData.get("categoryId"), "categoryId");
  if (!categoryId.ok) return categoryId;

  const paidById = parseOptionalId(formData.get("paidById"), "paidById");
  if (!paidById.ok) return paidById;

  const memo = parseOptionalText(formData.get("memo"), {
    field: "memo",
    label: "メモ",
    max: 200,
  });
  if (!memo.ok) return memo;

  return {
    ok: true,
    data: {
      kind: kind.data,
      amount: amount.data,
      occurredOn: occurredOn.data,
      categoryId: categoryId.data,
      paidById: paidById.data,
      memo: memo.data,
      // チェックボックスは未チェックだと何も送られない（FR-R1）
      recurring: formData.get("recurring") === "on",
    },
  };
}

export async function createTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseInput(formData);
  if (!parsed.ok) return parsed;

  let result: ActionResult<{ id: string }>;
  try {
    result = await createTransactionForMe(parsed.data);
  } catch (error) {
    return failUnexpected("createTransaction", error);
  }
  if (!result.ok) return result;

  // 登録した記録が見える月に戻る（未来や過去の日付を入れた場合も迷わない）
  redirect(`/?m=${monthOf(parsed.data.occurredOn)}`);
}

export async function updateTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = parseOptionalId(formData.get("id"), "id");
  if (!id.ok) return id;
  if (id.data === null) {
    return failUnexpected("updateTransaction", new Error("id がない"));
  }

  const parsed = parseInput(formData);
  if (!parsed.ok) return parsed;

  let result: ActionResult;
  try {
    result = await updateTransactionForMe(id.data, parsed.data);
  } catch (error) {
    return failUnexpected("updateTransaction", error);
  }
  if (!result.ok) return result;

  redirect(`/?m=${monthOf(parsed.data.occurredOn)}`);
}

export async function deleteTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = parseOptionalId(formData.get("id"), "id");
  if (!id.ok) return id;
  if (id.data === null) {
    return failUnexpected("deleteTransaction", new Error("id がない"));
  }

  let result: ActionResult;
  try {
    result = await deleteTransactionForMe(id.data);
  } catch (error) {
    return failUnexpected("deleteTransaction", error);
  }
  if (!result.ok) return result;

  refresh();
  redirect("/");
}
