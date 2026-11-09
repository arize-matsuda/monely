"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  ChartPie,
  Home,
  Plus,
  Settings,
  Tags,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * PC 向けのサイドバー（ADR-0009）。
 *
 * **スマホには出さない**（`md` 未満では非表示）。狭い画面では
 * 下部タブのほうが親指で届く。
 *
 * スマホの下部タブより項目が 1 つ多い（カテゴリの管理）。
 * 画面幅に余裕があるので、設定の中に隠さず直接並べる。
 *
 * 現在地の判定に `usePathname()` を使うため Client Component。
 */
const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/new", label: "記録する", icon: Plus },
  { href: "/breakdown", label: "内訳", icon: ChartPie },
  { href: "/year", label: "年の一覧", icon: CalendarRange },
  { href: "/settings/categories", label: "カテゴリ", icon: Tags },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppSidebar({
  householdName,
  displayName,
}: {
  householdName: string;
  displayName: string;
}) {
  /*
   * **型は `string` だが、実行時に null が返ることがある。**
   * App Router の文脈の外（`react-dom/server` での単体描画など）では
   * null になり、`startsWith` で落ちる。煙テストで踏んだ。
   */
  const pathname = usePathname() ?? "";

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-5 md:flex">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2.5 px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="size-4" aria-hidden />
        </span>
        <span className="font-heading text-lg font-semibold tracking-tight">
          Monely
        </span>
      </Link>

      <nav aria-label="メインメニュー">
        <ul className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            /*
             * 現在地の判定。
             * 「設定」は配下のページ（カテゴリ）と取り違えないよう完全一致。
             * 「年の一覧」は `/year/2026` のように年が付くので前方一致。
             */
            const current =
              item.href === "/year"
                ? pathname.startsWith("/year")
                : pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    current
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 誰としてどの家計簿を見ているかを常に出す（家族で共有するため） */}
      <div className="mt-auto flex flex-col gap-0.5 rounded-xl bg-muted/60 px-3 py-2.5">
        <p className="truncate text-sm font-medium">{householdName}</p>
        <p className="truncate text-xs text-muted-foreground">{displayName}</p>
      </div>
    </aside>
  );
}
