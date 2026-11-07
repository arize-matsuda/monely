"use client";

import { useActionState } from "react";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={formErrorOf(state)} />
      <Field
        label="メールアドレス"
        htmlFor="email"
        error={errorFor(state, "email")}
      >
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
      <Field
        label="パスワード"
        htmlFor="password"
        error={errorFor(state, "password")}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}
