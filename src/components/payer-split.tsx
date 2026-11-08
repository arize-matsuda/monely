import { ArrowRight, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { TransactionRow } from "@/lib/data/transactions";
import { formatYen } from "@/lib/money";
import { type PayerShare, splitByPayer } from "@/lib/payer-split";

/**
 * 支払者別の集計と精算（FR-L12 / ADR-0011）。
 *
 * **1 人の世帯では出さない。** 自分しかいないなら「誰が払ったか」に
 * 意味が無い。
 *
 * 精算額は 2 人の世帯で支払者が全員分かっているときだけ出る
 * （条件は `splitByPayer` 側）。家計を完全に合算している場合は
 * 精算額を無視して、支払者別の金額だけ見ればよい。
 */
const CHART_COLORS = [
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-1",
] as const;

export function PayerSplit({
  rows,
  members,
}: {
  rows: readonly TransactionRow[];
  members: readonly { id: string; displayName: string }[];
}) {
  if (members.length < 2) return null;

  const { shares, total, settlement } = splitByPayer(rows, members);
  if (total === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          誰が払ったか
        </CardTitle>
        <CardDescription>支出 {formatYen(total)} の内訳</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="flex flex-col gap-3">
          {shares.map((share, index) => (
            <Share
              key={share.profileId ?? "unknown"}
              share={share}
              color={CHART_COLORS[index % CHART_COLORS.length] as string}
            />
          ))}
        </dl>

        {settlement === null ? null : (
          <>
            <Separator />
            <p className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">均等に分けるなら</span>
              <span className="font-medium">{settlement.toName}</span>
              <ArrowRight
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
              <span className="font-medium">{settlement.fromName}</span>
              <span className="font-semibold tabular-nums">
                {formatYen(settlement.amount)}
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Share({ share, color }: { share: PayerShare; color: string }) {
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
      {/* 棒は装飾。金額と割合は上に文字で出している */}
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(share.ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}
