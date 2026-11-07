import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/ui/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | Monely" };

/**
 * ログイン画面。**公開ページなので静的シェルを保つ。**
 *
 * `?error=1`（リンクが無効・期限切れ）の通知だけが searchParams に依存するため、
 * そこだけ <Suspense> の内側に押し込む。見出しとフォームはプリレンダリングされる。
 * → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
 */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell
      footer={
        <>
          <p>
            はじめての方は <AuthLink href="/signup">アカウントを作る</AuthLink>
          </p>
          <p>
            パスワードを忘れた方は{" "}
            <AuthLink href="/login/link">ログインリンクを受け取る</AuthLink>
          </p>
        </>
      }
    >
      <Suspense fallback={null}>
        <LinkNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}

async function LinkNotice({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  if (params.error === undefined) return null;

  // 新規登録の確認リンクとマジックリンクの両方がここに来る。
  // どちらも「リンクからセッションを作れなかった」状態なので、
  // パスワードでのログインを促す文言にする。
  // （確認リンクの場合、メールアドレスの確認自体は Supabase 側で完了している）
  return (
    <p
      className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm leading-relaxed text-danger"
      role="alert"
    >
      リンクからログインできませんでした。期限切れか、別のブラウザで開いた可能性があります。
      パスワードでログインするか、もう一度お試しください。
    </p>
  );
}
