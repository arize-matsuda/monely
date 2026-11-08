import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CreateHouseholdForm, JoinHouseholdForm } from "./setup-forms";

export const metadata = { title: "はじめの設定 | Monely" };

// セッションを読むため、サーバーでブロックして描画する。
//
// **レイアウトの instant = false だけでは足りない。** Page セグメントは
// validationLevel: 'warning'（既定）で暗黙に個別検証されるため、
// 認証後の各ページにも宣言が必要。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

export default async function SetupPage() {
  const me = await requireUser();
  if (me.householdId) redirect("/");

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">はじめの設定</h1>
      <p className="mt-1 text-sm text-muted">
        新しく家計簿を作るか、家族の家計簿に参加します。
      </p>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-medium text-muted">
          新しく家計簿を作る
        </h2>
        <CreateHouseholdForm defaultDisplayName={me.displayName} />
      </section>

      <div className="my-8 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted">
          家族の家計簿に参加する
        </h2>
        <JoinHouseholdForm defaultDisplayName={me.displayName} />
      </section>
    </main>
  );
}
