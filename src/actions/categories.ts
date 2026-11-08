"use server";

import { refresh } from "next/cache";
import {
  createCategoryForMe,
  renameCategoryForMe,
  setCategoryArchivedForMe,
} from "@/lib/data/categories";
import { type ActionResult, failUnexpected } from "@/lib/types";
import {
  MAX_CATEGORY_NAME,
  parseKind,
  parseOptionalId,
  parseText,
} from "@/lib/validation";

/**
 * カテゴリの追加・改名・非表示（FR-C3〜C5）。
 *
 * **認証と世帯の確認は DAL の requireMember() が行う。**
 * householdId はクライアントから受け取らない。
 * 操作対象の ID が他世帯のものなら DAL が NOT_FOUND を返す。
 * → docs/03-guidelines/security-guidelines.md §5
 */

function parseName(formData: FormData) {
  return parseText(formData.get("name"), {
    field: "name",
    label: "カテゴリ名",
    min: 1,
    max: MAX_CATEGORY_NAME,
  });
}

/** 操作対象の ID。無ければ想定外（画面が hidden で必ず送る） */
function parseId(formData: FormData, context: string) {
  const id = parseOptionalId(formData.get("id"), "id");
  if (!id.ok) return id;
  if (id.data === null) {
    return failUnexpected(context, new Error("id がない"));
  }
  return { ok: true as const, data: id.data };
}

export async function createCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const kind = parseKind(formData.get("kind"));
  if (!kind.ok) return kind;

  const name = parseName(formData);
  if (!name.ok) return name;

  let result: ActionResult<{ id: string }>;
  try {
    result = await createCategoryForMe({ kind: kind.data, name: name.data });
  } catch (error) {
    return failUnexpected("createCategory", error);
  }
  if (!result.ok) return result;

  refresh();
  return { ok: true, data: undefined };
}

export async function renameCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = parseId(formData, "renameCategory");
  if (!id.ok) return id;

  const name = parseName(formData);
  if (!name.ok) return name;

  let result: ActionResult;
  try {
    result = await renameCategoryForMe(id.data, name.data);
  } catch (error) {
    return failUnexpected("renameCategory", error);
  }
  if (!result.ok) return result;

  refresh();
  return result;
}

/** 非表示にする / 表示に戻す。どちらも同じアクションで扱う */
export async function setCategoryArchived(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = parseId(formData, "setCategoryArchived");
  if (!id.ok) return id;

  // チェックボックスではなくボタンの値で受け取る（押した側が意図）
  const archived = formData.get("archived") === "true";

  let result: ActionResult;
  try {
    result = await setCategoryArchivedForMe(id.data, archived);
  } catch (error) {
    return failUnexpected("setCategoryArchived", error);
  }
  if (!result.ok) return result;

  refresh();
  return result;
}
