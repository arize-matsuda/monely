"use client";

import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import { MailSentNotice } from "@/components/ui/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);

  if (state?.ok) {
    return (
      <MailSentNotice email={state.data.email}>
        に確認メールを送りました。メールのリンクを開くと登録が完了します。
      </MailSentNotice>
    );
  }

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
        label="パスワード（確認）"
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
        {pending ? "登録中…" : "アカウントを作る"}
      </Button>
    </form>
  );
}
