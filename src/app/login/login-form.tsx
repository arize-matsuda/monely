"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm">
          <strong className="font-medium">{state.data.email}</strong>{" "}
          にログイン用のリンクを送りました。メールを確認してください。
        </p>
        <p className="text-xs text-muted">
          届かない場合は迷惑メールフォルダを確認してください。
        </p>
      </div>
    );
  }

  const fieldError =
    state?.ok === false && state.error.field === "email"
      ? state.error.message
      : undefined;
  const formError =
    state?.ok === false && !state.error.field ? state.error.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={formError} />
      <Field label="メールアドレス" htmlFor="email" error={fieldError}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "送信中…" : "ログインリンクを送る"}
      </Button>
    </form>
  );
}
