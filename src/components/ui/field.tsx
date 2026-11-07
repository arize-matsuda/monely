import type { ComponentProps, ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-base outline-none focus-visible:border-accent ${className ?? ""}`.trim()}
    />
  );
}

/** フォーム全体のエラー（通信失敗など）。入力内容は消さない */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-danger"
      role="alert"
    >
      {message}
    </p>
  );
}
