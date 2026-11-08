"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { errorFor, formErrorOf } from "@/components/ui/form-state";
import type { ActionResult, Kind } from "@/lib/types";
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
  submitLabel: string;
  pendingLabel: string;
  /** 編集画面の削除ボタンなど */
  footer?: React.ReactNode;
};

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
  submitLabel,
  pendingLabel,
  footer,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [amount, setAmount] = useState(initial.amount);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
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

  function switchKind(next: Kind) {
    setKind(next);
    // 種別を変えると選択肢が入れ替わるので、選択済みのカテゴリはクリアする
    setCategoryId("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="amount" value={digits} />
      <input type="hidden" name="categoryId" value={categoryId} />

      <FormError message={formErrorOf(state)} />

      {/* 種別 */}
      <fieldset className="flex gap-1 rounded-xl border border-border bg-background p-1">
        <legend className="sr-only">種別</legend>
        {(["expense", "income"] as const).map((value) => (
          <label
            key={value}
            className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-accent ${
              kind === value
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <input
              type="radio"
              name="kind-ui"
              value={value}
              checked={kind === value}
              onChange={() => switchKind(value)}
              className="sr-only"
            />
            {value === "expense" ? "支出" : "収入"}
          </label>
        ))}
      </fieldset>

      {/* 金額。開いた瞬間にここへフォーカスする */}
      <div>
        <label htmlFor={amountId} className="sr-only">
          金額
        </label>
        <div className="flex items-baseline justify-center gap-2 border-b border-border pb-2">
          <span className="text-2xl text-muted">¥</span>
          <input
            id={amountId}
            // biome-ignore lint/a11y/noAutofocus: 開いた瞬間に金額を打てることが最優先（NFR-U2）
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={display}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            aria-describedby={`${amountId}-error`}
            className="w-full bg-transparent text-right text-4xl tabular-nums outline-none placeholder:text-muted"
          />
        </div>
        <p id={`${amountId}-error`} className="mt-1.5 text-sm text-danger">
          {errorFor(state, "amount")}
        </p>
      </div>

      {/* カテゴリ。1 タップで選べるように並べる */}
      <div>
        <p className="mb-2 text-sm font-medium">カテゴリ</p>
        <div className="flex flex-wrap gap-2">
          {visible.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                setCategoryId(categoryId === category.id ? "" : category.id)
              }
              aria-pressed={categoryId === category.id}
              className={`h-11 rounded-xl border px-4 text-sm transition-colors ${
                categoryId === category.id
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-foreground hover:bg-background"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
        {errorFor(state, "categoryId") ? (
          <p className="mt-1.5 text-sm text-danger">
            {errorFor(state, "categoryId")}
          </p>
        ) : null}
      </div>

      {/* 既定値で済むものは折りたたむ */}
      <div className="rounded-xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          aria-expanded={detailsOpen}
          className="flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-sm"
        >
          <span className="text-muted">日付・支払った人・メモ</span>
          <span className="text-muted">{detailsOpen ? "▲" : "▼"}</span>
        </button>

        <div
          className={detailsOpen ? "flex flex-col gap-4 p-4 pt-0" : "hidden"}
        >
          <Row
            label="日付"
            htmlFor={dateId}
            error={errorFor(state, "occurredOn")}
          >
            <input
              id={dateId}
              type="date"
              name="occurredOn"
              defaultValue={initial.occurredOn}
              required
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
            />
          </Row>

          <Row
            label="支払った人"
            htmlFor={paidById}
            error={errorFor(state, "paidById")}
          >
            <select
              id={paidById}
              name="paidById"
              defaultValue={initial.paidById}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
            >
              <option value="">指定しない</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </Row>

          <Row label="メモ" htmlFor={memoId} error={errorFor(state, "memo")}>
            <input
              id={memoId}
              type="text"
              name="memo"
              defaultValue={initial.memo}
              maxLength={200}
              placeholder="任意"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
            />
          </Row>
        </div>
      </div>

      {/* 画面下部（親指が届く位置） */}
      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        <Link
          href="/"
          className="flex h-11 items-center justify-center text-sm text-muted"
        >
          やめる
        </Link>
        {footer}
      </div>

      {/* 上限を超える入力をその場で気づけるように */}
      {digits !== "" && Number(digits) > MAX_AMOUNT ? (
        <p className="text-sm text-danger">金額が大きすぎます</p>
      ) : null}
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted">
        {label}
      </label>
      {children}
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </div>
  );
}
