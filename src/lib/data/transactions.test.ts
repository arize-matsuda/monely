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
  createRecurringForMe,
  createTransactionForMe,
  deleteTransactionForMe,
  getTransaction,
  listCategories,
  listTransactionsByMonth,
  listTransactionsByYear,
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

/**
 * カテゴリの使用頻度の集計期間の下限。
 * seed の記録（2026-11-07）を含む範囲にしてある。
 */
const USAGE_SINCE = new Date("2026-10-09T00:00:00.000Z");

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
        recurring: false,
      });
      await createTransactionForMe({
        kind: "expense",
        amount: 200,
        occurredOn: new Date("2026-12-01T00:00:00.000Z"),
        categoryId: null,
        paidById: null,
        memo: "12月初",
        recurring: false,
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
          recurring: false,
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
  describe("listTransactionsByYear", () => {
    it("その年の記録を返す", async () => {
      as(a.member);
      const rows = await listTransactionsByYear(2026);
      expect(rows.map((r) => r.id)).toEqual([aTransactionId]);
    });

    it("★ 他世帯の記録を返さない", async () => {
      as(b.member);
      const rows = await listTransactionsByYear(2026);
      expect(rows.map((r) => r.id)).not.toContain(aTransactionId);
    });

    it("別の年の記録を返さない", async () => {
      as(a.member);
      expect(await listTransactionsByYear(2025)).toHaveLength(0);
    });

    it("1 月 1 日と 12 月 31 日を含む（境界）", async () => {
      for (const dateKey of ["2026-01-01", "2026-12-31"]) {
        await prisma.transaction.create({
          data: {
            householdId: a.householdId,
            kind: "expense",
            amount: 100,
            occurredOn: new Date(`${dateKey}T00:00:00.000Z`),
            createdById: a.member.profileId,
          },
        });
      }
      as(a.member);
      // seed の 1 件 + 境界の 2 件
      expect(await listTransactionsByYear(2026)).toHaveLength(3);
    });

    it("前年の 12 月 31 日と翌年の 1 月 1 日は含まない（境界）", async () => {
      for (const dateKey of ["2025-12-31", "2027-01-01"]) {
        await prisma.transaction.create({
          data: {
            householdId: a.householdId,
            kind: "expense",
            amount: 100,
            occurredOn: new Date(`${dateKey}T00:00:00.000Z`),
            createdById: a.member.profileId,
          },
        });
      }
      as(a.member);
      expect(await listTransactionsByYear(2026)).toHaveLength(1);
    });

    it("カテゴリと支払った人の名前を含む（内訳に使う）", async () => {
      as(a.member);
      const rows = await listTransactionsByYear(2026);
      expect(rows[0]?.category?.name).toBe("食費");
      expect(rows[0]?.paidBy?.displayName).toBeTruthy();
    });
  });

  describe("createRecurringForMe", () => {
    const entry = {
      kind: "expense" as const,
      amount: 85000,
      occurredOn: new Date("2026-11-25T00:00:00.000Z"),
      categoryId: null,
      paidById: null,
      memo: "家賃",
    };

    it("まとめて作る", async () => {
      as(a.member);
      const result = await createRecurringForMe([
        entry,
        { ...entry, amount: 4980, memo: "通信" },
      ]);
      expect(result).toMatchObject({ ok: true, data: { count: 2 } });
    });

    it("★ 自分の世帯に作る（householdId は me から埋める）", async () => {
      as(b.member);
      await createRecurringForMe([entry]);
      const rows = await prisma.transaction.findMany({
        where: { memo: "家賃" },
        select: { householdId: true, createdById: true },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.householdId).toBe(b.householdId);
      expect(rows[0]?.createdById).toBe(b.member.profileId);
    });

    // 写した記録にも印が付く。翌月も候補に出るようにするため（FR-R3）
    it("作った記録には recurring の印が付く", async () => {
      as(a.member);
      await createRecurringForMe([entry]);
      const row = await prisma.transaction.findFirst({
        where: { memo: "家賃" },
      });
      expect(row?.recurring).toBe(true);
    });

    it("空の配列では何も作らない", async () => {
      as(a.member);
      const before = await prisma.transaction.count();
      expect(await createRecurringForMe([])).toMatchObject({
        ok: true,
        data: { count: 0 },
      });
      expect(await prisma.transaction.count()).toBe(before);
    });

    it("カテゴリと支払った人を引き継げる", async () => {
      as(a.member);
      await createRecurringForMe([
        { ...entry, categoryId: a.categoryId, paidById: a.member.profileId },
      ]);
      const row = await prisma.transaction.findFirst({
        where: { memo: "家賃" },
      });
      expect(row?.categoryId).toBe(a.categoryId);
      expect(row?.paidById).toBe(a.member.profileId);
    });
  });

  describe("listCategories", () => {
    it("自分の世帯の、種別が一致するカテゴリを返す", async () => {
      as(a.member);
      const rows = await listCategories("expense", USAGE_SINCE);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.name).toBe("食費");
    });

    it("★ 他世帯のカテゴリを返さない", async () => {
      as(b.member);
      const rows = await listCategories("expense", USAGE_SINCE);
      expect(rows.map((r) => r.id)).not.toContain(a.categoryId);
    });

    it("種別が違うカテゴリを返さない", async () => {
      as(a.member);
      expect(await listCategories("income", USAGE_SINCE)).toHaveLength(0);
    });

    it("非表示のカテゴリを返さない（FR-C6）", async () => {
      await prisma.category.update({
        where: { id: a.categoryId },
        data: { archived: true },
      });
      as(a.member);
      expect(await listCategories("expense", USAGE_SINCE)).toHaveLength(0);
    });

    describe("並び順（FR-C7 / UI/UX設計 §5.3）", () => {
      /** a の世帯にカテゴリを足す */
      async function addCategory(name: string, sortOrder: number) {
        const category = await prisma.category.create({
          data: {
            householdId: a.householdId,
            kind: "expense",
            name,
            sortOrder,
          },
        });
        return category.id;
      }

      /** a の世帯に記録を足す */
      async function addTransaction(categoryId: string, occurredOn: string) {
        await prisma.transaction.create({
          data: {
            householdId: a.householdId,
            kind: "expense",
            amount: 100,
            occurredOn: new Date(`${occurredOn}T00:00:00.000Z`),
            categoryId,
            createdById: a.member.profileId,
          },
        });
      }

      it("直近で使った回数の多い順に並ぶ", async () => {
        // sortOrder は 食費(10) < 交通(20) < 日用品(30)
        const transport = await addCategory("交通", 20);
        const daily = await addCategory("日用品", 30);

        // 日用品を 3 回、交通を 2 回。食費は seed の 1 回
        for (let i = 0; i < 3; i += 1)
          await addTransaction(daily, "2026-11-01");
        for (let i = 0; i < 2; i += 1)
          await addTransaction(transport, "2026-11-02");

        as(a.member);
        const rows = await listCategories("expense", USAGE_SINCE);
        expect(rows.map((r) => r.name)).toEqual(["日用品", "交通", "食費"]);
        expect(rows.map((r) => r.recentCount)).toEqual([3, 2, 1]);
      });

      it("回数が同じなら sortOrder の順に並ぶ", async () => {
        const transport = await addCategory("交通", 20);
        await addCategory("その他", 999);

        // 食費（seed で 1 回）と交通を同数にする
        await addTransaction(transport, "2026-11-02");

        as(a.member);
        const rows = await listCategories("expense", USAGE_SINCE);
        expect(rows.map((r) => r.name)).toEqual(["食費", "交通", "その他"]);
      });

      it("集計期間より前の記録は数えない", async () => {
        const transport = await addCategory("交通", 20);
        // 期間外（2026-10-09 より前）に 5 回
        for (let i = 0; i < 5; i += 1)
          await addTransaction(transport, "2026-09-01");

        as(a.member);
        const rows = await listCategories("expense", USAGE_SINCE);
        // 期間内は食費の 1 回だけなので、食費が先
        expect(rows.map((r) => r.name)).toEqual(["食費", "交通"]);
        expect(rows.map((r) => r.recentCount)).toEqual([1, 0]);
      });

      it("★ 他世帯の使用回数で並びが変わらない", async () => {
        await addCategory("交通", 20);

        // b の世帯で b のカテゴリを 5 回使う
        for (let i = 0; i < 5; i += 1) {
          await prisma.transaction.create({
            data: {
              householdId: b.householdId,
              kind: "expense",
              amount: 100,
              occurredOn: new Date("2026-11-03T00:00:00.000Z"),
              categoryId: b.categoryId,
              createdById: b.member.profileId,
            },
          });
        }

        as(a.member);
        const rows = await listCategories("expense", USAGE_SINCE);
        // a から見える並びは a の使用回数だけで決まる
        expect(rows.map((r) => r.name)).toEqual(["食費", "交通"]);
        expect(rows.map((r) => r.recentCount)).toEqual([1, 0]);
        expect(rows.map((r) => r.id)).not.toContain(b.categoryId);
      });
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
        recurring: false,
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
        recurring: false,
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
        recurring: false,
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
        recurring: false,
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
        recurring: false,
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
      recurring: false,
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
