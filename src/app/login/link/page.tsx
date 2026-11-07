import { AuthLink, AuthShell } from "@/components/ui/auth-shell";
import { MagicLinkForm } from "./magic-link-form";

export const metadata = { title: "ログインリンクを受け取る | Monely" };

/**
 * パスワードを忘れたときの導線（FR-A6）。
 * メールのリンクでログインし、入れたら設定画面でパスワードを変更する。
 * → docs/05-decisions/ADR-0006-email-password-auth.md
 */
export default function MagicLinkPage() {
  return (
    <AuthShell
      title="ログインリンクを受け取る"
      footer={
        <p>
          パスワードでログインする場合は{" "}
          <AuthLink href="/login">こちら</AuthLink>
        </p>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-muted">
        パスワードを忘れた場合はこちらから。メールに届いたリンクを開くと、
        パスワードなしでログインできます。
      </p>
      <MagicLinkForm />
    </AuthShell>
  );
}
