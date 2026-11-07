"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResult, fail, failUnexpected, ok } from "@/lib/types";
import {
  parseEmail,
  parsePassword,
  parsePasswordConfirmation,
} from "@/lib/validation";

/**
 * 認証。メールアドレス + パスワードを主とし、
 * マジックリンクは「パスワードを忘れたとき」の導線として残す。
 * → docs/05-decisions/ADR-0006-email-password-auth.md
 */

/** ログイン（FR-A1） */
export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = parseEmail(formData.get("email"));
  if (!email.ok) return email;
  const password = parsePassword(formData.get("password"));
  if (!password.ok) return password;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });
    if (error) {
      // メールアドレスとパスワードのどちらが違うかを示さない（NFR-S7）
      console.error("[signIn]", error.message);
      return fail(
        "UNAUTHENTICATED",
        "メールアドレスまたはパスワードが正しくありません",
      );
    }
  } catch (error) {
    return failUnexpected("signIn", error);
  }

  redirect("/");
}

/**
 * 新規登録（FR-A2）。確認メールが 1 通届く。
 *
 * **登録済みかどうかを結果に出さない。** Supabase は既存のメールアドレスに対して
 * 何も送らずに成功を返す（利用者の存在を漏らさないため）。こちらも表示を変えない。
 */
export async function signUp(
  _prev: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const email = parseEmail(formData.get("email"));
  if (!email.ok) return email;
  const password = parsePassword(formData.get("password"));
  if (!password.ok) return password;
  const confirmation = parsePasswordConfirmation(
    password.data,
    formData.get("passwordConfirmation"),
  );
  if (!confirmation.ok) return confirmation;

  try {
    const supabase = await createSupabaseServerClient();
    const origin = await currentOrigin();
    const { error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      console.error("[signUp]", error.message);
      // パスワードが Supabase 側の要件を満たさない場合はその場で直せるよう伝える
      if (error.code === "weak_password") {
        return fail(
          "VALIDATION",
          "このパスワードは使えません。別のものを入力してください",
          "password",
        );
      }
      // それ以外（登録済みなど）は表示を変えない
    }
  } catch (error) {
    return failUnexpected("signUp", error);
  }

  return ok({ email: email.data });
}

/**
 * ログイン用のリンクをメールで送る。
 * パスワードを忘れたときの導線（FR-A6）。
 *
 * **メールアドレスが登録済みかどうかを結果に出さない**（NFR-S7）。
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
      // 新規登録はパスワード経由に限る。リンクでアカウントを作らせない
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      console.error("[sendMagicLink]", error.message);
    }
  } catch (error) {
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
