import { TriangleAlert } from "lucide-react";
import { isMailConfigured } from "@/lib/email";

/**
 * メール送信が未設定であることを利用者に伝える（2026-11-09 に本番で踏んだ）。
 *
 * **未設定だと「メールを送りました」と出るのに 1 通も届かない。**
 * リンクはサーバーのログに出るだけで、利用者からは見えない。
 * 設定されているときは何も描かない。
 *
 * 設定方法 → docs/02-design/architecture.md §8.2
 */
export function MailNotConfigured() {
  if (isMailConfigured()) return null;

  return (
    <p
      className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive ring-1 ring-destructive/25"
      role="alert"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium">
          いまメールを送信できない設定になっています。
        </strong>
        <br />
        確認メールは届きません。管理者に連絡してください。
      </span>
    </p>
  );
}
