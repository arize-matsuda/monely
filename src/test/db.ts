import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/data/db";
import type { Member } from "@/lib/types";

/**
 * DAL のテスト用ヘルパー。
 *
 * **DB へのクエリはモックしない。** ローカルの捨て Postgres に本物の
 * クエリを投げる。モックでは `where` の書き忘れを検出できない
 * （ADR-0005 の約束 C が成立しなくなる）。
 *
 * 認証（requireMember）だけはモックする。テストの関心は認可であって
 * セッションの発行ではないため。
 */

/** 全テーブルを空にする。各テストの前に呼ぶ */
export async function resetDb(): Promise<void> {
  // 外部キーの順に消す
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.profile.updateMany({ data: { householdId: null } });
  await prisma.profile.deleteMany();
  await prisma.household.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

export type SeededHousehold = {
  householdId: string;
  /** requireMember() の戻り値として使う */
  member: Member;
  categoryId: string;
};

/** 世帯 1 つとメンバー 1 人を作る */
export async function seedHousehold(options: {
  householdName: string;
  displayName: string;
  inviteCode: string;
}): Promise<SeededHousehold> {
  const userId = randomUUID();
  const user = await prisma.user.create({
    data: {
      id: userId,
      name: options.displayName,
      email: `${options.inviteCode.toLowerCase()}@example.test`,
      emailVerified: true,
    },
  });
  const household = await prisma.household.create({
    data: { name: options.householdName, inviteCode: options.inviteCode },
  });
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      displayName: options.displayName,
      householdId: household.id,
    },
  });
  const category = await prisma.category.create({
    data: {
      householdId: household.id,
      kind: "expense",
      name: "食費",
      sortOrder: 10,
    },
  });

  return {
    householdId: household.id,
    categoryId: category.id,
    member: {
      userId: user.id,
      profileId: profile.id,
      email: user.email,
      displayName: profile.displayName,
      householdId: household.id,
    },
  };
}

/**
 * 世帯 2 つを作る。**認可テストの基本形**。
 * A には記録を 1 件入れ、B は空にする。
 */
export async function seedTwoHouseholds() {
  const a = await seedHousehold({
    householdName: "わが家",
    displayName: "たっつ",
    inviteCode: "AAAAAA",
  });
  const b = await seedHousehold({
    householdName: "よその家",
    displayName: "はなこ",
    inviteCode: "BBBBBB",
  });

  const transaction = await prisma.transaction.create({
    data: {
      householdId: a.householdId,
      occurredOn: new Date("2026-11-07T00:00:00.000Z"),
      kind: "expense",
      amount: 1280,
      categoryId: a.categoryId,
      paidById: a.member.profileId,
      createdById: a.member.profileId,
      memo: "スーパー",
    },
  });

  return { a, b, aTransactionId: transaction.id };
}

/** 認可を迂回して行を読む。「対象が無傷か」の確認に使う */
export async function rawFindTransaction(id: string) {
  return prisma.transaction.findUnique({ where: { id } });
}

export async function rawCountTransactions(): Promise<number> {
  return prisma.transaction.count();
}
