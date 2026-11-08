"use client";

import { CircleCheck } from "lucide-react";
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
        <p className="flex items-start gap-2 rounded-xl bg-income/10 px-3.5 py-3 text-sm leading-relaxed text-income ring-1 ring-income/25">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
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
      <Button type="submit" className="w-full" pending={pending}>
        {pending ? "変更中…" : "パスワードを変更する"}
      </Button>
    </form>
  );
}
