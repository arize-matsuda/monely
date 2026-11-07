import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getMyHousehold } from "@/lib/data/household";

/**
 * 仮のホーム画面（M2）。M3 で月次一覧に差し替える。
 */
export default async function HomePage() {
  await requireMember();
  const household = await getMyHousehold();

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {household?.name ?? "わが家"}
        </h1>
        <Link
          href="/settings"
          className="text-sm text-accent underline underline-offset-4"
        >
          設定
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        ログインできました。記録の画面は M3 で作ります。
      </p>

      <section className="mt-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">次にやること</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          <li>
            パスワードでログインできるようにするには{" "}
            <Link
              href="/settings"
              className="text-accent underline underline-offset-4"
            >
              設定でパスワードを変更
            </Link>
          </li>
          <li>家族を招待するには設定の招待コードを伝える</li>
        </ul>
      </section>
    </main>
  );
}
