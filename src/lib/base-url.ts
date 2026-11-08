/**
 * アプリの URL（baseURL）の決め方。
 *
 * better-auth はこの値をメールのリンクと `callbackURL` の検証に使う。
 * **不正な値を渡すと起動時に落ちる**（実際に本番で `Invalid base URL: e`
 * に当たった）。そこで、ここで検証して**どの環境変数が悪いのかが分かる
 * メッセージ**にする。
 *
 * 優先順位:
 *   1. `BETTER_AUTH_URL`（明示指定。独自ドメインを使う場合はこれ）
 *   2. `VERCEL_PROJECT_PRODUCTION_URL`（Vercel が自動で渡す本番ドメイン）
 *   3. `http://localhost:3000`（ローカル）
 *
 * **`VERCEL_URL` は使わない。** あれはデプロイごとに変わる URL で、
 * メールのリンクに入れると過去のリンクが切れ、Cookie のオリジンもずれる。
 */

export const LOCAL_BASE_URL = "http://localhost:3000";

/**
 * `process.env` をそのまま渡せるようにインデックス型で受ける。
 * 読むのは次の 2 つだけ。
 *   - `BETTER_AUTH_URL`
 *   - `VERCEL_PROJECT_PRODUCTION_URL`（Vercel が自動で渡す。プロトコルを含まない）
 */
type Env = { readonly [key: string]: string | undefined };

function assertValid(url: string, source: string): string {
  // 末尾のスラッシュは better-auth が二重スラッシュを作るので落とす
  const trimmed = url.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `${source} が URL として読めません: ${JSON.stringify(url)}\n` +
        `例: https://monely.vercel.app（プロトコルから書く。末尾のスラッシュは不要）`,
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `${source} は http か https で始めてください: ${JSON.stringify(url)}`,
    );
  }
  return trimmed;
}

export function resolveBaseURL(env: Env): string {
  if (env.BETTER_AUTH_URL) {
    return assertValid(env.BETTER_AUTH_URL, "環境変数 BETTER_AUTH_URL");
  }
  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    // Vercel の値はプロトコルを含まないので付ける
    return assertValid(
      `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
      "環境変数 VERCEL_PROJECT_PRODUCTION_URL",
    );
  }
  return LOCAL_BASE_URL;
}
