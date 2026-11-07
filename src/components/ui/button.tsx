import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & { variant?: "primary" | "secondary" };

/** 高さ 48px。親指で押せる大きさを確保する（NFR-U7） */
export function Button({ variant = "primary", className, ...props }: Props) {
  const base =
    "flex h-12 w-full items-center justify-center rounded-xl px-5 text-base font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-foreground hover:opacity-90"
      : "border border-border bg-surface text-foreground hover:bg-background";
  return (
    <button
      {...props}
      className={`${base} ${styles} ${className ?? ""}`.trim()}
    />
  );
}
