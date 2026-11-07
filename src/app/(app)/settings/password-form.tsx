"use client";

import { useActionState } from "react";
import { updatePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.ok ? (
        <p className="rounded-xl border border-income/40 bg-income/10 px-3.5 py-3 text-sm text-income">
          パスワードを変更しました。次回からこのパスワードでログインできます。
        </p>
      ) : null}
      <FormError message={formErrorOf(state)} />
      <Field
        label="新しいパスワード"
        htmlFor="password"
        error={errorFor(state, "password")}
        hint={`${MIN_PASSWORD_LENGTH} 文字以上`}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </Field>
      <Field
        label="新しいパスワード（確認）"
        htmlFor="passwordConfirmation"
        error={errorFor(state, "passwordConfirmation")}
      >
        <TextInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "変更中…" : "パスワードを変更する"}
      </Button>
    </form>
  );
}
