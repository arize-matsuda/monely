"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarRange, ChartPie, Home, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * 下部タブ（UI/UX設計 §4.1, §4.6）。
 *
 * **PC では出さない**（`md` 以上で非表示）。横のサイドバーに任せる。
 *
 * **置くのはホームと設定だけ。** `/new` と編集画面には置かない。
 * あちらは「作業を終えて戻る」画面で、下部は保存ボタンの場所
 * （タブを並べると親指の下で操作が競合する）。
 *
 * 現在地の判定に `usePathname()` を使うため Client Component。
 */
/**
 * タブは 5 つ。**375px で 1 つ 75px** なので、ラベルは短くする
 * （「記録する」→「記録」）。サイドバー（PC）は幅に余裕があるので
 * 「記録する」のままにしてある。
 */
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/new", label: "記録", icon: Plus },
  { href: "/breakdown", label: "内訳", icon: ChartPie },
  { href: "/year", label: "年", icon: CalendarRange },
  { href: "/settings", label: "設定", icon: Settings },
];

export function BottomTabs() {
  /*
   * **型は `string` だが、実行時に null が返ることがある。**
   * App Router の文脈の外（`react-dom/server` での単体描画など）では
   * null になり、`startsWith` で落ちる。煙テストで踏んだ。
   */
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/85 backdrop-blur-md md:hidden"
    >
      {/* セーフエリア（iPhone のホームバー）に潜らせない */}
      <ul className="mx-auto flex w-full max-w-[480px] items-stretch px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          // 年のページは `/year/2026` のように年が付くので前方一致
          const current =
            tab.href === "/year"
              ? pathname.startsWith("/year")
              : pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-xs font-medium transition-colors",
                  current
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon
                  className={cn("size-5", current && "stroke-[2.5]")}
                  aria-hidden
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
