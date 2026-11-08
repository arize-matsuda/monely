/**
 * 月と日付の計算・整形。**日付の扱いはすべてここを通す。**
 *
 * ★ 最重要の注意 ★
 * Prisma の `@db.Date` は **UTC 0 時の `Date`** で返る（例: 2026-11-07T00:00:00.000Z）。
 * ローカルタイムで整形すると、負のオフセットの環境で**前日になる**。
 * JST（UTC+9）では偶然一致するため、日本で開発している限りバグが隠れる。
 *
 * そのため **`occurredOn` の整形は必ず UTC で行う**（getUTCMonth / getUTCDate）。
 * → docs/02-design/database-design.md §5.2
 */

/** `"2026-11"` 形式の月 */
export type Month = string;

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 月として妥当か */
export function isMonth(value: unknown): value is Month {
  if (typeof value !== "string") return false;
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/**
 * 「今日」が属する月。URL に `?m=` が無いときの既定（FR-L1）。
 *
 * **`now` は必須。** 既定引数で `new Date()` を読むと、
 * `cacheComponents` 有効下でプリレンダリング中のエラーになる。
 * 呼び出し側は `requestNow()`（src/lib/clock.ts）から渡す。
 */
export function currentMonth(now: Date): Month {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

/** URL の `?m=` を月に解釈する。不正な値は当月として扱う（AC-7） */
export function parseMonth(value: unknown, now: Date): Month {
  return isMonth(value) ? value : currentMonth(now);
}

/**
 * 月の範囲。`occurredOn` の検索に使う。
 * **UTC 0 時の境界**を返す（`@db.Date` の値と揃える）。
 */
export function monthRange(month: Month): { start: Date; nextStart: Date } {
  const [year, m] = splitMonth(month);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    nextStart: new Date(Date.UTC(year, m, 1)),
  };
}

export function prevMonth(month: Month): Month {
  const [year, m] = splitMonth(month);
  return m === 1 ? `${year - 1}-12` : `${year}-${pad(m - 1)}`;
}

export function nextMonth(month: Month): Month {
  const [year, m] = splitMonth(month);
  return m === 12 ? `${year + 1}-01` : `${year}-${pad(m + 1)}`;
}

/** `"2026-11"` → `"2026年11月"` */
export function formatMonth(month: Month): string {
  const [year, m] = splitMonth(month);
  return `${year}年${m}月`;
}

/**
 * 日付の見出し。`"11月7日 (金)"`。当日は `"今日"`、前日は `"昨日"`（UI/UX設計 §6.2）。
 *
 * `date` は Prisma が返す UTC 0 時の `Date`。**UTC で取り出す。**
 * `today` はその端末の「今日」（ローカルタイム）。
 */
export function formatDateLabel(date: Date, today: Date): string {
  const key = toDateKey(date);
  if (key === localDateKey(today)) return "今日";
  if (key === localDateKey(addDays(today, -1))) return "昨日";
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日 (${WEEKDAYS[date.getUTCDay()]})`;
}

/** `Date` → `"2026-11-07"`。**UTC で取り出す**（`@db.Date` 用） */
export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** `Date` → `"2026-11-07"`。その端末のローカルタイムで取り出す（「今日」の判定用） */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `"2026-11-07"` → UTC 0 時の `Date`。**書き込み時に使う。**
 * `new Date(2026, 10, 7)`（ローカル 0 時）を使うと DB に入る日付がずれうる。
 */
export function parseDateKey(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  // 2026-02-31 のような存在しない日付を弾く（Date は繰り上げてしまう）
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** 「今日」を `"2026-11-07"` で返す。入力の既定値に使う（FR-T3） */
export function todayKey(now: Date): string {
  return localDateKey(now);
}

/**
 * `now` から `days` 日前の、**UTC 0 時**の `Date`。
 *
 * `@db.Date` の列（`occurredOn`）と比べるので UTC で揃える。
 * 「今日」は `localDateKey`（JST）で判定するが、ここは期間の下限なので
 * 1 日のずれが結果を大きく変えない。揃えることを優先する。
 *
 * カテゴリの使用頻度の集計期間に使う（UI/UX設計 §5.3）。
 */
export function daysAgo(now: Date, days: number): Date {
  const date = parseDateKey(localDateKey(now));
  if (!date) {
    // localDateKey は必ず YYYY-MM-DD を返すので、ここには来ない
    throw new Error(`日付として読めない: ${now.toISOString()}`);
  }
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

/**
 * 日付入力のショートカット（UI/UX設計 §5.5）。
 * 「今日」「昨日」で入力の 9 割が済むので、カレンダーを開かせない。
 */
export function dateShortcuts(now: Date): { label: string; value: string }[] {
  return [
    { label: "今日", value: toDateKey(daysAgo(now, 0)) },
    { label: "昨日", value: toDateKey(daysAgo(now, 1)) },
  ];
}

/** `Date` → `"2026/11/07"`（編集画面の表示） */
export function formatDateSlashed(date: Date): string {
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`;
}

/** 日付がどの月に属するか。UTC で判定する */
export function monthOf(date: Date): Month {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function splitMonth(month: Month): [number, number] {
  const match = MONTH_PATTERN.exec(month);
  if (!match) throw new Error(`月の形式が不正です: ${month}`);
  return [Number(match[1]), Number(match[2])];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
