import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { rawCountTransactions, resetDb, seedTwoHouseholds } from "@/test/db";
import { prisma } from "./db";

/**
 * ハーネス自体の確認。
 * ローカルの捨て DB に本物のクエリが通ること、
 * 各テストの前に DB が空に戻ることを確かめる。
 */
describe("テストハーネス", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("ローカルの DB に繋がる", async () => {
    expect(await rawCountTransactions()).toBe(0);
  });

  it("接続先が localhost である（本番に繋いでいない）", () => {
    const url = process.env.DATABASE_URL ?? "";
    expect(url).toMatch(/localhost|127\.0\.0\.1/);
    expect(url).not.toMatch(/supabase/);
  });

  it("世帯 2 つを作れる", async () => {
    const { a, b, aTransactionId } = await seedTwoHouseholds();
    expect(a.householdId).not.toBe(b.householdId);
    expect(a.member.householdId).toBe(a.householdId);
    expect(b.member.householdId).toBe(b.householdId);
    expect(aTransactionId).toBeTruthy();
    expect(await rawCountTransactions()).toBe(1);
  });

  it("resetDb で空に戻る", async () => {
    await seedTwoHouseholds();
    expect(await rawCountTransactions()).toBe(1);
    await resetDb();
    expect(await rawCountTransactions()).toBe(0);
    expect(await prisma.household.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
  });

  it("CHECK 制約が効いている（amount > 0）", async () => {
    const { a } = await seedTwoHouseholds();
    await expect(
      prisma.transaction.create({
        data: {
          householdId: a.householdId,
          occurredOn: new Date("2026-11-07T00:00:00.000Z"),
          kind: "expense",
          amount: 0,
          createdById: a.member.profileId,
        },
      }),
    ).rejects.toThrow();
  });

  it("@db.Date は UTC 0 時で返る", async () => {
    const { aTransactionId } = await seedTwoHouseholds();
    const row = await prisma.transaction.findUnique({
      where: { id: aTransactionId },
    });
    expect(row?.occurredOn.toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });
});
