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
 * メール送信のレート制限。
 * **これは表に出してよい。** アカウントの存在を漏らさず、
 * かつ黙って失敗すると「待っても届かない」状態になるため。
 * Supabase の組み込み SMTP は無料プランだと送信数が少ない。
 */
function rateLimitMessage(code: string | undefined): string | null {
  if (code === "over_email_send_rate_limit") {
    return "メールの送信制限に達しました。しばらく待ってからもう一度お試しください";
  }
  if (code === "over_request_rate_limit") {
    return "リクエストが多すぎます。しばらく待ってからもう一度お試しください";
  }
  return null;
}

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
      console.error("[signUp]", error.code, error.message);
      // パスワードが Supabase 側の要件を満たさない場合はその場で直せるよう伝える
      if (error.code === "weak_password") {
        return fail(
          "VALIDATION",
          "このパスワードは使えません。別のものを入力してください",
          "password",
        );
      }
      const limited = rateLimitMessage(error.code);
      if (limited) return fail("UNEXPECTED", limited);
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
      console.error("[sendMagicLink]", error.code, error.message);
      const limited = rateLimitMessage(error.code);
      if (limited) return fail("UNEXPECTED", limited);
      // それ以外（未登録など）は表示を変えない
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

/**
 * パスワードを設定・変更する（FR-A10）。
 *
 * マジックリンクで作ったアカウントにパスワードを設定する用途も兼ねる。
 * ログイン中のセッションが必要。
 */
export async function updatePassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const password = parsePassword(formData.get("password"));
  if (!password.ok) return password;
  const confirmation = parsePasswordConfirmation(
    password.data,
    formData.get("passwordConfirmation"),
  );
  if (!confirmation.ok) return confirmation;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return fail("UNAUTHENTICATED", "ログインしてからお試しください");
    }

    const { error } = await supabase.auth.updateUser({
      password: password.data,
    });
    if (error) {
      console.error("[updatePassword]", error.code, error.message);
      if (error.code === "weak_password" || error.code === "same_password") {
        return fail(
          "VALIDATION",
          error.code === "same_password"
            ? "現在と同じパスワードです。別のものを入力してください"
            : "このパスワードは使えません。別のものを入力してください",
          "password",
        );
      }
      return fail(
        "UNEXPECTED",
        "パスワードを変更できませんでした。もう一度お試しください",
      );
    }
  } catch (error) {
    return failUnexpected("updatePassword", error);
  }

  return ok();
}
