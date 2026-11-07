import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { getMyHousehold, listMembers } from "@/lib/data/household";

/**
 * 仮のホーム画面（M2）。
 * M3 で月次一覧に差し替える。
 */
export default async function HomePage() {
  const me = await requireMember();
  const [household, members] = await Promise.all([
    getMyHousehold(),
    listMembers(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {household?.name ?? "わが家"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        ログインできました。記録の画面は M3 で作ります。
      </p>

      <section className="mt-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">招待コード</h2>
        <p className="mt-2 font-mono text-2xl tracking-[0.2em]">
          {household?.inviteCode}
        </p>
        <p className="mt-2 text-xs text-muted">
          このコードを家族に伝えると、同じ家計簿に参加できます。
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">メンバー</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
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

      <form action={signOut} className="mt-8">
        <Button type="submit" variant="secondary">
          ログアウト
        </Button>
      </form>
    </main>
  );
}
