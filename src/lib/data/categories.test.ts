import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireMember } from "@/lib/auth";
import type { Member } from "@/lib/types";
import { resetDb, type SeededHousehold, seedTwoHouseholds } from "@/test/db";
import {
  createCategoryForMe,
  listCategoriesForManagement,
  renameCategoryForMe,
  setCategoryArchivedForMe,
} from "./categories";
import { prisma } from "./db";

/**
 * **カテゴリ管理の DAL の認可テスト**（ADR-0005 の約束 C）。
 *
 * ★ が付いているものが「他世帯に手が届かない」ことの確認。
 * `where` から `householdId` を外すと、これらが落ちる。
 */
vi.mock("@/lib/auth", () => ({
  getMe: vi.fn(),
  requireUser: vi.fn(),
  requireMember: vi.fn(),
}));

function as(member: Member) {
  vi.mocked(requireMember).mockResolvedValue(member);
}

describe("カテゴリ管理の DAL", () => {
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

  describe("listCategoriesForManagement", () => {
    it("自分の世帯のカテゴリを返す", async () => {
      as(a.member);
      const rows = await listCategoriesForManagement();
      expect(rows.map((r) => r.id)).toEqual([a.categoryId]);
    });

    it("非表示のものも返す（操作の対象なので）", async () => {
      await prisma.category.update({
        where: { id: a.categoryId },
        data: { archived: true },
      });
      as(a.member);
      const rows = await listCategoriesForManagement();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.archived).toBe(true);
    });

    it("記録の件数を返す", async () => {
      as(a.member);
      const rows = await listCategoriesForManagement();
      // seed で 1 件の記録が食費に紐づいている
      expect(rows[0]?._count.transactions).toBe(1);
    });

    it("★ 他世帯のカテゴリを返さない", async () => {
      as(b.member);
      const rows = await listCategoriesForManagement();
      expect(rows.map((r) => r.id)).not.toContain(a.categoryId);
    });
  });

  describe("createCategoryForMe", () => {
    it("自分の世帯に追加する", async () => {
      as(a.member);
      const result = await createCategoryForMe({
        kind: "expense",
        name: "ペット",
      });
      expect(result.ok).toBe(true);

      const created = await prisma.category.findFirst({
        where: { name: "ペット" },
      });
      expect(created?.householdId).toBe(a.householdId);
    });

    it("「その他」より手前の順番になる", async () => {
      await prisma.category.create({
        data: {
          householdId: a.householdId,
          kind: "expense",
          name: "その他",
          sortOrder: 999,
        },
      });
      as(a.member);
      await createCategoryForMe({ kind: "expense", name: "ペット" });

      const rows = await prisma.category.findMany({
        where: { householdId: a.householdId, kind: "expense" },
        orderBy: { sortOrder: "asc" },
        select: { name: true },
      });
      expect(rows.map((r) => r.name)).toEqual(["食費", "ペット", "その他"]);
    });

    it("同じ世帯・種別に同名があれば弾く", async () => {
      as(a.member);
      const result = await createCategoryForMe({
        kind: "expense",
        name: "食費",
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "VALIDATION", field: "name" },
      });
    });

    it("種別が違えば同名を許す（支出の食費と収入の食費）", async () => {
      as(a.member);
      expect(
        await createCategoryForMe({ kind: "income", name: "食費" }),
      ).toMatchObject({ ok: true });
    });

    it("★ 他世帯に同名があっても追加できる（世帯ごとに独立）", async () => {
      as(b.member);
      // b の世帯にも「食費」はあるが、a の「食費」とは別物
      expect(
        await createCategoryForMe({ kind: "expense", name: "ペット" }),
      ).toMatchObject({ ok: true });

      const rows = await prisma.category.findMany({
        where: { name: "ペット" },
        select: { householdId: true },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.householdId).toBe(b.householdId);
    });
  });

  describe("renameCategoryForMe", () => {
    it("自分の世帯のカテゴリを改名する", async () => {
      as(a.member);
      expect(await renameCategoryForMe(a.categoryId, "食料品")).toMatchObject({
        ok: true,
      });
      const row = await prisma.category.findUnique({
        where: { id: a.categoryId },
      });
      expect(row?.name).toBe("食料品");
    });

    it("★ 他世帯のカテゴリを改名できない", async () => {
      as(b.member);
      expect(await renameCategoryForMe(a.categoryId, "のっとり")).toMatchObject(
        {
          ok: false,
          error: { code: "NOT_FOUND" },
        },
      );

      const row = await prisma.category.findUnique({
        where: { id: a.categoryId },
      });
      expect(row?.name).toBe("食費");
    });

    it("存在しない ID は NOT_FOUND", async () => {
      as(a.member);
      expect(
        await renameCategoryForMe(
          "00000000-0000-7000-8000-000000000000",
          "なにか",
        ),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    });

    it("同じ種別に同名があれば弾く", async () => {
      await prisma.category.create({
        data: {
          householdId: a.householdId,
          kind: "expense",
          name: "交通",
          sortOrder: 20,
        },
      });
      as(a.member);
      expect(await renameCategoryForMe(a.categoryId, "交通")).toMatchObject({
        ok: false,
        error: { code: "VALIDATION", field: "name" },
      });
    });
  });

  describe("setCategoryArchivedForMe", () => {
    it("非表示にできる", async () => {
      as(a.member);
      expect(await setCategoryArchivedForMe(a.categoryId, true)).toMatchObject({
        ok: true,
      });
      const row = await prisma.category.findUnique({
        where: { id: a.categoryId },
      });
      expect(row?.archived).toBe(true);
    });

    it("表示に戻せる", async () => {
      await prisma.category.update({
        where: { id: a.categoryId },
        data: { archived: true },
      });
      as(a.member);
      expect(await setCategoryArchivedForMe(a.categoryId, false)).toMatchObject(
        { ok: true },
      );
      const row = await prisma.category.findUnique({
        where: { id: a.categoryId },
      });
      expect(row?.archived).toBe(false);
    });

    it("非表示にしても記録は残る（FR-C6）", async () => {
      as(a.member);
      await setCategoryArchivedForMe(a.categoryId, true);
      const count = await prisma.transaction.count({
        where: { categoryId: a.categoryId },
      });
      expect(count).toBe(1);
    });

    it("★ 他世帯のカテゴリを非表示にできない", async () => {
      as(b.member);
      expect(await setCategoryArchivedForMe(a.categoryId, true)).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });

      const row = await prisma.category.findUnique({
        where: { id: a.categoryId },
      });
      expect(row?.archived).toBe(false);
    });
  });
});
