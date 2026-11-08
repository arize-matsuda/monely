import { ChartPie } from "lucide-react";
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
import { formatYen } from "@/lib/money";

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
}: {
  rows: readonly TransactionRow[];
}) {
  const shares = breakdownByCategory(rows);
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

function Share({ share, color }: { share: CategoryShare; color: string }) {
  const percent = Math.round(share.ratio * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <dt className="min-w-0 truncate">{share.name}</dt>
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
