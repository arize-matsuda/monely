import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireMember } from "@/lib/auth";
import type { Member } from "@/lib/types";
import {
  rawFindTransaction,
  resetDb,
  type SeededHousehold,
  seedTwoHouseholds,
} from "@/test/db";
import { prisma } from "./db";
import {
  createTransactionForMe,
  deleteTransactionForMe,
  getTransaction,
  listCategories,
  listTransactionsByMonth,
  updateTransactionForMe,
} from "./transactions";

/**
 * **DAL の認可テスト**（ADR-0005 の約束 C）。
 *
 * 認可が `where` 句にしか無いため、書き忘れを検出する工程はこれだけ。
 * **DB へのクエリはモックしない。** 本物のクエリをローカルの捨て DB に投げる。
 *
 * 認証だけモックする。テストの関心は「誰として実行するか」であって
 * セッションの発行ではない。
 */
vi.mock("@/lib/auth", () => ({
  getMe: vi.fn(),
  requireUser: vi.fn(),
  requireMember: vi.fn(),
}));

/** その世帯のメンバーとして実行する */
function as(member: Member) {
  vi.mocked(requireMember).mockResolvedValue(member);
}

const MONTH = "2026-11";

describe("記録の DAL", () => {
  let a: SeededHousehold;
  let b: SeededHousehold;
  let aTransactionId: string;

  beforeEach(async () => {
    await resetDb();
    const seeded = await seedTwoHouseholds();
    a = seeded.a;
    b = seeded.b;
    aTransactionId = seeded.aTransactionId;
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------
  describe("listTransactionsByMonth", () => {
    it("自分の世帯の記録を返す", async () => {
      as(a.member);
      const rows = await listTransactionsByMonth(MONTH);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.amount).toBe(1280);
      expect(rows[0]?.category?.name).toBe("食費");
      expect(rows[0]?.paidBy?.displayName).toBe("たっつ");
    });

    it("★ 他世帯の記録を返さない", async () => {
      as(b.member);
      expect(await listTransactionsByMonth(MONTH)).toHaveLength(0);
    });

    it("別の月の記録は返さない", async () => {
      as(a.member);
      expect(await listTransactionsByMonth("2026-10")).toHaveLength(0);
      expect(await listTransactionsByMonth("2026-12")).toHaveLength(0);
    });

    it("月末・月初が正しい月に入る", async () => {
      as(a.member);
      await createTransactionForMe({
        kind: "expense",
        amount: 100,
        occurredOn: new Date("2026-10-31T00:00:00.000Z"),
        categoryId: null,
        paidById: null,
        memo: "10月末",
      });
      await createTransactionForMe({
        kind: "expense",
        amount: 200,
        occurredOn: new Date("2026-12-01T00:00:00.000Z"),
        categoryId: null,
        paidById: null,
        memo: "12月初",
      });
      expect(await listTransactionsByMonth("2026-10")).toHaveLength(1);
      expect(await listTransactionsByMonth(MONTH)).toHaveLength(1);
      expect(await listTransactionsByMonth("2026-12")).toHaveLength(1);
    });

    it("日付の新しい順に並ぶ（FR-L2）", async () => {
      as(a.member);
      for (const day of ["2026-11-01", "2026-11-20", "2026-11-10"]) {
        await createTransactionForMe({
          kind: "expense",
          amount: 100,
          occurredOn: new Date(`${day}T00:00:00.000Z`),
          categoryId: null,
          paidById: null,
          memo: day,
        });
      }
      const rows = await listTransactionsByMonth(MONTH);
      const days = rows.map((r) => r.occurredOn.toISOString().slice(0, 10));
      expect(days).toEqual([
        "2026-11-20",
        "2026-11-10",
        "2026-11-07",
        "2026-11-01",
      ]);
    });
  });

  // ---------------------------------------------------------------------
  describe("getTransaction", () => {
    it("自分の世帯の記録を返す", async () => {
      as(a.member);
      expect(await getTransaction(aTransactionId)).not.toBeNull();
    });

    it("★ 他世帯の記録は ID を指定しても null", async () => {
      as(b.member);
      expect(await getTransaction(aTransactionId)).toBeNull();
    });

    it("存在しない ID は null", async () => {
      as(a.member);
      expect(
        await getTransaction("00000000-0000-0000-0000-000000000000"),
      ).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  describe("listCategories", () => {
    it("自分の世帯の、種別が一致するカテゴリを返す", async () => {
      as(a.member);
      const rows = await listCategories("expense");
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("食費");
    });

    it("★ 他世帯のカテゴリを返さない", async () => {
      as(b.member);
      const rows = await listCategories("expense");
      expect(rows.map((r) => r.id)).not.toContain(a.categoryId);
    });

    it("種別が違うカテゴリを返さない", async () => {
      as(a.member);
      expect(await listCategories("income")).toHaveLength(0);
    });

    it("非表示のカテゴリを返さない（FR-C6）", async () => {
      await prisma.category.update({
        where: { id: a.categoryId },
        data: { archived: true },
      });
      as(a.member);
      expect(await listCategories("expense")).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------
  describe("createTransactionForMe", () => {
    it("householdId と createdById を自分の値で埋める（BR-5, BR-6）", async () => {
      as(a.member);
      const result = await createTransactionForMe({
        kind: "expense",
        amount: 500,
        occurredOn: new Date("2026-11-08T00:00:00.000Z"),
        categoryId: a.categoryId,
        paidById: a.member.profileId,
        memo: null,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const row = await rawFindTransaction(result.data.id);
      expect(row?.householdId).toBe(a.householdId);
      expect(row?.createdById).toBe(a.member.profileId);
    });

    it("★ 他世帯のカテゴリを紐付けられない（外部キーでは防げない）", async () => {
      as(b.member);
      const result = await createTransactionForMe({
        kind: "expense",
        amount: 500,
        occurredOn: new Date("2026-11-08T00:00:00.000Z"),
        categoryId: a.categoryId, // A のカテゴリ
        paidById: null,
        memo: null,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "VALIDATION", field: "categoryId" },
      });
    });

    it("★ 他世帯のメンバーを支払者にできない", async () => {
      as(b.member);
      const result = await createTransactionForMe({
        kind: "expense",
        amount: 500,
        occurredOn: new Date("2026-11-08T00:00:00.000Z"),
        categoryId: null,
        paidById: a.member.profileId, // A のメンバー
        memo: null,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "VALIDATION", field: "paidById" },
      });
    });

    it("種別が一致しないカテゴリを拒否する", async () => {
      as(a.member);
      const result = await createTransactionForMe({
        kind: "income", // 収入なのに支出カテゴリ
        amount: 500,
        occurredOn: new Date("2026-11-08T00:00:00.000Z"),
        categoryId: a.categoryId,
        paidById: null,
        memo: null,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "VALIDATION", field: "categoryId" },
      });
    });

    it("カテゴリと支払者は null でよい（FR-T4, FR-T5）", async () => {
      as(a.member);
      const result = await createTransactionForMe({
        kind: "expense",
        amount: 500,
        occurredOn: new Date("2026-11-08T00:00:00.000Z"),
        categoryId: null,
        paidById: null,
        memo: null,
      });
      expect(result.ok).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  describe("updateTransactionForMe", () => {
    const input = {
      kind: "expense" as const,
      amount: 9999,
      occurredOn: new Date("2026-11-09T00:00:00.000Z"),
      categoryId: null,
      paidById: null,
      memo: "更新後",
    };

    it("自分の世帯の記録を更新できる", async () => {
      as(a.member);
      expect(await updateTransactionForMe(aTransactionId, input)).toMatchObject(
        { ok: true },
      );
      expect((await rawFindTransaction(aTransactionId))?.amount).toBe(9999);
    });

    it("★ 他世帯の記録を更新できない。対象は無傷", async () => {
      as(b.member);
      expect(await updateTransactionForMe(aTransactionId, input)).toMatchObject(
        { ok: false, error: { code: "NOT_FOUND" } },
      );
      // A の記録が変わっていないこと
      const row = await rawFindTransaction(aTransactionId);
      expect(row?.amount).toBe(1280);
      expect(row?.memo).toBe("スーパー");
    });

    it("存在しない ID は NOT_FOUND", async () => {
      as(a.member);
      expect(
        await updateTransactionForMe(
          "00000000-0000-0000-0000-000000000000",
          input,
        ),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    });

    it("householdId と createdById は変わらない", async () => {
      as(a.member);
      await updateTransactionForMe(aTransactionId, input);
      const row = await rawFindTransaction(aTransactionId);
      expect(row?.householdId).toBe(a.householdId);
      expect(row?.createdById).toBe(a.member.profileId);
    });
  });

  // ---------------------------------------------------------------------
  describe("deleteTransactionForMe", () => {
    it("自分の世帯の記録を削除できる", async () => {
      as(a.member);
      expect(await deleteTransactionForMe(aTransactionId)).toMatchObject({
        ok: true,
      });
      expect(await rawFindTransaction(aTransactionId)).toBeNull();
    });

    it("★ 他世帯の記録を削除できない。対象は無傷", async () => {
      as(b.member);
      expect(await deleteTransactionForMe(aTransactionId)).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
      expect(await rawFindTransaction(aTransactionId)).not.toBeNull();
    });

    it("存在しない ID は NOT_FOUND", async () => {
      as(a.member);
      expect(
        await deleteTransactionForMe("00000000-0000-0000-0000-000000000000"),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    });
  });
});
