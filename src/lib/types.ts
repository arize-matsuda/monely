import type { Kind } from "@/generated/prisma/client";

export type { Kind };

/** ログイン中のユーザー。世帯には未所属の可能性がある */
export type Me = {
  /** Supabase Auth のユーザー ID */
  userId: string;
  /** Monely 側の Profile.id。Transaction.paidById などが参照する */
  profileId: string;
  email: string | null;
  displayName: string;
  /** null = まだ世帯に未所属（セットアップ前） */
  householdId: string | null;
};

/** 世帯が確定しているユーザー */
export type Member = Me & { householdId: string };

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "NO_HOUSEHOLD"
  | "ALREADY_IN_HOUSEHOLD"
  | "INVALID_INVITE_CODE"
  | "NOT_FOUND"
  | "DB_ERROR"
  | "UNEXPECTED";

export type ActionError = {
  code: ErrorCode;
  /** 画面に出す日本語。何が起きたかと次にどうすればよいかを書く */
  message: string;
  /** 入力エラーのとき、対象の項目名（FormData のキー） */
  field?: string;
};

/**
 * Server Action と検証関数の戻り値。
 * 想定内の失敗は例外を投げずにこの形で返す。
 * → docs/02-design/api-design.md §2.2
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  field?: string,
): { ok: false; error: ActionError } {
  return { ok: false, error: { code, message, field } };
}

/** 想定外の失敗を包む。詳細はコンソールに出し、画面には一般的なメッセージを出す */
export function failUnexpected(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  return fail(
    "UNEXPECTED",
    "処理できませんでした。しばらくしてからもう一度お試しください",
  );
}
