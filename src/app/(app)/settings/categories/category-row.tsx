"use client";

import { Check, Eye, EyeOff, Pencil, X } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { renameCategory, setCategoryArchived } from "@/actions/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MAX_CATEGORY_NAME } from "@/lib/validation";

/**
 * カテゴリ 1 行（FR-C4, FR-C5）。
 *
 * 改名と表示切り替えを別々の form にしている。
 * 1 つの form に 2 つの送信ボタンを入れると、
 * Enter キーでどちらが動くかが利用者から見て分からない。
 */
export function CategoryRow({
  id,
  name,
  archived,
  transactionCount,
}: {
  id: string;
  name: string;
  archived: boolean;
  transactionCount: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <RenameForm id={id} name={name} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-xl px-1">
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          archived && "text-muted-foreground",
        )}
      >
        {name}
      </span>

      {transactionCount > 0 ? (
        <Badge variant="outline" className="shrink-0">
          {transactionCount} 件
        </Badge>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setEditing(true)}
        aria-label={`${name} の名前を変える`}
      >
        <Pencil aria-hidden />
      </Button>

      <ArchiveButton id={id} name={name} archived={archived} />
    </div>
  );
}

function RenameForm({
  id,
  name,
  onDone,
}: {
  id: string;
  name: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(renameCategory, null);
  const inputId = useId();

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const message = errorFor(state, "name") ?? formErrorOf(state);

  return (
    <form action={action} className="flex flex-col gap-1.5 px-1 py-1">
      <input type="hidden" name="id" value={id} />
      <Label htmlFor={inputId} className="sr-only">
        カテゴリ名
      </Label>
      <div className="flex items-center gap-2">
        <TextInput
          id={inputId}
          name="name"
          defaultValue={name}
          maxLength={MAX_CATEGORY_NAME}
          required
          // 鉛筆を押して開いた直後なので、入力欄に移るのが期待される動き
          autoFocus
          aria-invalid={message ? true : undefined}
        />
        <Button type="submit" size="icon" pending={pending} aria-label="保存">
          <Check aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDone}
          aria-label="やめる"
        >
          <X aria-hidden />
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * 非表示にする / 表示に戻す。
 * **確認は出さない。** 元に戻せる操作なので、1 タップで往復できるほうがよい。
 */
function ArchiveButton({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  archived: boolean;
}) {
  const [state, action, pending] = useActionState(setCategoryArchived, null);

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="archived"
        value={archived ? "false" : "true"}
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        pending={pending}
        aria-label={
          archived ? `${name} を表示に戻す` : `${name} を非表示にする`
        }
        title={formErrorOf(state)}
      >
        {archived ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      </Button>
    </form>
  );
}
