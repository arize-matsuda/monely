import { ChartPie, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  breakdownByCategory,
  type CategoryShare,
} from "@/lib/category-breakdown";
import type { TransactionRow } from "@/lib/data/transactions";
import { compareAmount, formatDiff, formatYen } from "@/lib/money";

/**
 * カテゴリ別の内訳（FR-L8 / ADR-0009）。
 *
 * **横棒だけで作る。** 円グラフは、スマホ幅で凡例を置く場所が無く、
 * 値を読み取りにくい。横棒なら「名前・金額・割合」を同じ行に並べられる。
 * グラフ描画ライブラリを入れない理由もこれ（ADR-0009）。
 *
 * 色は `--chart-1`〜`5` を順に使い、6 つ目以降は巡回させる。
 */
const CHART_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export function CategoryBreakdown({
  rows,
  previousRows,
}: {
  rows: readonly TransactionRow[];
  /** 先月の行。渡すと各カテゴリに先月比が付く（FR-L9） */
  previousRows?: readonly TransactionRow[];
}) {
  const shares = breakdownByCategory(rows, previousRows);
  if (shares.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartPie className="size-4 text-muted-foreground" aria-hidden />
          カテゴリ別の内訳
        </CardTitle>
        <CardDescription>支出 {shares.length} カテゴリ</CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          表ではなく dl。名前と金額の対応が読み上げで伝わる。
          割合は目で見るためのもので、数値も文字で出している
        */}
        <dl className="flex flex-col gap-3">
          {shares.map((share, index) => (
            <Share
              key={share.categoryId ?? "uncategorized"}
              share={share}
              color={CHART_COLORS[index % CHART_COLORS.length] as string}
            />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * カテゴリごとの先月比。**矢印と金額だけで、色は付けない。**
 *
 * 支出が増えたことを赤で出すと、月初（まだ記録が少ない月）が
 * 常に「改善」に見えてしまう。判断は利用者に委ねる。
 */
function PreviousMonth({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const { diff } = compareAmount(current, previous);

  // 先月に使っていなかったカテゴリは「新規」と出す（+100% より分かりやすい）
  if (previous === 0) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground">新しく追加</span>
    );
  }

  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

  return (
    <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
      <Icon className="size-3" aria-hidden />
      {diff === 0 ? "先月と同じ" : formatDiff(diff)}
    </span>
  );
}

function Share({ share, color }: { share: CategoryShare; color: string }) {
  const percent = Math.round(share.ratio * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <dt className="flex min-w-0 items-baseline gap-2">
          <span className="truncate">{share.name}</span>
          {share.previousTotal === undefined ? null : (
            <PreviousMonth
              current={share.total}
              previous={share.previousTotal}
            />
          )}
        </dt>
        <dd className="flex shrink-0 items-baseline gap-2 tabular-nums">
          <span className="font-medium">{formatYen(share.total)}</span>
          <span className="w-9 text-right text-xs text-muted-foreground">
            {percent}%
          </span>
        </dd>
      </div>
      {/*
        棒は装飾なので読み上げから隠す（上の行で金額と割合を文字で出している）。
        1% でも線が見えるように最小幅を持たせる
      */}
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(share.ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}
