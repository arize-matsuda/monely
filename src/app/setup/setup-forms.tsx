"use client";

import { useActionState } from "react";
import { createHousehold, joinHousehold } from "@/actions/household";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/ui/field";
import type { ActionResult } from "@/lib/types";

function errorFor(state: ActionResult | null, field: string) {
  return state?.ok === false && state.error.field === field
    ? state.error.message
    : undefined;
}

function formErrorOf(state: ActionResult | null) {
  return state?.ok === false && !state.error.field
    ? state.error.message
    : undefined;
}

export function CreateHouseholdForm({
  defaultDisplayName,
}: {
  defaultDisplayName: string;
}) {
  const [state, action, pending] = useActionState(createHousehold, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={formErrorOf(state)} />
      <Field
        label="あなたの名前"
        htmlFor="create-displayName"
        error={errorFor(state, "displayName")}
        hint="一覧で「支払った人」として表示されます"
      >
        <TextInput
          id="create-displayName"
          name="displayName"
          defaultValue={defaultDisplayName}
          maxLength={20}
          required
        />
      </Field>
      <Field
        label="わが家の名前"
        htmlFor="create-householdName"
        error={errorFor(state, "householdName")}
      >
        <TextInput
          id="create-householdName"
          name="householdName"
          defaultValue="わが家"
          maxLength={30}
          required
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" pending={pending}>
        {pending ? "作成中…" : "家計簿を作る"}
      </Button>
    </form>
  );
}

export function JoinHouseholdForm({
  defaultDisplayName,
}: {
  defaultDisplayName: string;
}) {
  const [state, action, pending] = useActionState(joinHousehold, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={formErrorOf(state)} />
      <Field
        label="あなたの名前"
        htmlFor="join-displayName"
        error={errorFor(state, "displayName")}
      >
        <TextInput
          id="join-displayName"
          name="displayName"
          defaultValue={defaultDisplayName}
          maxLength={20}
          required
        />
      </Field>
      <Field
        label="招待コード（6桁）"
        htmlFor="join-inviteCode"
        error={errorFor(state, "inviteCode")}
        hint="家計簿を作った人が設定画面で確認できます"
      >
        <TextInput
          id="join-inviteCode"
          name="inviteCode"
          maxLength={6}
          required
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="A1B2C3"
          className="font-mono text-lg uppercase tracking-[0.2em]"
        />
      </Field>
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="w-full"
        pending={pending}
      >
        {pending ? "参加中…" : "参加する"}
      </Button>
    </form>
  );
}
