import { describe, expect, it } from "vitest";
import { groupByDate } from "./transaction-groups";
import type { Kind } from "./types";

function row(date: string, amount: number, kind: Kind = "expense") {
  return { occurredOn: new Date(`${date}T00:00:00.000Z`), amount, kind };
}

describe("groupByDate", () => {
  it("同じ日付をまとめる", () => {
    const groups = groupByDate([
      row("2026-11-07", 1280),
      row("2026-11-07", 180),
      row("2026-11-06", 3200),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.dateKey).toBe("2026-11-07");
    expect(groups[0]?.rows).toHaveLength(2);
    expect(groups[1]?.dateKey).toBe("2026-11-06");
    expect(groups[1]?.rows).toHaveLength(1);
  });

  it("日付の新しい順に並ぶ", () => {
    const groups = groupByDate([
      row("2026-11-01", 100),
      row("2026-11-20", 100),
      row("2026-11-10", 100),
    ]);
    expect(groups.map((g) => g.dateKey)).toEqual([
      "2026-11-20",
      "2026-11-10",
      "2026-11-01",
    ]);
  });

  it("月や年をまたいでも新しい順に並ぶ", () => {
    const groups = groupByDate([
      row("2025-12-31", 100),
      row("2026-01-01", 100),
      row("2026-01-02", 100),
    ]);
    expect(groups.map((g) => g.dateKey)).toEqual([
      "2026-01-02",
      "2026-01-01",
      "2025-12-31",
    ]);
  });

  it("グループ内の並びは入力の順を保つ", () => {
    const groups = groupByDate([
      row("2026-11-07", 1),
      row("2026-11-07", 2),
      row("2026-11-07", 3),
    ]);
    expect(groups[0]?.rows.map((r) => r.amount)).toEqual([1, 2, 3]);
  });

  it("その日の支出合計を出す（収入は含めない）", () => {
    const groups = groupByDate([
      row("2026-11-07", 1280),
      row("2026-11-07", 180),
      row("2026-11-07", 320000, "income"),
    ]);
    expect(groups[0]?.expenseTotal).toBe(1460);
  });

  it("収入だけの日は支出合計が 0", () => {
    const groups = groupByDate([row("2026-11-06", 320000, "income")]);
    expect(groups[0]?.expenseTotal).toBe(0);
  });

  it("空の入力は空の配列", () => {
    expect(groupByDate([])).toEqual([]);
  });

  it("見出し用の date は UTC で同じ日付を指す", () => {
    const groups = groupByDate([row("2026-11-07", 100)]);
    expect(groups[0]?.date.toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });
});
