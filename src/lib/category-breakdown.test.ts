import { describe, expect, it } from "vitest";
import { breakdownByCategory, UNCATEGORIZED_LABEL } from "./category-breakdown";
import type { Kind } from "./types";

function row(
  kind: Kind,
  amount: number,
  category: string | null,
  categoryId: string | null = category,
) {
  return {
    kind,
    amount,
    categoryId,
    category: category === null ? null : { name: category },
  };
}

describe("breakdownByCategory", () => {
  it("カテゴリごとに支出を合計する", () => {
    const result = breakdownByCategory([
      row("expense", 1000, "食費"),
      row("expense", 500, "食費"),
      row("expense", 300, "交通"),
    ]);
    expect(result).toEqual([
      { categoryId: "食費", name: "食費", total: 1500, ratio: 1500 / 1800 },
      { categoryId: "交通", name: "交通", total: 300, ratio: 300 / 1800 },
    ]);
  });

  it("金額の多い順に並ぶ", () => {
    const result = breakdownByCategory([
      row("expense", 100, "交通"),
      row("expense", 900, "住居"),
      row("expense", 500, "食費"),
    ]);
    expect(result.map((r) => r.name)).toEqual(["住居", "食費", "交通"]);
  });

  // 同額のときに並びが毎回変わると「動いて見える」ので、名前で固定する。
  // localeCompare(ja) は**読み順**（いふく → いりょう → こうつう）。
  // 文字コード順ではない
  it("同額なら名前の読み順（表示が入れ替わらない）", () => {
    const result = breakdownByCategory([
      row("expense", 100, "交通"),
      row("expense", 100, "医療"),
      row("expense", 100, "衣服"),
    ]);
    expect(result.map((r) => r.name)).toEqual(["衣服", "医療", "交通"]);
  });

  it("収入は対象にしない", () => {
    const result = breakdownByCategory([
      row("expense", 1000, "食費"),
      row("income", 300000, "給与"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("食費");
    // 割合の分母に収入を含めない
    expect(result[0]?.ratio).toBe(1);
  });

  it("カテゴリが無い記録は未分類にまとめる", () => {
    const result = breakdownByCategory([
      row("expense", 200, null, null),
      row("expense", 300, null, null),
    ]);
    expect(result).toEqual([
      {
        categoryId: null,
        name: UNCATEGORIZED_LABEL,
        total: 500,
        ratio: 1,
      },
    ]);
  });

  it("未分類と通常のカテゴリが混ざっても分かれる", () => {
    const result = breakdownByCategory([
      row("expense", 1000, "食費"),
      row("expense", 200, null, null),
    ]);
    expect(result.map((r) => r.name)).toEqual(["食費", UNCATEGORIZED_LABEL]);
  });

  it("支出が無ければ空配列（0 で割らない）", () => {
    expect(breakdownByCategory([])).toEqual([]);
    expect(breakdownByCategory([row("income", 300000, "給与")])).toEqual([]);
  });

  it("割合の合計が 1 になる", () => {
    const result = breakdownByCategory([
      row("expense", 1234, "食費"),
      row("expense", 5678, "住居"),
      row("expense", 9012, "交通"),
    ]);
    const sum = result.reduce((total, r) => total + r.ratio, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  // 同じ名前で別 ID のカテゴリは分けて数える（改名の途中など）
  it("ID が違えば同名でも別に数える", () => {
    const result = breakdownByCategory([
      row("expense", 100, "食費", "c1"),
      row("expense", 200, "食費", "c2"),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.total)).toEqual([200, 100]);
  });
});
