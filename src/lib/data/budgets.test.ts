import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireMember } from "@/lib/auth";
import type { Member } from "@/lib/types";
import { resetDb, type SeededHousehold, seedTwoHouseholds } from "@/test/db";
import { listBudgets, setBudgetsForMe } from "./budgets";
import { prisma } from "./db";

/**
 * **予算の DAL の認可テスト**（ADR-0005 の約束 C）。
 * ★ が付いているものが「他世帯に手が届かない」ことの確認。
 */
vi.mock("@/lib/auth", () => ({
  getMe: vi.fn(),
  requireUser: vi.fn(),
  requireMember: vi.fn(),
}));

function as(member: Member) {
  vi.mocked(requireMember).mockResolvedValue(member);
}

describe("予算の DAL", () => {
  let a: SeededHousehold;
  let b: SeededHousehold;

  beforeEach(async () => {
    await resetDb();
    const seeded = await seedTwoHouseholds();
    a = seeded.a;
    b = seeded.b;
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  describe("listBudgets", () => {
    it("自分の世帯の予算を返す", async () => {
      as(a.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]);
      const budgets = await listBudgets();
      expect(budgets.get(a.categoryId)).toBe(50000);
    });

    it("予算が無ければ空", async () => {
      as(a.member);
      expect(await listBudgets()).toEqual(new Map());
    });

    it("★ 他世帯の予算を返さない", async () => {
      as(a.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]);

      as(b.member);
      const budgets = await listBudgets();
      expect(budgets.has(a.categoryId)).toBe(false);
      expect(budgets.size).toBe(0);
    });
  });

  describe("setBudgetsForMe", () => {
    it("新しく設定できる", async () => {
      as(a.member);
      expect(
        await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]),
      ).toMatchObject({ ok: true });

      const row = await prisma.budget.findFirst({
        where: { categoryId: a.categoryId },
      });
      expect(row?.amount).toBe(50000);
      expect(row?.householdId).toBe(a.householdId);
    });

    it("同じカテゴリを 2 回設定すると上書きする（増えない）", async () => {
      as(a.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 60000 }]);

      const rows = await prisma.budget.findMany({
        where: { categoryId: a.categoryId },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.amount).toBe(60000);
    });

    // 削除用の操作を別に作らず、0 で消す
    it("0 円を渡すと行を消す", async () => {
      as(a.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 0 }]);

      expect(
        await prisma.budget.count({ where: { categoryId: a.categoryId } }),
      ).toBe(0);
    });

    it("まとめて設定できる", async () => {
      const second = await prisma.category.create({
        data: {
          householdId: a.householdId,
          kind: "expense",
          name: "交通",
          sortOrder: 20,
        },
      });
      as(a.member);
      await setBudgetsForMe([
        { categoryId: a.categoryId, amount: 50000 },
        { categoryId: second.id, amount: 10000 },
      ]);

      const budgets = await listBudgets();
      expect(budgets.get(a.categoryId)).toBe(50000);
      expect(budgets.get(second.id)).toBe(10000);
    });

    // 外部キーだけでは他世帯の ID を防げない（security-guidelines §5）
    it("★ 他世帯のカテゴリには設定できない", async () => {
      as(b.member);
      const result = await setBudgetsForMe([
        { categoryId: a.categoryId, amount: 99999 },
      ]);
      // 想定内の操作として成功を返すが、何も起きない
      expect(result).toMatchObject({ ok: true });
      expect(
        await prisma.budget.count({ where: { categoryId: a.categoryId } }),
      ).toBe(0);
    });

    it("★ 他世帯の予算を 0 で消せない", async () => {
      as(a.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]);

      as(b.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 0 }]);

      // a の予算は残っている
      expect(
        await prisma.budget.count({ where: { categoryId: a.categoryId } }),
      ).toBe(1);
    });

    it("存在しないカテゴリ ID は無視する", async () => {
      as(a.member);
      const result = await setBudgetsForMe([
        { categoryId: "00000000-0000-7000-8000-000000000000", amount: 50000 },
      ]);
      expect(result).toMatchObject({ ok: true });
      expect(await prisma.budget.count()).toBe(0);
    });

    it("空の配列でも落ちない", async () => {
      as(a.member);
      expect(await setBudgetsForMe([])).toMatchObject({ ok: true });
    });

    it("カテゴリを消すと予算も消える（cascade）", async () => {
      as(a.member);
      await setBudgetsForMe([{ categoryId: a.categoryId, amount: 50000 }]);
      await prisma.category.delete({ where: { id: a.categoryId } });
      expect(await prisma.budget.count()).toBe(0);
    });
  });
});
