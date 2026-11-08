"use client";

import { Check, Pencil, X } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types";

type Props = {
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  label: string;
  /** FormData のキー。検証エラーの項目名にもなる */
  name: string;
  value: string;
  maxLength: number;
  hint?: string;
};

/**
 * 1 行の名前をその場で編集する（FR-H4, FR-H5）。
 *
 * 既定は読み取り専用の表示で、鉛筆を押したときだけ入力欄を出す。
 * 設定画面は「見に来る」ことが多く、入力欄が並んでいると
 * 誤ってタップして書き換えてしまう。
 */
export function InlineRename({
  action,
  label,
  name,
  value,
  maxLength,
  hint,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [editing, setEditing] = useState(false);
  const inputId = useId();

  // 保存が通ったら表示に戻す。失敗したら開いたままにして入力を残す
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate">{value}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden />
          変更
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <TextInput
          id={inputId}
          name={name}
          defaultValue={value}
          maxLength={maxLength}
          required
          // 鉛筆を押して開いた直後なので、入力欄に移るのが期待される動き
          autoFocus
        />
        <Button type="submit" size="icon" disabled={pending} aria-label="保存">
          <Check aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditing(false)}
          aria-label="やめる"
        >
          <X aria-hidden />
        </Button>
      </div>
      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      {(errorFor(state, name) ?? formErrorOf(state)) ? (
        <p className="text-sm text-destructive" role="alert">
          {errorFor(state, name) ?? formErrorOf(state)}
        </p>
      ) : null}
    </form>
  );
}
