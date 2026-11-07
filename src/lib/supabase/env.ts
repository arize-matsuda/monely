import "server-only";

/**
 * Supabase Auth 用の環境変数。
 * 起動時に分かりやすく失敗させるため、process.env を直接散らさない。
 *
 * DB の接続文字列（DATABASE_URL / DIRECT_URL）はここでは扱わない。
 * それは src/lib/data/db.ts の責務。
 */
export function supabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.local を確認してください`,
    );
  }
  return value;
}
