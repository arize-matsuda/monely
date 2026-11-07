import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/**
 * サーバー側（Server Component / Server Action / Route Handler）用の Supabase クライアント。
 *
 * **認証にのみ使う。** データアクセスは Prisma（src/lib/data/）。
 * → docs/05-decisions/ADR-0005-authorization-in-app-layer.md
 *
 * リクエストごとに新しく作る。モジュールスコープで使い回さない
 * （使い回すと後続のレスポンスにキャッシュ無効化ヘッダが付かなくなる）。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component のレンダリング中は Cookie を書き込めない。
          // セッションの更新は src/proxy.ts が担保するので、ここは無視してよい。
        }
      },
    },
  });
}
