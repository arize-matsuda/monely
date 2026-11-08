"use client";

import { useActionState } from "react";
import { setBudgets } from "@/actions/budgets";
import { Button } from "@/components/ui/button";
import { FormError, TextInput } from "@/components/ui/field";
import { formErrorOf } from "@/components/ui/form-state";
import { Label } from "@/components/ui/label";
import { YEN_SIGN } from "@/lib/money";

/**
 * 予算をまとめて保存する（FR-B1）。
 *
 * **1 件ずつ保存させない。** 13 カテゴリで 13 回の送信になる。
 * 1 つのフォームで全カテゴリを送り、サーバー側で差分を upsert / delete する。
 */
export function BudgetForm({
  categories,
}: {
  categories: readonly { id: string; name: string; amount: number | null }[];
}) {
  const [state, action, pending] = useActionState(setBudgets, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.ok ? (
        <p className="rounded-xl bg-income/10 px-3.5 py-3 text-sm text-income ring-1 ring-income/25">
          予算を保存しました。
        </p>
      ) : null}
      <FormError message={formErrorOf(state)} />

      <div className="flex flex-col gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between gap-3"
          >
            <Label
              htmlFor={`budget-${category.id}`}
              className="min-w-0 flex-1 truncate font-normal"
            >
              {category.name}
            </Label>
            <div className="flex w-40 items-center gap-1.5">
              <span className="text-sm text-muted-foreground">{YEN_SIGN}</span>
              <TextInput
                id={`budget-${category.id}`}
                name={`budget-${category.id}`}
                defaultValue={category.amount ?? ""}
                inputMode="numeric"
                autoComplete="off"
                placeholder="なし"
                className="text-right tabular-nums"
              />
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full" pending={pending}>
        {pending ? "保存中…" : "予算を保存する"}
      </Button>
    </form>
  );
}
