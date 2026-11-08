import { describe, expect, it } from "vitest";
import {
  currentMonth,
  formatDateLabel,
  formatDateSlashed,
  formatMonth,
  isMonth,
  localDateKey,
  monthOf,
  monthRange,
  nextMonth,
  parseDateKey,
  parseMonth,
  prevMonth,
  toDateKey,
  todayKey,
} from "./month";

/** Prisma の @db.Date が返す形（UTC 0 時） */
function dbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("isMonth", () => {
  it("妥当な月を受け入れる", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-01")).toBe(true);
    expect(isMonth("2026-12")).toBe(true);
  });

  it("不正な値を弾く", () => {
    for (const value of [
      "2026-00",
      "2026-13",
      "2026-1",
      "26-11",
      "2026/11",
      "abc",
      "",
      null,
      undefined,
      202611,
    ]) {
      expect(isMonth(value)).toBe(false);
    }
  });
});

describe("parseMonth", () => {
  const now = new Date(2026, 10, 7); // ローカルの 2026-11-07

  it("妥当な値はそのまま使う", () => {
    expect(parseMonth("2026-09", now)).toBe("2026-09");
  });

  it("不正な値は当月にする（AC-7）", () => {
    expect(parseMonth("abc", now)).toBe("2026-11");
    expect(parseMonth(undefined, now)).toBe("2026-11");
    expect(parseMonth("2026-13", now)).toBe("2026-11");
  });
});

describe("currentMonth", () => {
  it("ローカルタイムの年月を返す", () => {
    expect(currentMonth(new Date(2026, 0, 1))).toBe("2026-01");
    expect(currentMonth(new Date(2026, 11, 31))).toBe("2026-12");
  });
});

describe("monthRange", () => {
  it("UTC 0 時の境界を返す", () => {
    const { start, nextStart } = monthRange("2026-11");
    expect(start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(nextStart.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("12 月の次は翌年 1 月", () => {
    expect(monthRange("2026-12").nextStart.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("月末の記録が範囲に入り、翌月初は入らない（AC-7）", () => {
    const { start, nextStart } = monthRange("2026-10");
    const oct31 = dbDate("2026-10-31");
    const nov1 = dbDate("2026-11-01");
    expect(oct31 >= start && oct31 < nextStart).toBe(true);
    expect(nov1 >= start && nov1 < nextStart).toBe(false);
  });

  it("うるう年の 2 月を扱える", () => {
    const { start, nextStart } = monthRange("2028-02");
    const feb29 = dbDate("2028-02-29");
    expect(feb29 >= start && feb29 < nextStart).toBe(true);
  });
});

describe("prevMonth / nextMonth", () => {
  it("月をまたぐ", () => {
    expect(prevMonth("2026-11")).toBe("2026-10");
    expect(nextMonth("2026-11")).toBe("2026-12");
  });

  it("年をまたぐ", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("往復して元に戻る", () => {
    for (const m of ["2026-01", "2026-06", "2026-12"]) {
      expect(nextMonth(prevMonth(m))).toBe(m);
      expect(prevMonth(nextMonth(m))).toBe(m);
    }
  });
});

describe("formatMonth", () => {
  it("日本語の年月にする", () => {
    expect(formatMonth("2026-11")).toBe("2026年11月");
    expect(formatMonth("2026-01")).toBe("2026年1月");
  });
});

describe("formatDateLabel", () => {
  const today = new Date(2026, 10, 7); // ローカルの 2026-11-07（土）

  it("当日は「今日」", () => {
    expect(formatDateLabel(dbDate("2026-11-07"), today)).toBe("今日");
  });

  it("前日は「昨日」", () => {
    expect(formatDateLabel(dbDate("2026-11-06"), today)).toBe("昨日");
  });

  it("それ以外は月日と曜日", () => {
    expect(formatDateLabel(dbDate("2026-11-05"), today)).toBe("11月5日 (木)");
    expect(formatDateLabel(dbDate("2026-01-01"), today)).toBe("1月1日 (木)");
  });

  it("月初をまたぐ「昨日」を扱える", () => {
    const nov1 = new Date(2026, 10, 1);
    expect(formatDateLabel(dbDate("2026-10-31"), nov1)).toBe("昨日");
  });

  it("年をまたぐ「昨日」を扱える", () => {
    const jan1 = new Date(2026, 0, 1);
    expect(formatDateLabel(dbDate("2025-12-31"), jan1)).toBe("昨日");
  });
});

describe("toDateKey（UTC で取り出す）", () => {
  it("@db.Date の値をずれずに文字列化する", () => {
    expect(toDateKey(dbDate("2026-11-07"))).toBe("2026-11-07");
    expect(toDateKey(dbDate("2026-01-01"))).toBe("2026-01-01");
    expect(toDateKey(dbDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("ローカルタイムで取り出すと前日になりうることを示す", () => {
    const date = dbDate("2026-11-07");
    // UTC で取り出せば必ず 7 日
    expect(date.getUTCDate()).toBe(7);
    // ローカルで取り出すと、負のオフセットの環境では 6 日になる。
    // この差が「JST では偶然一致してバグが隠れる」原因
    const localDay = date.getDate();
    const offsetMinutes = date.getTimezoneOffset();
    expect(localDay).toBe(offsetMinutes > 0 ? 6 : 7);
  });
});

describe("parseDateKey", () => {
  it("UTC 0 時の Date にする", () => {
    expect(parseDateKey("2026-11-07")?.toISOString()).toBe(
      "2026-11-07T00:00:00.000Z",
    );
  });

  it("存在しない日付を弾く", () => {
    for (const value of [
      "2026-02-30",
      "2026-13-01",
      "2026-00-10",
      "2026-11-32",
      "2026-11-00",
    ]) {
      expect(parseDateKey(value)).toBeNull();
    }
  });

  it("形式が違う値を弾く", () => {
    for (const value of [
      "2026/11/07",
      "2026-11-7",
      "26-11-07",
      "",
      null,
      undefined,
      20261107,
    ]) {
      expect(parseDateKey(value)).toBeNull();
    }
  });

  it("うるう年を正しく判定する", () => {
    expect(parseDateKey("2028-02-29")).not.toBeNull(); // うるう年
    expect(parseDateKey("2026-02-29")).toBeNull(); // 平年
  });

  it("toDateKey と往復する", () => {
    for (const key of ["2026-01-01", "2026-11-07", "2026-12-31"]) {
      const date = parseDateKey(key);
      expect(date).not.toBeNull();
      expect(toDateKey(date as Date)).toBe(key);
    }
  });
});

describe("todayKey / localDateKey", () => {
  it("ローカルタイムの日付を返す", () => {
    expect(todayKey(new Date(2026, 10, 7))).toBe("2026-11-07");
    expect(localDateKey(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("formatDateSlashed", () => {
  it("ゼロ埋めしたスラッシュ区切りにする", () => {
    expect(formatDateSlashed(dbDate("2026-11-07"))).toBe("2026/11/07");
    expect(formatDateSlashed(dbDate("2026-01-01"))).toBe("2026/01/01");
  });
});

describe("monthOf", () => {
  it("日付の属する月を UTC で判定する", () => {
    expect(monthOf(dbDate("2026-11-07"))).toBe("2026-11");
    expect(monthOf(dbDate("2026-10-31"))).toBe("2026-10");
    expect(monthOf(dbDate("2026-11-01"))).toBe("2026-11");
  });
});
