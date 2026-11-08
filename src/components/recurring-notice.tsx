"use client";

import { CalendarSync } from "lucide-react";
import { useActionState } from "react";
import { registerRecurring } from "@/actions/recurring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormError } from "@/components/ui/field";
import { formErrorOf } from "@/components/ui/form-state";
import { formatYen } from "@/lib/money";

/**
 * 先月の定期支出をまとめて登録する（FR-R2 / ADR-0011）。
 *
 * **押すまで何も起きない。** 自動実行はデプロイ後（ADR-0011）。
 * アクションは引数を取らず、対象はサーバー側だけで決まる。
 *
 * 候補の算出はサーバーで済んでいる。ここは件数と合計を見せて
 * 押してもらうだけ。
 */
export function RecurringNotice({
  candidates,
}: {
  candidates: readonly { name: string; amount: number }[];
}) {
  const [state, action, pending] = useActionState(
    () => registerRecurring(),
    null,
  );

  if (candidates.length === 0) return null;

  const total = candidates.reduce(
    (sum, candidate) => sum + candidate.amount,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSync className="size-4 text-muted-foreground" aria-hidden />
          毎月の支出
        </CardTitle>
        <CardDescription>
          先月「毎月くり返す」にした {candidates.length} 件が、
          今月まだ記録されていません
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <FormError message={formErrorOf(state)} />

        <ul className="flex flex-col gap-1 text-sm">
          {candidates.map((candidate) => (
            <li
              key={`${candidate.name}:${candidate.amount}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate">{candidate.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatYen(candidate.amount)}
              </span>
            </li>
          ))}
        </ul>

        <form action={action}>
          <Button type="submit" className="w-full" pending={pending}>
            {pending
              ? "登録中…"
              : `${candidates.length} 件（${formatYen(total)}）をまとめて登録`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
