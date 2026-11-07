import { type NextRequest, NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * メールのリンクから戻ってくる口。**2 つの用途を共用する。**
 *   1. 新規登録の確認リンク（FR-A2）
 *   2. パスワードを忘れたときのログインリンク（FR-A6）
 * どちらも PKCE なので ?code=... を受け取ってセッションに交換する。
 *
 * 失敗する主な原因:
 *   - メールクライアントがリンクを先読みしてコードを消費した
 *   - 登録したブラウザと別のブラウザでリンクを開いた（code verifier が無い）
 *   - 期限切れ
 * いずれも /login?error=1 に戻し、パスワードでのログインを促す。
 * 新規登録の確認リンクの場合、**メールアドレスの確認自体は Supabase 側で
 * 完了している**ので、パスワードでログインすれば入れる。
 * → docs/05-decisions/ADR-0006-email-password-auth.md
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return redirectTo(`${origin}/login?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback]", error.message);
    return redirectTo(`${origin}/login?error=1`);
  }

  // 世帯に未所属なら先にセットアップへ
  const me = await getMe();
  if (!me) {
    return redirectTo(`${origin}/login?error=1`);
  }
  return redirectTo(me.householdId ? `${origin}/` : `${origin}/setup`);
}

function redirectTo(url: string) {
  const response = NextResponse.redirect(url);
  // 認証直後のレスポンスをキャッシュさせない
  response.headers.set("Cache-Control", "no-store");
  return response;
}
