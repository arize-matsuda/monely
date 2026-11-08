import "server-only";
import { connection } from "next/server";

/**
 * 現在時刻をリクエスト時に取得する。
 *
 * `cacheComponents` が有効な環境では、レンダリング中の `new Date()` は
 * 「プリレンダリング中の不安定な値」として扱われエラーになる。
 * `connection()` を待つことで、リクエスト時に評価されることを明示する。
 *
 * **時計を読むのはここだけ。** `src/lib/month.ts` の関数は現在時刻を
 * 必須引数で受け取るので、呼び忘れると型エラーになる
 * （既定引数 `= new Date()` にしていたせいで同じ問題を 2 回起こした）。
 *
 * → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
 */
export async function requestNow(): Promise<Date> {
  await connection();
  return new Date();
}
