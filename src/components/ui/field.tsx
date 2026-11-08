import { CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p
          className="flex items-center gap-1.5 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * shadcn の Input をそのまま使う。
 * 既存の呼び出し側の名前を変えないために別名で出している。
 */
export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <Input className={className} {...props} />;
}

/**
 * ネイティブの `<select>`。Radix の Select は使わない。
 * スマホでは OS 標準のピッカーが開くほうが速く、確実に操作できる。
 */
export function SelectInput({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select-native"
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-input bg-transparent px-3.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

/** フォーム全体のエラー（通信失敗など）。入力内容は消さない */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive ring-1 ring-destructive/25"
      role="alert"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
