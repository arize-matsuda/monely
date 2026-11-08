import { redirect } from "next/navigation";
import { requestNow } from "@/lib/clock";

// セッションを読むため、サーバーでブロックして描画する。
// 認証後の各ページに宣言が必要（レイアウトだけでは足りない）。
// → docs/05-decisions/ADR-0004-instant-false-for-authed-segments.md
export const instant = false;

/**
 * `/year` を今年のページへ送る。
 *
 * ナビゲーションのリンク先を `/year` に固定できるようにするため
 * （`/year/2026` を直接書くと、年が変わったあとも古い年に飛ぶ）。
 */
export default async function YearIndexPage() {
  const now = await requestNow();
  redirect(`/year/${now.getFullYear()}`);
}
