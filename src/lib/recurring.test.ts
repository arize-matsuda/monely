import { describe, expect, it } from "vitest";
import { toDateKey } from "./month";
import { recurringCandidates, shiftToMonth } from "./recurring";
import type { Kind } from "./types";

function row(options: {
  dateKey: string;
  amount?: number;
  categoryId?: string | null;
  recurring?: boolean;
  kind?: Kind;
  memo?: string | null;
  paidById?: string | null;
  categoryName?: string;
}) {
  return {
    kind: options.kind ?? ("expense" as Kind),
    amount: options.amount ?? 85000,
    occurredOn: new Date(`${options.dateKey}T00:00:00.000Z`),
    categoryId: options.categoryId === undefined ? "c1" : options.categoryId,
    category:
      options.categoryId === null
        ? null
        : { name: options.categoryName ?? "家賃" },
    paidById: options.paidById ?? null,
    memo: options.memo ?? null,
    recurring: options.recurring ?? true,
  };
}

describe("shiftToMonth", () => {
  it("同じ日に写す", () => {
    expect(
      toDateKey(shiftToMonth(new Date("2026-10-25T00:00:00.000Z"), "2026-11")),
    ).toBe("2026-11-25");
  });

  // 1/31 → 2/31 は存在しない
  it("その月に無い日は末日に寄せる", () => {
    expect(
      toDateKey(shiftToMonth(new Date("2026-01-31T00:00:00.000Z"), "2026-02")),
    ).toBe("2026-02-28");
  });

  it("うるう年の 2 月は 29 日まで", () => {
    expect(
      toDateKey(shiftToMonth(new Date("2028-01-31T00:00:00.000Z"), "2028-02")),
    ).toBe("2028-02-29");
  });

  it("31 日の月から 30 日の月へ", () => {
    expect(
      toDateKey(shiftToMonth(new Date("2026-03-31T00:00:00.000Z"), "2026-04")),
    ).toBe("2026-04-30");
  });

  it("1 日はそのまま", () => {
    expect(
      toDateKey(shiftToMonth(new Date("2026-10-01T00:00:00.000Z"), "2026-11")),
    ).toBe("2026-11-01");
  });

  it("年をまたげる", () => {
    expect(
      toDateKey(shiftToMonth(new Date("2026-12-25T00:00:00.000Z"), "2027-01")),
    ).toBe("2027-01-25");
  });

  it("UTC 0 時を返す（@db.Date と揃える）", () => {
    expect(
      shiftToMonth(
        new Date("2026-10-25T00:00:00.000Z"),
        "2026-11",
      ).toISOString(),
    ).toBe("2026-11-25T00:00:00.000Z");
  });
});

describe("recurringCandidates", () => {
  it("印が付いた先月の記録を今月に写す", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", amount: 85000, categoryId: "c1" })],
      [],
      "2026-11",
    );
    expect(result).toHaveLength(1);
    expect(toDateKey(result[0]?.occurredOn as Date)).toBe("2026-11-25");
    expect(result[0]?.amount).toBe(85000);
    expect(toDateKey(result[0]?.sourceOccurredOn as Date)).toBe("2026-10-25");
  });

  it("印が無い記録は写さない", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", recurring: false })],
      [],
      "2026-11",
    );
    expect(result).toEqual([]);
  });

  // 手で入れたあとに押しても増えないようにする
  it("同じカテゴリ・同じ金額が今月にあれば写さない", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", amount: 85000, categoryId: "c1" })],
      [row({ dateKey: "2026-11-01", amount: 85000, categoryId: "c1" })],
      "2026-11",
    );
    expect(result).toEqual([]);
  });

  it("金額が違えば写す", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", amount: 85000, categoryId: "c1" })],
      [row({ dateKey: "2026-11-01", amount: 4980, categoryId: "c1" })],
      "2026-11",
    );
    expect(result).toHaveLength(1);
  });

  it("カテゴリが違えば写す", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", amount: 85000, categoryId: "c1" })],
      [row({ dateKey: "2026-11-01", amount: 85000, categoryId: "c2" })],
      "2026-11",
    );
    expect(result).toHaveLength(1);
  });

  it("日付の早い順に並ぶ", () => {
    const result = recurringCandidates(
      [
        row({ dateKey: "2026-10-25", amount: 1, categoryId: "c1" }),
        row({ dateKey: "2026-10-05", amount: 2, categoryId: "c2" }),
        row({ dateKey: "2026-10-15", amount: 3, categoryId: "c3" }),
      ],
      [],
      "2026-11",
    );
    expect(result.map((r) => toDateKey(r.occurredOn))).toEqual([
      "2026-11-05",
      "2026-11-15",
      "2026-11-25",
    ]);
  });

  it("カテゴリ・支払者・メモを引き継ぐ", () => {
    const result = recurringCandidates(
      [
        row({
          dateKey: "2026-10-25",
          categoryId: "c1",
          paidById: "p1",
          memo: "家賃",
        }),
      ],
      [],
      "2026-11",
    );
    expect(result[0]).toMatchObject({
      categoryId: "c1",
      paidById: "p1",
      memo: "家賃",
    });
  });

  it("収入の定期（給与など）も写す", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", kind: "income", amount: 320000 })],
      [],
      "2026-11",
    );
    expect(result[0]?.kind).toBe("income");
  });

  it("未分類の定期も写せる（カテゴリ null で突き合わせる）", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", categoryId: null, amount: 500 })],
      [row({ dateKey: "2026-11-01", categoryId: null, amount: 500 })],
      "2026-11",
    );
    // 同じ「未分類 + 500 円」が今月にあるので写さない
    expect(result).toEqual([]);
  });

  it("先月が空なら候補なし", () => {
    expect(recurringCandidates([], [], "2026-11")).toEqual([]);
  });

  it("月末の記録は写し先の末日に寄る", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-01-31" })],
      [],
      "2026-02",
    );
    expect(toDateKey(result[0]?.occurredOn as Date)).toBe("2026-02-28");
  });
});

describe("recurringCandidates のカテゴリ名", () => {
  it("画面に出す名前を持つ", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", categoryName: "住居" })],
      [],
      "2026-11",
    );
    expect(result[0]?.categoryName).toBe("住居");
  });

  it("未分類は null", () => {
    const result = recurringCandidates(
      [row({ dateKey: "2026-10-25", categoryId: null })],
      [],
      "2026-11",
    );
    expect(result[0]?.categoryName).toBeNull();
  });
});
