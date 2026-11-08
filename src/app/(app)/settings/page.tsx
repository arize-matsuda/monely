import Link from "next/link";
import { signOut } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { getMyHousehold, listMembers } from "@/lib/data/household";
import { PasswordForm } from "./password-form";

// セッションを読むため、サーバーでブロックして描画する。
//
// **レイアウトの instant = false だけでは足りない。** Page セグメントは
// validationLevel: 'warning'（既定）で暗黙に個別検証されるため、
// 認証後の各ページにも宣言が必要。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

export const metadata = { title: "設定 | Monely" };

/**
 * 設定画面。M4 で世帯名の変更・表示名の変更・カテゴリ管理を足す。
 * パスワードの変更（FR-A10）は、マジックリンクで作ったアカウントに
 * パスワードを設定する必要があるため M2 の段階で用意した。
 */
export default async function SettingsPage() {
  const me = await requireMember();
  const [household, members] = await Promise.all([
    getMyHousehold(),
    listMembers(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <Link
          href="/"
          className="text-sm text-accent underline underline-offset-4"
        >
          ホーム
        </Link>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">わが家</h2>
        <p className="mt-2 text-base">{household?.name}</p>
        <h3 className="mt-4 text-sm font-medium text-muted">招待コード</h3>
        <p className="mt-1 font-mono text-2xl tracking-[0.2em]">
          {household?.inviteCode}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          このコードを家族に伝えると、同じ家計簿に参加できます。
          パスワードと同じ扱いで共有してください。
        </p>
        <h3 className="mt-4 text-sm font-medium text-muted">メンバー</h3>
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {members.map((member) => (
            <li key={member.id}>
              {member.displayName}
              {member.id === me.profileId ? (
                <span className="text-muted">（あなた）</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">あなた</h2>
        <dl className="mt-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">表示名</dt>
            <dd>{me.displayName}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <dt className="text-muted">メール</dt>
            <dd className="truncate">{me.email}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-muted">表示テーマ</h2>
        <ThemeToggle />
        <p className="mt-2 text-xs text-muted">
          「システム」は端末の設定に合わせます。この端末にだけ保存されます。
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-4 text-sm font-medium text-muted">パスワード</h2>
        <PasswordForm />
      </section>

      <form action={signOut} className="mt-8">
        <Button type="submit" variant="secondary">
          ログアウト
        </Button>
      </form>
    </main>
  );
}
