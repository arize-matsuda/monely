import { AuthLink, AuthShell } from "@/components/ui/auth-shell";
import { MailNotConfigured } from "@/components/ui/mail-not-configured";
import { ResendForm } from "./resend-form";

export const metadata = { title: "確認メールを再送する | Monely" };

/**
 * 確認メールの再送（FR-A2）。
 * 最初のリンクを逃した／期限切れになった場合の導線。
 */
export default function VerifyPage() {
  return (
    <AuthShell
      title="確認メールを再送する"
      footer={
        <p>
          ログインは <AuthLink href="/login">こちら</AuthLink>
        </p>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        登録したメールアドレスを入力すると、確認用のリンクを送り直します。
      </p>
      <MailNotConfigured />
      <ResendForm />
    </AuthShell>
  );
}
