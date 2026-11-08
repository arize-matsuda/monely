import { describe, expect, it } from "vitest";
import {
  compareAmount,
  formatAmount,
  formatBalance,
  formatDiff,
  formatDiffRatio,
  formatIncome,
  formatYen,
  sumExpense,
  summarize,
} from "./money";

describe("formatYen", () => {
  it("3 桁区切りの円表示にする", () => {
    expect(formatYen(1280)).toBe("¥1,280");
    expect(formatYen(320000)).toBe("¥320,000");
  });

  it("1 桁と 0 も扱える", () => {
    expect(formatYen(1)).toBe("¥1");
    expect(formatYen(0)).toBe("¥0");
  });

  it("上限（9,999,999）を扱える", () => {
    expect(formatYen(9_999_999)).toBe("¥9,999,999");
  });
});

describe("formatIncome", () => {
  it("+ を付ける", () => {
    expect(formatIncome(320000)).toBe("+¥320,000");
  });
});

describe("formatBalance", () => {
  it("プラスには + を付ける", () => {
    expect(formatBalance(137600)).toBe("+¥137,600");
  });

  it("マイナスには全角マイナスを付け、金額は絶対値で出す", () => {
    expect(formatBalance(-12000)).toBe("−¥12,000");
  });

  it("0 は符号なし", () => {
    expect(formatBalance(0)).toBe("¥0");
  });
});

describe("formatAmount", () => {
  it("支出は符号なし、収入は + 付き", () => {
    expect(formatAmount(1280, "expense")).toBe("¥1,280");
    expect(formatAmount(320000, "income")).toBe("+¥320,000");
  });
});

describe("summarize", () => {
  it("種別ごとに足して差額を出す", () => {
    const rows = [
      { kind: "expense" as const, amount: 1280 },
      { kind: "expense" as const, amount: 2900 },
      { kind: "income" as const, amount: 320000 },
    ];
    expect(summarize(rows)).toEqual({
      expense: 4180,
      income: 320000,
      balance: 315820,
    });
  });

  it("空なら全て 0", () => {
    expect(summarize([])).toEqual({ expense: 0, income: 0, balance: 0 });
  });

  it("支出が収入を超えると差額が負になる", () => {
    const rows = [
      { kind: "expense" as const, amount: 50000 },
      { kind: "income" as const, amount: 30000 },
    ];
    expect(summarize(rows).balance).toBe(-20000);
  });

  it("整数のまま計算し、誤差が出ない", () => {
    // 1 円を 10,000 回足しても 10000 になる（浮動小数点なら誤差が出る形）
    const rows = Array.from({ length: 10_000 }, () => ({
      kind: "expense" as const,
      amount: 1,
    }));
    expect(summarize(rows).expense).toBe(10_000);
    expect(Number.isInteger(summarize(rows).expense)).toBe(true);
  });
});

describe("sumExpense", () => {
  it("支出だけを足す（収入は無視する）", () => {
    const rows = [
      { kind: "expense" as const, amount: 1280 },
      { kind: "income" as const, amount: 320000 },
      { kind: "expense" as const, amount: 180 },
    ];
    expect(sumExpense(rows)).toBe(1460);
  });
});

describe("compareAmount", () => {
  it("増えた分を返す", () => {
    expect(compareAmount(190000, 180000)).toEqual({
      diff: 10000,
      ratio: 10000 / 180000,
    });
  });

  it("減った分は負で返す", () => {
    expect(compareAmount(170000, 180000)).toEqual({
      diff: -10000,
      ratio: -10000 / 180000,
    });
  });

  it("同じなら 0", () => {
    expect(compareAmount(180000, 180000)).toEqual({ diff: 0, ratio: 0 });
  });

  // 0 で割らない。0 からの増加に割合は無い
  it("先月が 0 なら割合は null", () => {
    expect(compareAmount(1280, 0)).toEqual({ diff: 1280, ratio: null });
  });

  it("今月が 0 なら −100%", () => {
    expect(compareAmount(0, 180000)).toEqual({ diff: -180000, ratio: -1 });
  });

  it("両方 0 なら差も 0、割合は null", () => {
    expect(compareAmount(0, 0)).toEqual({ diff: 0, ratio: null });
  });
});

describe("formatDiff", () => {
  it("符号を付ける", () => {
    expect(formatDiff(12400)).toBe("+¥12,400");
    expect(formatDiff(-8400)).toBe("−¥8,400");
  });

  it("0 は「変わらず」", () => {
    expect(formatDiff(0)).toBe("変わらず");
  });

  it("マイナスは全角（半角ハイフンと混ぜない）", () => {
    expect(formatDiff(-100)).toContain("−");
    expect(formatDiff(-100)).not.toContain("-");
  });
});

describe("formatDiffRatio", () => {
  it("整数の % にする", () => {
    expect(formatDiffRatio(0.07)).toBe("+7%");
    expect(formatDiffRatio(-0.123)).toBe("−12%");
  });

  it("四捨五入する", () => {
    expect(formatDiffRatio(0.126)).toBe("+13%");
    expect(formatDiffRatio(0.124)).toBe("+12%");
  });

  it("0 は符号なし", () => {
    expect(formatDiffRatio(0)).toBe("0%");
  });

  it("1 倍を超えても出せる", () => {
    expect(formatDiffRatio(2.5)).toBe("+250%");
  });
});
