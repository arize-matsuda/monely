import { MailCheck, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <Link
          href="/login"
          aria-label="Monely"
          className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
        >
          <Wallet className="size-6" aria-hidden />
        </Link>
        <div>
          <p className="text-2xl font-semibold tracking-tight">Monely</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {description ?? "わが家の家計簿"}
          </p>
        </div>
      </div>

      <Card className="[--card-spacing:--spacing(5)]">
        <CardContent className="flex flex-col gap-5">
          {title ? (
            <h1 className="font-heading text-base font-medium tracking-tight">
              {title}
            </h1>
          ) : null}
          {children}
        </CardContent>
      </Card>

      {footer ? (
        <div className="mt-6 flex flex-col gap-2 px-1 text-center text-sm text-muted-foreground">
          {footer}
        </div>
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
    <Link
      href={href}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
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
      <div className="flex items-start gap-3 rounded-xl bg-income/10 px-3.5 py-3 ring-1 ring-income/25">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-income" aria-hidden />
        <p className="text-sm leading-relaxed">
          <strong className="font-medium">{email}</strong> {children}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        届かない場合は迷惑メールフォルダを確認してください。
      </p>
    </div>
  );
}
