"use client";

import { cn } from "@/lib/utils";

export type Segment<T extends string> = { value: T; label: string };

/**
 * 2〜3 個の選択肢を横に並べる切り替え（種別、表示テーマ）。
 *
 * 見た目はセグメントコントロールだが、**中身は本物の radio**。
 * 矢印キーでの移動とスクリーンリーダーの読み上げが標準で効く。
 * Radix の ToggleGroup を使わないのはこの理由（単一選択でも role は group）。
 */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  className,
}: {
  legend: string;
  /** ページ内で重複しない名前。同名の radio は互いを打ち消す */
  name: string;
  options: readonly Segment<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        "flex gap-1 rounded-xl bg-muted p-1 ring-1 ring-foreground/5",
        className,
      )}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            data-selected={selected}
            className={cn(
              "flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors",
              "focus-within:ring-3 focus-within:ring-ring/50",
              selected
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
