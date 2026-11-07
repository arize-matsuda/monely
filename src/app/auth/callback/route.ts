import { type NextRequest, NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * マジックリンクのコールバック（FR-A2）。
 *
 * メールのリンクを開くと ?code=... 付きで戻ってくるので、
 * セッションに交換してから振り分ける。
 *
 * 失敗の扱い: メールクライアントがリンクを先読みしてコードを消費することがある。
 * その場合も /login?error=1 に戻し、「もう一度送る」導線を見せる。
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
