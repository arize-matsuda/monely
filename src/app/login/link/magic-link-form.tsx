"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/actions/auth";
import { MailSentNotice } from "@/components/ui/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(sendMagicLink, null);

  if (state?.ok) {
    return (
      <MailSentNotice email={state.data.email}>
        にログイン用のリンクを送りました。メールのリンクを開くとログインできます。
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
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "送信中…" : "ログインリンクを送る"}
      </Button>
    </form>
  );
}
