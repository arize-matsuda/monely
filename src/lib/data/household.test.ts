import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireMember, requireUser } from "@/lib/auth";
import type { Me, Member } from "@/lib/types";
import { resetDb, type SeededHousehold, seedTwoHouseholds } from "@/test/db";
import { prisma } from "./db";
import {
  createHouseholdForMe,
  getMyHousehold,
  joinHouseholdForMe,
  listMembers,
  updateMyDisplayName,
  updateMyHouseholdName,
} from "./household";

/** DAL の認可テスト（ADR-0005 約束 C） */
vi.mock("@/lib/auth", () => ({
  getMe: vi.fn(),
  requireUser: vi.fn(),
  requireMember: vi.fn(),
}));

function as(member: Member) {
  vi.mocked(requireMember).mockResolvedValue(member);
  vi.mocked(requireUser).mockResolvedValue(member);
}

/** 世帯に未所属のユーザーとして実行する */
function asUnassigned(me: Me) {
  vi.mocked(requireUser).mockResolvedValue(me);
  vi.mocked(requireMember).mockRejectedValue(new Error("世帯なし"));
}

describe("世帯の DAL", () => {
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

  describe("getMyHousehold", () => {
    it("自分の世帯を返す", async () => {
      as(a.member);
      const household = await getMyHousehold();
      expect(household?.name).toBe("わが家");
      expect(household?.inviteCode).toBe("AAAAAA");
    });

    it("★ 他世帯の情報は返らない（招待コードが漏れない）", async () => {
      as(b.member);
      const household = await getMyHousehold();
      expect(household?.name).toBe("よその家");
      expect(household?.inviteCode).not.toBe("AAAAAA");
    });
  });

  describe("listMembers", () => {
    it("自分の世帯のメンバーだけ返す", async () => {
      as(a.member);
      const members = await listMembers();
      expect(members).toHaveLength(1);
      expect(members[0]?.displayName).toBe("たっつ");
    });

    it("★ 他世帯のメンバーを返さない", async () => {
      as(b.member);
      const members = await listMembers();
      expect(members.map((m) => m.displayName)).not.toContain("たっつ");
    });
  });

  describe("updateMyHouseholdName", () => {
    it("自分の世帯の名前を変えられる（FR-H4）", async () => {
      as(a.member);
      expect(await updateMyHouseholdName("新しい家")).toMatchObject({
        ok: true,
      });
      const row = await prisma.household.findUnique({
        where: { id: a.householdId },
      });
      expect(row?.name).toBe("新しい家");
    });

    it("★ 他世帯の名前は変わらない", async () => {
      as(b.member);
      await updateMyHouseholdName("のっとり");
      const row = await prisma.household.findUnique({
        where: { id: a.householdId },
      });
      expect(row?.name).toBe("わが家");
    });
  });

  describe("updateMyDisplayName", () => {
    it("自分の表示名を変えられる（FR-H5）", async () => {
      as(a.member);
      expect(await updateMyDisplayName("たつ")).toMatchObject({ ok: true });
      const row = await prisma.profile.findUnique({
        where: { id: a.member.profileId },
      });
      expect(row?.displayName).toBe("たつ");
    });

    it("★ 他メンバーの表示名は変わらない（BR-4）", async () => {
      as(b.member);
      await updateMyDisplayName("のっとり");
      const row = await prisma.profile.findUnique({
        where: { id: a.member.profileId },
      });
      expect(row?.displayName).toBe("たっつ");
    });
  });

  describe("createHouseholdForMe", () => {
    it("世帯と初期カテゴリ 18 件を作り、自分を所属させる（FR-H2）", async () => {
      const user = await prisma.user.create({
        data: {
          id: "new-user-for-create",
          name: "あたらしい人",
          email: "new-create@example.test",
          emailVerified: true,
        },
      });
      const profile = await prisma.profile.create({
        data: { userId: user.id, displayName: "あたらしい人" },
      });
      asUnassigned({
        userId: user.id,
        profileId: profile.id,
        email: user.email,
        displayName: profile.displayName,
        householdId: null,
      });

      const result = await createHouseholdForMe({
        name: "あたらしい家",
        displayName: "あたらし",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const categories = await prisma.category.count({
        where: { householdId: result.data.householdId },
      });
      expect(categories).toBe(18);

      const updated = await prisma.profile.findUnique({
        where: { id: profile.id },
      });
      expect(updated?.householdId).toBe(result.data.householdId);
      expect(updated?.displayName).toBe("あたらし");
    });

    it("すでに所属していれば作れない（BR-1）", async () => {
      as(a.member);
      expect(
        await createHouseholdForMe({ name: "ふたつめ", displayName: "たっつ" }),
      ).toMatchObject({ ok: false, error: { code: "ALREADY_IN_HOUSEHOLD" } });
    });
  });

  describe("joinHouseholdForMe", () => {
    it("招待コードで参加できる（FR-H1 / AC-3）", async () => {
      const user = await prisma.user.create({
        data: {
          id: "new-user-for-join",
          name: "かぞく",
          email: "new-join@example.test",
          emailVerified: true,
        },
      });
      const profile = await prisma.profile.create({
        data: { userId: user.id, displayName: "かぞく" },
      });
      asUnassigned({
        userId: user.id,
        profileId: profile.id,
        email: user.email,
        displayName: profile.displayName,
        householdId: null,
      });

      const result = await joinHouseholdForMe({
        inviteCode: "AAAAAA",
        displayName: "かぞく",
      });
      expect(result).toMatchObject({ ok: true });
      if (!result.ok) return;
      expect(result.data.householdId).toBe(a.householdId);

      // 参加後は A の記録が見えるようになる
      const updated = await prisma.profile.findUnique({
        where: { id: profile.id },
      });
      expect(updated?.householdId).toBe(a.householdId);
    });

    it("存在しない招待コードを拒否する", async () => {
      const user = await prisma.user.create({
        data: {
          id: "new-user-bad-code",
          name: "だれか",
          email: "bad-code@example.test",
          emailVerified: true,
        },
      });
      const profile = await prisma.profile.create({
        data: { userId: user.id, displayName: "だれか" },
      });
      asUnassigned({
        userId: user.id,
        profileId: profile.id,
        email: user.email,
        displayName: profile.displayName,
        householdId: null,
      });

      expect(
        await joinHouseholdForMe({
          inviteCode: "ZZZZZZ",
          displayName: "だれか",
        }),
      ).toMatchObject({
        ok: false,
        error: { code: "INVALID_INVITE_CODE", field: "inviteCode" },
      });
    });

    it("すでに所属していれば参加できない（BR-1）", async () => {
      as(b.member);
      expect(
        await joinHouseholdForMe({
          inviteCode: "AAAAAA",
          displayName: "はなこ",
        }),
      ).toMatchObject({ ok: false, error: { code: "ALREADY_IN_HOUSEHOLD" } });
    });
  });
});
