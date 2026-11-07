"use server";

import { redirect } from "next/navigation";
import { createHouseholdForMe, joinHouseholdForMe } from "@/lib/data/household";
import { type ActionResult, failUnexpected } from "@/lib/types";
import { parseInviteCode, parseText } from "@/lib/validation";

/**
 * 世帯を作る / 招待コードで参加する（FR-H1, FR-H2）。
 *
 * 認証の確認は DAL の requireUser() が行う。
 * 世帯 ID はクライアントから受け取らない。
 */

export async function createHousehold(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const displayName = parseText(formData.get("displayName"), {
    field: "displayName",
    label: "あなたの名前",
    min: 1,
    max: 20,
  });
  if (!displayName.ok) return displayName;

  const name = parseText(formData.get("householdName"), {
    field: "householdName",
    label: "わが家の名前",
    min: 1,
    max: 30,
  });
  if (!name.ok) return name;

  let result: ActionResult<{ householdId: string }>;
  try {
    result = await createHouseholdForMe({
      name: name.data,
      displayName: displayName.data,
    });
  } catch (error) {
    return failUnexpected("createHousehold", error);
  }
  if (!result.ok) return result;

  redirect("/");
}

export async function joinHousehold(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const displayName = parseText(formData.get("displayName"), {
    field: "displayName",
    label: "あなたの名前",
    min: 1,
    max: 20,
  });
  if (!displayName.ok) return displayName;

  const inviteCode = parseInviteCode(formData.get("inviteCode"));
  if (!inviteCode.ok) return inviteCode;

  let result: ActionResult<{ householdId: string }>;
  try {
    result = await joinHouseholdForMe({
      inviteCode: inviteCode.data,
      displayName: displayName.data,
    });
  } catch (error) {
    return failUnexpected("joinHousehold", error);
  }
  if (!result.ok) return result;

  redirect("/");
}
