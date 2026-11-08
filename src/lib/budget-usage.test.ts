import { describe, expect, it } from "vitest";
import { budgetUsage, totalBudgetUsage } from "./budget-usage";

const BUDGETS = new Map([
  ["c1", 50000],
  ["c2", 10000],
]);

describe("budgetUsage", () => {
  it("消化率と残りを返す", () => {
    expect(budgetUsage(BUDGETS, "c1", 42500)).toEqual({
      budget: 50000,
      spent: 42500,
      ratio: 0.85,
      over: false,
      remaining: 7500,
    });
  });

  it("超過を検出し、残りを負で返す", () => {
    const usage = budgetUsage(BUDGETS, "c2", 12000);
    expect(usage).toMatchObject({ over: true, remaining: -2000 });
    expect(usage?.ratio).toBeCloseTo(1.2, 10);
  });

  it("ちょうど予算どおりは超過ではない", () => {
    expect(budgetUsage(BUDGETS, "c1", 50000)).toMatchObject({
      over: false,
      ratio: 1,
      remaining: 0,
    });
  });

  it("予算を設定していないカテゴリは null", () => {
    expect(budgetUsage(BUDGETS, "c9", 1000)).toBeNull();
  });

  it("未分類は null", () => {
    expect(budgetUsage(BUDGETS, null, 1000)).toBeNull();
  });

  it("予算が 0 のカテゴリは null（0 で割らない）", () => {
    expect(budgetUsage(new Map([["c1", 0]]), "c1", 1000)).toBeNull();
  });
});

describe("totalBudgetUsage", () => {
  it("予算の合計と、その範囲の支出を集計する", () => {
    expect(
      totalBudgetUsage(BUDGETS, [
        { categoryId: "c1", total: 42500 },
        { categoryId: "c2", total: 5000 },
      ]),
    ).toMatchObject({ budget: 60000, spent: 47500, over: false });
  });

  // 混ぜると「使いすぎ」なのか「予算外の支出」なのか分からなくなる
  it("予算を設定していないカテゴリの支出は含めない", () => {
    expect(
      totalBudgetUsage(BUDGETS, [
        { categoryId: "c1", total: 42500 },
        { categoryId: "c9", total: 999999 },
      ]),
    ).toMatchObject({ budget: 60000, spent: 42500 });
  });

  it("未分類の支出も含めない", () => {
    expect(
      totalBudgetUsage(BUDGETS, [
        { categoryId: "c1", total: 1000 },
        { categoryId: null, total: 999999 },
      ]),
    ).toMatchObject({ spent: 1000 });
  });

  it("予算が 1 件も無ければ null", () => {
    expect(
      totalBudgetUsage(new Map(), [{ categoryId: "c1", total: 1 }]),
    ).toBeNull();
  });

  it("支出が無くても予算があれば返す", () => {
    expect(totalBudgetUsage(BUDGETS, [])).toMatchObject({
      budget: 60000,
      spent: 0,
      ratio: 0,
      over: false,
      remaining: 60000,
    });
  });

  it("超過を検出する", () => {
    expect(
      totalBudgetUsage(BUDGETS, [{ categoryId: "c1", total: 70000 }]),
    ).toMatchObject({ over: true, remaining: -10000 });
  });
});
