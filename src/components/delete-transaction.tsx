"use client";

import { useActionState, useState } from "react";
import { deleteTransaction } from "@/actions/transactions";
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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-11 items-center justify-center text-sm text-danger"
      >
        この記録を削除
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">この記録を削除します。元に戻せません。</p>
      {formErrorOf(state) ? (
        <p className="text-sm text-danger" role="alert">
          {formErrorOf(state)}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface text-sm"
        >
          やめる
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-danger text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "削除中…" : "削除する"}
        </button>
      </div>
    </form>
  );
}
