import { CircleAlert } from "lucide-react";
import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/ui/auth-shell";
import { isMailConfigured } from "@/lib/email";
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
  /*
   * **メールを送れない環境では、メール頼みの導線を出さない。**
   * 出すと「送りました」と表示されるのに届かず、行き止まりになる
   * （2026-11-09 に本番で踏んだ）。
   * 設定すれば自動で出る（ビルド時に判定するので再デプロイが要る）。
   */
  const mail = isMailConfigured();

  return (
    <AuthShell
      footer={
        <>
          <p>
            はじめての方は <AuthLink href="/signup">アカウントを作る</AuthLink>
          </p>
          {mail ? (
            <>
              <p>
                パスワードを忘れた方は{" "}
                <AuthLink href="/login/link">ログインリンクを受け取る</AuthLink>
              </p>
              <p>
                確認メールが届かない方は{" "}
                <AuthLink href="/login/verify">確認メールを再送する</AuthLink>
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed">
              いまメールを送信できない設定のため、パスワードの再設定は
              できません。パスワードは忘れないよう保管してください。
            </p>
          )}
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
      className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive ring-1 ring-destructive/25"
      role="alert"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      リンクからログインできませんでした。期限切れか、別のブラウザで開いた可能性があります。
      パスワードでログインするか、もう一度お試しください。
    </p>
  );
}
