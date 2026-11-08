"use client";

import { CircleAlert, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteTransaction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { formErrorOf } from "@/components/ui/form-state";

/**
 * 記録の削除（FR-T8）。**押す前に確認を出す。**
 * 確認はこのコンポーネント内の状態で行い、ダイアログを使わない
 * （スマホでの表示が安定するため）。
 */
export function DeleteTransaction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteTransaction, null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 aria-hidden />
        この記録を削除
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl bg-destructive/10 p-4 ring-1 ring-destructive/25"
    >
      <input type="hidden" name="id" value={id} />
      <p className="flex items-start gap-2 text-sm leading-relaxed">
        <CircleAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden
        />
        この記録を削除します。元に戻せません。
      </p>
      {formErrorOf(state) ? (
        <p className="text-sm text-destructive" role="alert">
          {formErrorOf(state)}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(false)}
          className="flex-1"
        >
          やめる
        </Button>
        <Button
          type="submit"
          variant="destructive"
          pending={pending}
          className="flex-1"
        >
          <Trash2 aria-hidden />
          {pending ? "削除中…" : "削除する"}
        </Button>
      </div>
    </form>
  );
}
