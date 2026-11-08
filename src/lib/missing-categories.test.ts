import { describe, expect, it } from "vitest";
import { missingCategories } from "./missing-categories";
import type { Kind } from "./types";

function row(
  kind: Kind,
  amount: number,
  categoryId: string | null,
  name: string | null = categoryId,
) {
  return {
    kind,
    amount,
    categoryId,
    category: name === null ? null : { name },
  };
}

describe("missingCategories", () => {
  it("先月にあって今月に無いカテゴリを返す", () => {
    const result = missingCategories(
      [row("expense", 1000, "c1", "食費")],
      [row("expense", 1000, "c1", "食費"), row("expense", 4980, "c2", "通信")],
    );
    expect(result).toEqual([
      { categoryId: "c2", name: "通信", previousTotal: 4980 },
    ]);
  });

  it("今月に 1 件でもあれば候補にしない", () => {
    const result = missingCategories(
      [row("expense", 1, "c2", "通信")],
      [row("expense", 4980, "c2", "通信")],
    );
    expect(result).toEqual([]);
  });

  it("金額の大きい順に並ぶ", () => {
    const result = missingCategories(
      [],
      [
        row("expense", 4980, "c2", "通信"),
        row("expense", 85000, "c3", "住居"),
        row("expense", 1200, "c4", "新聞"),
      ],
    );
    expect(result.map((r) => r.name)).toEqual(["住居", "通信", "新聞"]);
  });

  it("先月の同じカテゴリは合計する", () => {
    const result = missingCategories(
      [],
      [row("expense", 1000, "c2", "通信"), row("expense", 2000, "c2", "通信")],
    );
    expect(result[0]?.previousTotal).toBe(3000);
  });

  it("収入は候補にしない", () => {
    const result = missingCategories([], [row("income", 320000, "c9", "給与")]);
    expect(result).toEqual([]);
  });

  // 「何を入れ忘れたか」が伝わらないので候補から外す
  it("未分類は候補にしない", () => {
    const result = missingCategories([], [row("expense", 500, null, null)]);
    expect(result).toEqual([]);
  });

  it("先月が空なら空配列", () => {
    expect(missingCategories([row("expense", 100, "c1")], [])).toEqual([]);
  });

  it("今月が空なら先月の支出カテゴリがすべて候補になる", () => {
    const result = missingCategories(
      [],
      [row("expense", 1000, "c1", "食費"), row("expense", 4980, "c2", "通信")],
    );
    expect(result).toHaveLength(2);
  });

  // 今月に収入しか無い場合、支出カテゴリは「まだ無い」と見なす
  it("今月の収入は支出の判定に影響しない", () => {
    const result = missingCategories(
      [row("income", 320000, "c9", "給与")],
      [row("expense", 4980, "c2", "通信")],
    );
    expect(result.map((r) => r.name)).toEqual(["通信"]);
  });
});
