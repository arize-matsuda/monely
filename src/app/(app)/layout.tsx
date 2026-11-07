import { requireMember } from "@/lib/auth";

/**
 * 認証後の画面の共通レイアウト。
 *
 * 振り分けをここ 1 箇所にまとめる（FR-A4 / FR-X1）。
 * 未ログイン → /login、世帯なし → /setup は requireMember() が行う。
 *
 * **これは UX のための振り分けで、データの守りではない。**
 * データの認可は src/lib/data/ の where 句。
 * → docs/03-guidelines/security-guidelines.md §2
 */

// この配下はすべて個人データで、静的に先出しできる部分が無い。
// サーバーでブロックして描画する。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireMember();
  return <>{children}</>;
}
