import { AppSidebar } from "@/components/app-sidebar";
import { requireMember } from "@/lib/auth";
import { getMyHousehold } from "@/lib/data/household";

/**
 * 認証後の画面の共通レイアウト。
 *
 * 振り分けをここ 1 箇所にまとめる（FR-A4 / FR-X1）。
 * 未ログイン → /login、世帯なし → /setup は requireMember() が行う。
 *
 * **これは UX のための振り分けで、データの守りではない。**
 * データの認可は src/lib/data/ の where 句。
 * → docs/03-guidelines/security-guidelines.md §2
 *
 * PC ではサイドバーを横に置く（ADR-0009）。スマホでは出さず、
 * 下部タブ（`BottomTabs`）に任せる。
 */

// この配下はすべて個人データで、静的に先出しできる部分が無い。
// サーバーでブロックして描画する。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireMember();
  const household = await getMyHousehold();

  return (
    <div className="flex flex-1">
      <AppSidebar
        householdName={household?.name ?? "わが家"}
        displayName={me.displayName}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
