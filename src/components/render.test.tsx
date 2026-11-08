import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TransactionRow as Row } from "@/lib/data/transactions";
import { EmptyMonth } from "./empty-month";
import { MonthSummary } from "./month-summary";
import { MonthSwitcher } from "./month-switcher";
import { TransactionList } from "./transaction-list";
import { TransactionRow } from "./transaction-row";

/**
 * 画面部品の**煙テスト**。`react-dom/server` で描画して落ちないことを見る。
 *
 * **ブラウザも新しい依存も使わない。** `next/link` もそのまま描ける。
 * 見た目は検証しない。狙いは「ビルドと型は通るのに画面が落ちる」類を
 * 止めること。
 *
 * これを書いた理由: `Button` に `pending` を足したときに `asChild` を
 * 壊し、`MonthSwitcher` が「Slot failed to slot onto its children」で
 * 落ちた。ホーム画面が丸ごと表示できない状態だったが、
 * **`tsc` も `pnpm build` も通っていた。**
 *
 * Client Component（`TransactionForm` など）はここでは扱わない。
 * `useActionState` がサーバー描画で動かないため。
 */

const TODAY = new Date("2026-11-08T00:00:00.000Z");

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "00000000-0000-7000-8000-000000000001",
    householdId: "h1",
    kind: "expense",
    amount: 1280,
    occurredOn: new Date("2026-11-07T00:00:00.000Z"),
    memo: "スーパー",
    categoryId: "c1",
    paidById: "p1",
    createdById: "p1",
    createdAt: TODAY,
    updatedAt: TODAY,
    category: { name: "食費" },
    paidBy: { displayName: "たっつ" },
    ...overrides,
  } as Row;
}

describe("ホーム画面の部品", () => {
  // ★ ここが落ちていた（asChild の Button を 2 つ持つ）
  it("★ MonthSwitcher が描ける", () => {
    const html = renderToStaticMarkup(<MonthSwitcher month="2026-11" />);
    expect(html).toContain("2026年11月");
    expect(html).toContain('href="/?m=2026-10"');
    expect(html).toContain('href="/?m=2026-12"');
    // **Button の見た目がリンクに届いていること。**
    // Slot が Fragment を受け取ると props を黙って捨てるので、
    // href だけ見ていると「無装飾のリンク」を見逃す
    expect(html).toContain("size-11");
    expect(html).toContain('data-slot="button"');
  });

  it("MonthSummary が描ける", () => {
    const html = renderToStaticMarkup(
      <MonthSummary
        summary={{ expense: 182400, income: 320000, balance: 137600 }}
      />,
    );
    expect(html).toContain("¥182,400");
    expect(html).toContain("+¥320,000");
  });

  it("MonthSummary はマイナスの差額を deficit の色で出す", () => {
    const html = renderToStaticMarkup(
      <MonthSummary
        summary={{ expense: 5000, income: 1000, balance: -4000 }}
      />,
    );
    expect(html).toContain("text-deficit");
  });

  // ★ ここも落ちていた（asChild の Button を持つ）
  it("★ EmptyMonth が描ける", () => {
    const html = renderToStaticMarkup(<EmptyMonth />);
    expect(html).toContain("まだ記録がありません");
    expect(html).toContain('href="/new"');
    expect(html).toContain("h-12");
    expect(html).toContain('data-slot="button"');
  });

  it("TransactionRow が描ける", () => {
    const html = renderToStaticMarkup(
      <TransactionRow
        id="t1"
        kind="expense"
        amount={1280}
        memo="スーパー"
        categoryName="食費"
        paidByName="たっつ"
      />,
    );
    expect(html).toContain('href="/transactions/t1"');
    expect(html).toContain("食費");
    expect(html).toContain("スーパー");
  });

  it("TransactionRow はカテゴリが無ければ「未分類」", () => {
    const html = renderToStaticMarkup(
      <TransactionRow
        id="t1"
        kind="income"
        amount={320000}
        memo={null}
        categoryName={null}
        paidByName={null}
      />,
    );
    expect(html).toContain("未分類");
    expect(html).toContain("text-income");
  });

  it("TransactionList が日付ごとにまとめて描ける", () => {
    const html = renderToStaticMarkup(
      <TransactionList rows={[row(), row()]} today={TODAY} />,
    );
    expect(html).toContain("昨日");
    expect(html).toContain("食費");
  });
});
