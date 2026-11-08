import { parseDateKey } from "./month";
import { type ActionResult, fail, type Kind, ok } from "./types";

/**
 * 入力検証。**サーバー側で必ず通す。** クライアント側の検証は利便性のためのもの。
 * → docs/03-guidelines/security-guidelines.md §7
 */

const FULLWIDTH_DIGITS = /[０-９]/g;
const FULLWIDTH_ALNUM = /[０-９Ａ-Ｚａ-ｚ]/g;

/** 全角と半角のコードポイントの差 */
const FULLWIDTH_OFFSET = 0xfee0;

function toHalfWidth(c: string): string {
  return String.fromCharCode(c.charCodeAt(0) - FULLWIDTH_OFFSET);
}

/** 全角数字を半角に直す。スマホの日本語キーボードで混入しやすい */
export function normalizeDigits(input: string): string {
  return input.replace(FULLWIDTH_DIGITS, toHalfWidth);
}

/**
 * 全角の英数字を半角に直す。
 *
 * **招待コードのような「英数字しか取り得ない項目」専用。**
 * メモや名前には使わない（意図した全角表記を壊してしまう）。
 */
export function normalizeAlnum(input: string): string {
  return input.replace(FULLWIDTH_ALNUM, toHalfWidth);
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function parseText(
  value: FormDataEntryValue | null,
  options: { field: string; label: string; min: number; max: number },
): ActionResult<string> {
  const text = asString(value).trim();
  if (text.length < options.min) {
    return fail(
      "VALIDATION",
      `${options.label}を入力してください`,
      options.field,
    );
  }
  if (text.length > options.max) {
    return fail(
      "VALIDATION",
      `${options.label}は ${options.max} 文字以内で入力してください`,
      options.field,
    );
  }
  return ok(text);
}

export function parseOptionalText(
  value: FormDataEntryValue | null,
  options: { field: string; label: string; max: number },
): ActionResult<string | null> {
  const text = asString(value).trim();
  if (text.length === 0) return ok(null);
  if (text.length > options.max) {
    return fail(
      "VALIDATION",
      `${options.label}は ${options.max} 文字以内で入力してください`,
      options.field,
    );
  }
  return ok(text);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(
  value: FormDataEntryValue | null,
): ActionResult<string> {
  const email = asString(value).trim();
  if (email.length === 0) {
    return fail("VALIDATION", "メールアドレスを入力してください", "email");
  }
  if (email.length > 254 || !EMAIL.test(email)) {
    return fail(
      "VALIDATION",
      "メールアドレスの形式が正しくありません",
      "email",
    );
  }
  return ok(email);
}

const INVITE_CODE = /^[A-Z0-9]{6}$/;

/**
 * 招待コード。小文字で入力されても大文字に直して照合する。
 * 全角で入力されても受け入れる（英数字しか取り得ない項目なので正規化して困らない）。
 */
export function parseInviteCode(
  value: FormDataEntryValue | null,
): ActionResult<string> {
  const code = normalizeAlnum(asString(value)).trim().toUpperCase();
  if (code.length === 0) {
    return fail("VALIDATION", "招待コードを入力してください", "inviteCode");
  }
  if (!INVITE_CODE.test(code)) {
    return fail("VALIDATION", "招待コードは 6 桁の英数字です", "inviteCode");
  }
  return ok(code);
}

/** カテゴリ名の上限。schema.prisma の @db.VarChar(20) と合わせる */
export const MAX_CATEGORY_NAME = 20;

export const MAX_AMOUNT = 9_999_999;

/** 金額。1 以上の整数（円）。全角数字と桁区切りを許容する */
export function parseAmount(
  value: FormDataEntryValue | null,
): ActionResult<number> {
  const raw = normalizeDigits(asString(value)).trim().replace(/,/g, "");
  if (raw.length === 0) {
    return fail("VALIDATION", "金額を入力してください", "amount");
  }
  if (!/^\d+$/.test(raw)) {
    return fail("VALIDATION", "金額は数字で入力してください", "amount");
  }
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return fail("VALIDATION", "金額は 1 円以上で入力してください", "amount");
  }
  if (amount > MAX_AMOUNT) {
    return fail("VALIDATION", "金額が大きすぎます", "amount");
  }
  return ok(amount);
}

export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt の上限 */
export const MAX_PASSWORD_LENGTH = 72;

/**
 * パスワード。長さだけを要求し、文字種は要求しない。
 * 複雑さの要求は覚えにくいだけのパスワードを生みやすい。
 * → docs/05-decisions/ADR-0006-email-password-auth.md
 */
export function parsePassword(
  value: FormDataEntryValue | null,
  field = "password",
): ActionResult<string> {
  const password = asString(value);
  if (password.length === 0) {
    return fail("VALIDATION", "パスワードを入力してください", field);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(
      "VALIDATION",
      `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上で入力してください`,
      field,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return fail(
      "VALIDATION",
      `パスワードは ${MAX_PASSWORD_LENGTH} 文字以内で入力してください`,
      field,
    );
  }
  return ok(password);
}

/** 新規登録時の確認入力。打ち間違いで入れなくなるのを防ぐ */
export function parsePasswordConfirmation(
  password: string,
  value: FormDataEntryValue | null,
): ActionResult<string> {
  if (asString(value) !== password) {
    return fail(
      "VALIDATION",
      "確認用のパスワードが一致しません",
      "passwordConfirmation",
    );
  }
  return ok(password);
}

/** 種別。許可リストで照合する */
export function parseKind(
  value: FormDataEntryValue | null,
): ActionResult<Kind> {
  const kind = asString(value);
  if (kind === "expense" || kind === "income") return ok(kind);
  return fail("VALIDATION", "種別を選んでください", "kind");
}

/** 日付。`YYYY-MM-DD` を UTC 0 時の Date にする（@db.Date と揃える） */
export function parseOccurredOn(
  value: FormDataEntryValue | null,
): ActionResult<Date> {
  const raw = normalizeDigits(asString(value)).trim();
  if (raw.length === 0) {
    return fail("VALIDATION", "日付を入力してください", "occurredOn");
  }
  const date = parseDateKey(raw);
  if (!date) {
    return fail("VALIDATION", "日付の形式が正しくありません", "occurredOn");
  }
  return ok(date);
}

/** 任意の ID。空文字は null として扱う */
export function parseOptionalId(
  value: FormDataEntryValue | null,
  field: string,
): ActionResult<string | null> {
  const id = asString(value).trim();
  if (id.length === 0) return ok(null);
  // 形式の詳細は DAL の所属確認で弾かれるので、ここは長さだけ見る
  if (id.length > 64) {
    return fail("VALIDATION", "選択内容が正しくありません", field);
  }
  return ok(id);
}
