"use client";

import { Check, ChevronDown, CircleAlert } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FormError, SelectInput, TextInput } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ActionResult, Kind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MAX_AMOUNT } from "@/lib/validation";

export type CategoryOption = { id: string; name: string; kind: Kind };
export type MemberOption = { id: string; displayName: string };

export type TransactionFormValues = {
  id?: string;
  kind: Kind;
  amount: string;
  occurredOn: string;
  categoryId: string;
  paidById: string;
  memo: string;
};

type Props = {
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  categories: readonly CategoryOption[];
  members: readonly MemberOption[];
  initial: TransactionFormValues;
  /**
   * 日付の「今日 / 昨日」（UI/UX設計 §5.5）。
   * **サーバーで作って渡す。** ここで new Date() を読むと
   * ハイドレーションがずれる（coding-standards §8.0）。
   */
  dateShortcuts: readonly { label: string; value: string }[];
  submitLabel: string;
  pendingLabel: string;
  /** 編集画面の削除ボタンなど */
  footer?: React.ReactNode;
};

const KINDS = [
  { value: "expense", label: "支出" },
  { value: "income", label: "収入" },
] as const satisfies readonly { value: Kind; label: string }[];

/**
 * 記録の入力フォーム（FR-T1〜T6）。`/new` と編集画面で共有する。
 *
 * **設計の核: 開いた瞬間に金額を打てる。** カテゴリを 1 タップすれば保存できる。
 * 日付・支払った人・メモは既定値のままでよいので折りたたむ（UI/UX設計 §4.2）。
 */
export function TransactionForm({
  action,
  categories,
  members,
  initial,
  dateShortcuts,
  submitLabel,
  pendingLabel,
  footer,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [amount, setAmount] = useState(initial.amount);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [occurredOn, setOccurredOn] = useState(initial.occurredOn);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const amountId = useId();
  const dateId = useId();
  const paidById = useId();
  const memoId = useId();
  const visible = categories.filter((category) => category.kind === kind);

  // 3 桁区切りで見せるが、送るのは数値だけ（UI/UX設計 §5.4）
  const digits = amount.replace(/\D/g, "");
  const display = digits === "" ? "" : Number(digits).toLocaleString("ja-JP");
  const canSubmit = digits !== "" && Number(digits) > 0;
  const tooLarge = digits !== "" && Number(digits) > MAX_AMOUNT;

  function switchKind(next: Kind) {
    setKind(next);
    // 種別を変えると選択肢が入れ替わるので、選択済みのカテゴリはクリアする
    setCategoryId("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="amount" value={digits} />
      <input type="hidden" name="categoryId" value={categoryId} />

      <FormError message={formErrorOf(state)} />

      <SegmentedControl
        legend="種別"
        name="kind-ui"
        options={KINDS}
        value={kind}
        onChange={switchKind}
      />

      {/* 金額。開いた瞬間にここへフォーカスする */}
      <Card className="[--card-spacing:--spacing(5)]">
        <CardContent>
          <Label htmlFor={amountId} className="sr-only">
            金額
          </Label>
          <div className="flex items-center justify-center gap-2">
            <span
              className={cn(
                "text-3xl font-light",
                canSubmit
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50",
              )}
            >
              ¥
            </span>
            <input
              id={amountId}
              // biome-ignore lint/a11y/noAutofocus: 開いた瞬間に金額を打てることが最優先（NFR-U2）
              autoFocus
              inputMode="numeric"
              /*
               * **pattern を付けてはいけない。** この欄は 3 桁区切りで
               * 「1,280」と表示するので、pattern="[0-9]*" を付けると
               * 1,000 円以上でブラウザが「指定されている形式で入力して
               * ください」と出して送信を止める（999 円以下は通るので
               * 気づきにくい）。
               * 数値キーボードは inputMode="numeric" だけで開く。
               * 実際の検証はサーバーの parseAmount が行う。
               */
              autoComplete="off"
              value={display}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              aria-invalid={tooLarge || undefined}
              aria-describedby={`${amountId}-error`}
              className="min-w-0 flex-1 bg-transparent text-right text-5xl font-semibold tabular-nums outline-none placeholder:font-light placeholder:text-muted-foreground/40"
            />
          </div>
        </CardContent>
      </Card>

      <p
        id={`${amountId}-error`}
        className="-mt-3 min-h-5 px-1 text-sm text-destructive"
      >
        {tooLarge ? "金額が大きすぎます" : errorFor(state, "amount")}
      </p>

      {/* カテゴリ。1 タップで選べるように並べる */}
      <div className="-mt-1">
        <p className="mb-2 px-1 text-sm font-medium">カテゴリ</p>
        <div className="flex flex-wrap gap-2">
          {visible.map((category) => {
            const selected = categoryId === category.id;
            return (
              <Button
                key={category.id}
                type="button"
                variant={selected ? "default" : "outline"}
                onClick={() => setCategoryId(selected ? "" : category.id)}
                aria-pressed={selected}
              >
                {selected ? <Check aria-hidden /> : null}
                {category.name}
              </Button>
            );
          })}
        </div>
        {errorFor(state, "categoryId") ? (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-sm text-destructive">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {errorFor(state, "categoryId")}
          </p>
        ) : null}
      </div>

      {/* 既定値で済むものは折りたたむ */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} asChild>
        <Card className="[--card-spacing:--spacing(0)]">
          <CollapsibleTrigger className="flex h-12 w-full items-center justify-between px-4 text-sm outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="text-muted-foreground">
              日付・支払った人・メモ
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                detailsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>

          {/*
            forceMount が要る。閉じているあいだ Radix が中身を外すと
            occurredOn などが FormData に載らず、保存が失敗する。
            display:none の要素でも入力値は送信される。
          */}
          <CollapsibleContent forceMount className="data-[state=closed]:hidden">
            <div className="flex flex-col gap-4 border-t border-border p-4">
              <Row
                label="日付"
                htmlFor={dateId}
                error={errorFor(state, "occurredOn")}
              >
                <div className="flex flex-col gap-2">
                  <TextInput
                    id={dateId}
                    type="date"
                    name="occurredOn"
                    value={occurredOn}
                    onChange={(event) => setOccurredOn(event.target.value)}
                    required
                  />
                  {/* カレンダーを開かせずに済む分だけタップ数が減る */}
                  <div className="flex gap-2">
                    {dateShortcuts.map((shortcut) => (
                      <Button
                        key={shortcut.value}
                        type="button"
                        variant={
                          occurredOn === shortcut.value ? "default" : "outline"
                        }
                        onClick={() => setOccurredOn(shortcut.value)}
                        aria-pressed={occurredOn === shortcut.value}
                      >
                        {shortcut.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Row>

              <Row
                label="支払った人"
                htmlFor={paidById}
                error={errorFor(state, "paidById")}
              >
                <SelectInput
                  id={paidById}
                  name="paidById"
                  defaultValue={initial.paidById}
                >
                  <option value="">指定しない</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </SelectInput>
              </Row>

              <Row
                label="メモ"
                htmlFor={memoId}
                error={errorFor(state, "memo")}
              >
                <TextInput
                  id={memoId}
                  type="text"
                  name="memo"
                  defaultValue={initial.memo}
                  maxLength={200}
                  placeholder="任意"
                />
              </Row>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 画面下部（親指が届く位置）。やめるときは左上の ✕ */}
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" pending={pending} disabled={!canSubmit}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}

/**
 * 折りたたみ内の 1 行。
 * `htmlFor` で明示的に関連付ける（label で包む暗黙の関連付けに頼らない）。
 */
function Row({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
