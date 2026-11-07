import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase のセッション（アクセストークン）を更新するだけの層。
 *
 * **認可の判断をここに置かない。** Next.js のドキュメントが
 * 「完全なセッション管理・認可の解決策として使うべきでない」と明記している。
 * 画面の振り分けは src/app/(app)/layout.tsx、データの認可は src/lib/data/。
 * → docs/03-guidelines/security-guidelines.md §2
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // 第 2 引数のヘッダ（Cache-Control: no-store など）も必ず設定する。
        // 忘れると認証 Cookie を含むレスポンスが CDN にキャッシュされ、
        // 他人のセッションが配信されうる（NFR-S5）。
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // セッションが期限切れなら更新する。戻り値は使わない（認可の判断をしない）
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // matcher を書かないと静的ファイルにも走る。
  // _next の内部パスと拡張子付きのファイルを除外する。
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|webmanifest)$).*)",
  ],
};
