import Link from "next/link";

/** 記録が 0 件の月（FR-L6）。中央に「記録する」への導線を出す */
export function EmptyMonth() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-border border-dashed px-4 py-14 text-center">
      <p className="text-muted">まだ記録がありません</p>
      <Link
        href="/new"
        className="flex h-12 items-center justify-center rounded-xl bg-accent px-8 text-base font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        記録する
      </Link>
    </div>
  );
}
