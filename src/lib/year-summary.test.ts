import { describe, expect, it } from "vitest";
import type { Kind } from "./types";
import { summarizeYear } from "./year-summary";

function row(dateKey: string, kind: Kind, amount: number) {
  return {
    occurredOn: new Date(`${dateKey}T00:00:00.000Z`),
    kind,
    amount,
  };
}

describe("summarizeYear", () => {
  it("記録が無くても 12 か月すべて返す", () => {
    const result = summarizeYear(2026, []);
    expect(result.months).toHaveLength(12);
    expect(result.months[0]?.month).toBe("2026-01");
    expect(result.months[11]?.month).toBe("2026-12");
    expect(result.months.every((m) => m.empty)).toBe(true);
    expect(result.total).toEqual({ expense: 0, income: 0, balance: 0 });
    expect(result.maxExpense).toBe(0);
  });

  it("月ごとに振り分けて合計する", () => {
    const result = summarizeYear(2026, [
      row("2026-01-15", "expense", 1000),
      row("2026-01-20", "expense", 500),
      row("2026-03-01", "expense", 300),
      row("2026-03-01", "income", 320000),
    ]);
    expect(result.months[0]?.summary).toEqual({
      expense: 1500,
      income: 0,
      balance: -1500,
    });
    expect(result.months[2]?.summary).toEqual({
      expense: 300,
      income: 320000,
      balance: 319700,
    });
    // 2 月は記録なし
    expect(result.months[1]?.empty).toBe(true);
  });

  it("記録のある月は empty にならない", () => {
    const result = summarizeYear(2026, [row("2026-05-01", "expense", 100)]);
    expect(result.months[4]?.empty).toBe(false);
    expect(result.months[3]?.empty).toBe(true);
  });

  it("年間の合計を返す", () => {
    const result = summarizeYear(2026, [
      row("2026-01-15", "expense", 1000),
      row("2026-07-15", "expense", 2000),
      row("2026-12-31", "income", 5000),
    ]);
    expect(result.total).toEqual({
      expense: 3000,
      income: 5000,
      balance: 2000,
    });
  });

  it("棒の基準は支出が最も多い月の額", () => {
    const result = summarizeYear(2026, [
      row("2026-01-15", "expense", 1000),
      row("2026-07-15", "expense", 9000),
      // 収入は基準に影響しない
      row("2026-08-15", "income", 999999),
    ]);
    expect(result.maxExpense).toBe(9000);
  });

  // 月末・月初は UTC で判定する（@db.Date は UTC 0 時で返る）
  it("月末と月初が正しい月に入る", () => {
    const result = summarizeYear(2026, [
      row("2026-01-31", "expense", 100),
      row("2026-02-01", "expense", 200),
    ]);
    expect(result.months[0]?.summary.expense).toBe(100);
    expect(result.months[1]?.summary.expense).toBe(200);
  });

  it("12 月 31 日がその年に入る", () => {
    const result = summarizeYear(2026, [row("2026-12-31", "expense", 100)]);
    expect(result.months[11]?.summary.expense).toBe(100);
    expect(result.total.expense).toBe(100);
  });

  // DAL が年で絞るので通常は起きないが、混ざっても月の枠は壊れない
  it("他の年の行は 12 か月の枠に入らない", () => {
    const result = summarizeYear(2026, [
      row("2026-01-15", "expense", 100),
      row("2025-12-31", "expense", 9999),
    ]);
    expect(result.months.map((m) => m.summary.expense)).toEqual([
      100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    // total は渡された行すべての合計（DAL が絞る前提）
    expect(result.total.expense).toBe(10099);
  });
});
