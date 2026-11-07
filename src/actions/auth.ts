"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { type ActionResult, fail, failUnexpected, ok } from "@/lib/types";
import {
  parseEmail,
  parsePassword,
  parsePasswordConfirmation,
} from "@/lib/validation";

/**
 * 認証。メールアドレス + パスワードを主とし、
 * マジックリンクは「パスワードを忘れたとき」の導線として残す（ADR-0006）。
 * 実装基盤は better-auth（ADR-0007）。
 *
 * better-auth は失敗時に APIError を投げる。想定内の失敗は
 * ActionResult に変換して返す（例外を画面まで飛ばさない）。
 */

/** better-auth のエラーコードから画面に出す文を決める */
function messageFor(error: APIError): string | null {
  const code = String(error.body?.code ?? "");
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "メールアドレスまたはパスワードが正しくありません";
    case "EMAIL_NOT_VERIFIED":
      // sendOnSignIn: true なので、この時点で確認リンクが再送されている
      return "メールアドレスの確認が済んでいません。確認メールを再送しました。リンクを開いてください";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return "このパスワードは使えません。別のものを入力してください";
    case "TOO_MANY_REQUESTS":
      return "試行回数が多すぎます。しばらく待ってからもう一度お試しください";
    default:
      return null;
  }
}

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
    await auth.api.signInEmail({
      body: { email: email.data, password: password.data },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      console.error("[signIn]", error.body?.code, error.message);
      return fail(
        "UNAUTHENTICATED",
        // どのコードでも、どちらが違うかは示さない（FR-A8）
        messageFor(error) ?? "メールアドレスまたはパスワードが正しくありません",
      );
    }
    return failUnexpected("signIn", error);
  }

  redirect("/");
}

/**
 * 新規登録（FR-A2）。確認メールが 1 通届く。
 *
 * **登録済みかどうかを結果に出さない**（FR-A9）。
 * better-auth は既存のメールアドレスだと USER_ALREADY_EXISTS を返すので、
 * 成功と同じ表示に寄せる。
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
    await auth.api.signUpEmail({
      body: {
        email: email.data,
        password: password.data,
        // 表示名は Monely 側の Profile が持つ。ここはメールのローカル部で埋める
        name: email.data.split("@")[0] ?? "メンバー",
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      const code = String(error.body?.code ?? "");
      console.error("[signUp]", code, error.message);
      // 登録済みは表示を変えない（存在を漏らさない）
      if (code !== "USER_ALREADY_EXISTS") {
        const message = messageFor(error);
        if (message) {
          return fail(
            code.startsWith("PASSWORD_") ? "VALIDATION" : "UNEXPECTED",
            message,
            code.startsWith("PASSWORD_") ? "password" : undefined,
          );
        }
        return fail(
          "UNEXPECTED",
          "登録できませんでした。しばらくしてからもう一度お試しください",
        );
      }
    } else {
      return failUnexpected("signUp", error);
    }
  }

  return ok({ email: email.data });
}

/**
 * ログイン用のリンクをメールで送る。
 * パスワードを忘れたときの導線（FR-A6）。
 *
 * **メールアドレスが登録済みかどうかを結果に出さない**（FR-A9）。
 * magicLink プラグインは disableSignUp: true なので、未登録だとエラーになる。
 * それも握りつぶして同じ表示にする。
 */
export async function sendMagicLink(
  _prev: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = parseEmail(formData.get("email"));
  if (!parsed.ok) return parsed;
  const email = parsed.data;

  try {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      const code = String(error.body?.code ?? "");
      console.error("[sendMagicLink]", code, error.message);
      if (code === "TOO_MANY_REQUESTS") {
        return fail(
          "UNEXPECTED",
          "試行回数が多すぎます。しばらく待ってからもう一度お試しください",
        );
      }
      // 未登録などは表示を変えない
    } else {
      return failUnexpected("sendMagicLink", error);
    }
  }

  return ok({ email });
}

export async function signOut() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    console.error("[signOut]", error);
  }
  redirect("/login");
}

/**
 * パスワードを設定・変更する（FR-A10）。
 * マジックリンクで入ったあとにパスワードを設定する用途も兼ねる。
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

  const currentPassword = formData.get("currentPassword");
  const current =
    typeof currentPassword === "string" && currentPassword.length > 0
      ? currentPassword
      : undefined;

  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user) {
      return fail("UNAUTHENTICATED", "ログインしてからお試しください");
    }

    await auth.api.changePassword({
      body: {
        newPassword: password.data,
        // 現在のパスワードが不明な場合（マジックリンクで入った直後）は
        // 他のセッションを無効化して設定し直す
        currentPassword: current ?? "",
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof APIError) {
      const code = String(error.body?.code ?? "");
      console.error("[updatePassword]", code, error.message);
      if (code === "INVALID_PASSWORD") {
        return fail(
          "VALIDATION",
          "現在のパスワードが正しくありません",
          "currentPassword",
        );
      }
      return fail(
        "UNEXPECTED",
        messageFor(error) ??
          "パスワードを変更できませんでした。もう一度お試しください",
      );
    }
    return failUnexpected("updatePassword", error);
  }

  return ok();
}

/**
 * 確認メールを再送する（FR-A2）。
 *
 * 最初のリンクを逃した／期限切れになった場合の導線。
 * ログイン試行時にも自動で再送される（emailVerification.sendOnSignIn）が、
 * パスワードが分からない状態でも再送できるようにここも用意する。
 *
 * **登録済みかどうかを結果に出さない**（FR-A9）。
 */
export async function resendVerificationEmail(
  _prev: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = parseEmail(formData.get("email"));
  if (!parsed.ok) return parsed;
  const email = parsed.data;

  try {
    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: "/" },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      const code = String(error.body?.code ?? "");
      console.error("[resendVerificationEmail]", code, error.message);
      if (code === "TOO_MANY_REQUESTS") {
        return fail(
          "UNEXPECTED",
          "試行回数が多すぎます。しばらく待ってからもう一度お試しください",
        );
      }
      // 未登録・既に確認済みなどは表示を変えない
    } else {
      return failUnexpected("resendVerificationEmail", error);
    }
  }

  return ok({ email });
}
