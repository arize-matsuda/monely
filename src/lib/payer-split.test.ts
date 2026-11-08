import { describe, expect, it } from "vitest";
import { splitByPayer, UNKNOWN_PAYER_LABEL } from "./payer-split";
import type { Kind } from "./types";

const TWO = [
  { id: "p1", displayName: "たっつ" },
  { id: "p2", displayName: "はなこ" },
];

function row(kind: Kind, amount: number, paidById: string | null) {
  return { kind, amount, paidById };
}

describe("splitByPayer", () => {
  it("支払者ごとに支出を合計する", () => {
    const result = splitByPayer(
      [
        row("expense", 6000, "p1"),
        row("expense", 2000, "p1"),
        row("expense", 2000, "p2"),
      ],
      TWO,
    );
    expect(result.total).toBe(10000);
    expect(result.shares).toEqual([
      { profileId: "p1", name: "たっつ", total: 8000, ratio: 0.8 },
      { profileId: "p2", name: "はなこ", total: 2000, ratio: 0.2 },
    ]);
  });

  // 「誰が払っていないか」が分かるようにする
  it("払っていないメンバーも 0 円で並べる", () => {
    const result = splitByPayer([row("expense", 1000, "p1")], TWO);
    expect(result.shares.map((s) => [s.name, s.total])).toEqual([
      ["たっつ", 1000],
      ["はなこ", 0],
    ]);
  });

  it("収入は対象にしない", () => {
    const result = splitByPayer(
      [row("expense", 1000, "p1"), row("income", 320000, "p1")],
      TWO,
    );
    expect(result.total).toBe(1000);
    expect(result.shares[0]?.total).toBe(1000);
  });

  it("支払者が未指定の行はまとめて最後に出す", () => {
    const result = splitByPayer(
      [row("expense", 5000, "p1"), row("expense", 300, null)],
      TWO,
    );
    const unknown = result.shares.find((s) => s.profileId === null);
    expect(unknown).toMatchObject({
      name: UNKNOWN_PAYER_LABEL,
      total: 300,
    });
  });

  it("支出が無ければ割合は 0（0 で割らない）", () => {
    const result = splitByPayer([], TWO);
    expect(result.total).toBe(0);
    expect(result.shares.every((s) => s.ratio === 0)).toBe(true);
    expect(result.settlement).toBeNull();
  });

  it("割合の合計が 1 になる", () => {
    const result = splitByPayer(
      [
        row("expense", 1234, "p1"),
        row("expense", 5678, "p2"),
        row("expense", 9012, null),
      ],
      TWO,
    );
    const sum = result.shares.reduce((total, s) => total + s.ratio, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  describe("精算（settlement）", () => {
    it("差額の半分を、多く払った人へ渡す", () => {
      const result = splitByPayer(
        [row("expense", 8000, "p1"), row("expense", 2000, "p2")],
        TWO,
      );
      expect(result.settlement).toEqual({
        fromName: "たっつ",
        toName: "はなこ",
        amount: 3000,
      });
    });

    it("1 円未満は切り捨てる", () => {
      const result = splitByPayer(
        [row("expense", 1001, "p1"), row("expense", 0 + 0, "p2")],
        TWO,
      );
      // 差 1001 の半分 → 500.5 → 500
      expect(result.settlement?.amount).toBe(500);
    });

    it("同額なら精算なし", () => {
      const result = splitByPayer(
        [row("expense", 5000, "p1"), row("expense", 5000, "p2")],
        TWO,
      );
      expect(result.settlement).toBeNull();
    });

    // 支払者が分からない行があると、誰が払ったかが確定しない
    it("支払者が未指定の行があれば精算を出さない", () => {
      const result = splitByPayer(
        [row("expense", 8000, "p1"), row("expense", 300, null)],
        TWO,
      );
      expect(result.settlement).toBeNull();
    });

    it("1 人の世帯では精算を出さない", () => {
      const result = splitByPayer(
        [row("expense", 8000, "p1")],
        [{ id: "p1", displayName: "たっつ" }],
      );
      expect(result.settlement).toBeNull();
    });

    // 3 人以上は「誰が誰にいくら」の組み合わせが増え、分担の考え方も増える
    it("3 人以上の世帯では精算を出さない", () => {
      const result = splitByPayer(
        [row("expense", 9000, "p1")],
        [...TWO, { id: "p3", displayName: "たろう" }],
      );
      expect(result.settlement).toBeNull();
    });
  });
});
