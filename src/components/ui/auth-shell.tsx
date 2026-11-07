import Link from "next/link";
import type { ReactNode } from "react";

/** /login, /signup, /login/link で共通の枠 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Link href="/login" className="text-3xl font-semibold tracking-tight">
          Monely
        </Link>
        <p className="mt-1 text-muted">{description ?? "わが家の家計簿"}</p>
      </div>

      {title ? (
        <h1 className="mb-4 text-lg font-medium tracking-tight">{title}</h1>
      ) : null}

      {children}

      {footer ? (
        <div className="mt-8 flex flex-col gap-2 text-sm">{footer}</div>
      ) : null}
    </main>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-accent underline underline-offset-4">
      {children}
    </Link>
  );
}

/** 送信後の「メールを送りました」表示 */
export function MailSentNotice({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed">
        <strong className="font-medium">{email}</strong> {children}
      </p>
      <p className="text-xs text-muted">
        届かない場合は迷惑メールフォルダを確認してください。
      </p>
    </div>
  );
}
