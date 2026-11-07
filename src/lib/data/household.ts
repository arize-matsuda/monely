import "server-only";
import { randomInt } from "node:crypto";
import { requireMember, requireUser } from "@/lib/auth";
import { type ActionResult, fail, ok } from "@/lib/types";
import { INITIAL_CATEGORIES } from "./categories-seed";
import { prisma } from "./db";

/**
 * 世帯の DAL。
 *
 * すべての関数が内部で requireUser() / requireMember() を呼び、
 * 世帯 ID を引数で受け取らない（ADR-0005 約束 B）。
 */

const INVITE_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const INVITE_CODE_LENGTH = 6;

/**
 * 招待コードを作る。世帯の全データへのアクセス権と同等なので
 * Math.random() ではなく node:crypto の randomInt を使う。
 */
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * 世帯を作り、初期カテゴリを入れ、自分を所属させる。
 * 3 つをまとめて 1 つのトランザクションで行う
 * （途中で失敗して中途半端な状態が残らないようにする）。
 */
export async function createHouseholdForMe(input: {
  name: string;
  displayName: string;
}): Promise<ActionResult<{ householdId: string }>> {
  const me = await requireUser();
  if (me.householdId) {
    return fail("ALREADY_IN_HOUSEHOLD", "すでに家計簿に参加しています");
  }

  // 招待コードの衝突に備えて数回試す
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const taken = await prisma.household.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (taken) continue;

    const household = await prisma.$transaction(async (tx) => {
      const created = await tx.household.create({
        data: { name: input.name, inviteCode },
      });
      await tx.category.createMany({
        data: INITIAL_CATEGORIES.map((category) => ({
          ...category,
          householdId: created.id,
        })),
      });
      await tx.profile.update({
        where: { id: me.profileId },
        data: { householdId: created.id, displayName: input.displayName },
      });
      return created;
    });

    return ok({ householdId: household.id });
  }

  return fail(
    "DB_ERROR",
    "家計簿を作成できませんでした。もう一度お試しください",
  );
}

/** 招待コードで既存の世帯に参加する */
export async function joinHouseholdForMe(input: {
  inviteCode: string;
  displayName: string;
}): Promise<ActionResult<{ householdId: string }>> {
  const me = await requireUser();
  if (me.householdId) {
    return fail("ALREADY_IN_HOUSEHOLD", "すでに家計簿に参加しています");
  }

  const household = await prisma.household.findUnique({
    where: { inviteCode: input.inviteCode },
    select: { id: true },
  });
  if (!household) {
    return fail(
      "INVALID_INVITE_CODE",
      "この招待コードの家計簿は見つかりませんでした",
      "inviteCode",
    );
  }

  await prisma.profile.update({
    where: { id: me.profileId },
    data: { householdId: household.id, displayName: input.displayName },
  });

  return ok({ householdId: household.id });
}

/** 自分の世帯。認可は requireMember() の householdId で絞ることで担保する */
export async function getMyHousehold() {
  const me = await requireMember();
  return prisma.household.findUnique({
    where: { id: me.householdId },
    select: { id: true, name: true, inviteCode: true },
  });
}

/** 同居メンバーの一覧 */
export async function listMembers() {
  const me = await requireMember();
  return prisma.profile.findMany({
    where: { householdId: me.householdId },
    select: { id: true, displayName: true },
    orderBy: { createdAt: "asc" },
  });
}

/** 世帯名を変える */
export async function updateMyHouseholdName(
  name: string,
): Promise<ActionResult> {
  const me = await requireMember();
  const result = await prisma.household.updateMany({
    where: { id: me.householdId },
    data: { name },
  });
  if (result.count === 0) {
    return fail("NOT_FOUND", "見つかりませんでした");
  }
  return ok();
}

/** 自分の表示名を変える。他メンバーは対象にしない（BR-4） */
export async function updateMyDisplayName(
  displayName: string,
): Promise<ActionResult> {
  const me = await requireUser();
  await prisma.profile.update({
    where: { id: me.profileId },
    data: { displayName },
  });
  return ok();
}
