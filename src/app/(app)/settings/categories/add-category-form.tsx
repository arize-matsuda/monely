"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import { Label } from "@/components/ui/label";
import type { Kind } from "@/lib/types";
import { MAX_CATEGORY_NAME } from "@/lib/validation";

/**
 * カテゴリを追加する（FR-C3）。
 *
 * 追加が通ったら入力欄を空にして開いたままにする。
 * 最初に使うときは何件か続けて足すことが多い。
 */
export function AddCategoryForm({ kind }: { kind: Kind }) {
  const [state, action, pending] = useActionState(createCategory, null);
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="mt-2 justify-start text-muted-foreground"
      >
        <Plus aria-hidden />
        カテゴリを追加
      </Button>
    );
  }

  const message = errorFor(state, "name") ?? formErrorOf(state);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-2 flex flex-col gap-1.5 border-t border-border px-1 pt-3"
    >
      <input type="hidden" name="kind" value={kind} />
      <Label htmlFor={inputId} className="text-muted-foreground">
        追加するカテゴリ名
      </Label>
      <div className="flex items-center gap-2">
        <TextInput
          id={inputId}
          name="name"
          maxLength={MAX_CATEGORY_NAME}
          required
          placeholder="例: ペット"
          // 「追加」を押して開いた直後なので、入力欄に移るのが期待される動き
          autoFocus
          aria-invalid={message ? true : undefined}
        />
        <Button type="submit" pending={pending}>
          {pending ? "追加中…" : "追加"}
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(false)}
        className="self-start text-muted-foreground"
      >
        閉じる
      </Button>
    </form>
  );
}
