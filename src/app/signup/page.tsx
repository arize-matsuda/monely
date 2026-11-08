import { AuthLink, AuthShell } from "@/components/ui/auth-shell";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "アカウントを作る | Monely" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="アカウントを作る"
      footer={
        <p>
          すでにアカウントをお持ちの方は{" "}
          <AuthLink href="/login">ログイン</AuthLink>
        </p>
      }
    >
      <SignUpForm />

      {/*
        既存のメールアドレスで登録しようとしても、Supabase は何も送らずに
        成功を返す（アカウントの存在を漏らさないため）。こちらも表示を変えない
        ので、待っても届かない状態になりうる。その旨を先に伝えておく。
        → docs/05-decisions/ADR-0006-email-password-auth.md
      */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        すでに登録済みのメールアドレスの場合、確認メールは届きません。
        <AuthLink href="/login">ログイン</AuthLink>をお試しください。
        パスワードが分からない場合は
        <AuthLink href="/login/link">ログインリンク</AuthLink>で入れます。
      </p>
    </AuthShell>
  );
}
