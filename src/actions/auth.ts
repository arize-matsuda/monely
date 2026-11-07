"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResult, failUnexpected, ok } from "@/lib/types";
import { parseEmail } from "@/lib/validation";

/**
 * ログイン用のリンクをメールで送る（FR-A1）。
 *
 * **メールアドレスが登録済みかどうかを結果に出さない**（FR-A6 / NFR-S7）。
 * Supabase 側がエラーを返しても成功と同じ表示にする。
 */
export async function sendMagicLink(
  _prev: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = parseEmail(formData.get("email"));
  if (!parsed.ok) return parsed;
  const email = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const origin = await currentOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    // 失敗しても画面の出力は変えない。詳細はサーバーのログにだけ残す
    if (error) {
      console.error("[sendMagicLink]", error.message);
    }
  } catch (error) {
    // 環境変数の不足など、こちら側の設定ミスは利用者に伝える必要がある
    return failUnexpected("sendMagicLink", error);
  }

  return ok({ email });
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** リダイレクト先の組み立てに使うオリジン */
async function currentOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
