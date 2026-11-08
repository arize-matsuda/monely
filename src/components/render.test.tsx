import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TransactionRow as Row } from "@/lib/data/transactions";
import { summarizeYear } from "@/lib/year-summary";
import { AppSidebar } from "./app-sidebar";
import { CategoryBreakdown } from "./category-breakdown";
import { EmptyMonth } from "./empty-month";
import { MissingCategoriesNotice } from "./missing-categories-notice";
import { MonthSummary } from "./month-summary";
import { MonthSwitcher } from "./month-switcher";
import { PayerSplit } from "./payer-split";
import { RecurringNotice } from "./recurring-notice";
import { TransactionList } from "./transaction-list";
import { TransactionRow } from "./transaction-row";
import { YearOverview } from "./year-overview";

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

  it("MonthSummary が先月比を出す（FR-L9）", () => {
    const html = renderToStaticMarkup(
      <MonthSummary
        summary={{ expense: 190000, income: 320000, balance: 130000 }}
        previous={{ expense: 180000, income: 320000, balance: 140000 }}
      />,
    );
    expect(html).toContain("先月比");
    expect(html).toContain("+¥10,000");
    expect(html).toContain("+6%");
    // 収入は変わっていないので「変わらず」
    expect(html).toContain("変わらず");
  });

  it("MonthSummary は先月に記録が無ければ比較を出さない", () => {
    const html = renderToStaticMarkup(
      <MonthSummary
        summary={{ expense: 1280, income: 0, balance: -1280 }}
        previous={{ expense: 0, income: 0, balance: 0 }}
      />,
    );
    expect(html).not.toContain("先月比");
  });

  it("MonthSummary は previous を渡さなければ比較を出さない", () => {
    const html = renderToStaticMarkup(
      <MonthSummary summary={{ expense: 1280, income: 0, balance: -1280 }} />,
    );
    expect(html).not.toContain("先月比");
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

  // 一覧で種別を一目で見分けられるようにする（UI/UX設計 §6.3）
  it("★ TransactionRow は支出を赤、収入を緑で出す", () => {
    const expense = renderToStaticMarkup(
      <TransactionRow
        id="t1"
        kind="expense"
        amount={1280}
        memo={null}
        categoryName="食費"
        paidByName={null}
      />,
    );
    expect(expense).toContain("text-deficit");
    expect(expense).not.toContain("text-income");

    const income = renderToStaticMarkup(
      <TransactionRow
        id="t2"
        kind="income"
        amount={320000}
        memo={null}
        categoryName="給与"
        paidByName={null}
      />,
    );
    expect(income).toContain("text-income");
    expect(income).not.toContain("text-deficit");
  });

  // 削除ボタンの赤を調整したときに金額の色が連動しないようにしている
  it("支出の赤は --destructive ではなく --deficit を使う", () => {
    const html = renderToStaticMarkup(
      <TransactionRow
        id="t1"
        kind="expense"
        amount={1280}
        memo={null}
        categoryName="食費"
        paidByName={null}
      />,
    );
    // Badge の基底クラスに aria-invalid:*-destructive が入るので、
    // 文字色として使われていないことだけを見る
    expect(html).not.toContain("text-destructive");
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

describe("PC 向けの部品（ADR-0009）", () => {
  it("AppSidebar が描ける", () => {
    const html = renderToStaticMarkup(
      <AppSidebar householdName="わが家" displayName="たっつ" />,
    );
    expect(html).toContain("Monely");
    expect(html).toContain("わが家");
    expect(html).toContain("たっつ");
    expect(html).toContain('href="/settings/categories"');
    // スマホには出さない
    expect(html).toContain("md:flex");
  });

  it("CategoryBreakdown が割合つきで描ける", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          // categoryId を分けないと 1 つにまとまる
          row({ amount: 7500, categoryId: "c1", category: { name: "食費" } }),
          row({ amount: 2500, categoryId: "c2", category: { name: "交通" } }),
        ]}
      />,
    );
    expect(html).toContain("食費");
    expect(html).toContain("¥7,500");
    expect(html).toContain("75%");
    expect(html).toContain("25%");
    // 棒の色はトークン経由
    expect(html).toContain("bg-chart-1");
  });

  it("CategoryBreakdown がカテゴリごとの先月比を出す（FR-L9）", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 7500, categoryId: "c1", category: { name: "食費" } }),
        ]}
        previousRows={[
          row({ amount: 5000, categoryId: "c1", category: { name: "食費" } }),
        ]}
      />,
    );
    expect(html).toContain("+¥2,500");
  });

  it("CategoryBreakdown は先月に無かったカテゴリを「新しく追加」と出す", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 3000, categoryId: "c9", category: { name: "ペット" } }),
        ]}
        previousRows={[
          row({ amount: 5000, categoryId: "c1", category: { name: "食費" } }),
        ]}
      />,
    );
    expect(html).toContain("新しく追加");
  });

  it("CategoryBreakdown は previousRows を渡さなければ先月比を出さない", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 7500, categoryId: "c1", category: { name: "食費" } }),
        ]}
      />,
    );
    expect(html).not.toContain("先月");
    expect(html).not.toContain("新しく追加");
  });

  it("CategoryBreakdown は支出が無ければ何も描かない", () => {
    expect(
      renderToStaticMarkup(
        <CategoryBreakdown rows={[row({ kind: "income", amount: 300000 })]} />,
      ),
    ).toBe("");
  });
});

describe("年のページの部品（ADR-0010）", () => {
  it("★ YearOverview が 12 か月すべて描ける", () => {
    const html = renderToStaticMarkup(
      <YearOverview
        summary={summarizeYear(2026, [
          {
            occurredOn: new Date("2026-01-15T00:00:00.000Z"),
            kind: "expense",
            amount: 182400,
          },
          {
            occurredOn: new Date("2026-03-01T00:00:00.000Z"),
            kind: "income",
            amount: 320000,
          },
        ])}
      />,
    );
    // 12 か月すべての見出しがある（記録が無い月も並べる）
    for (const label of ["1月", "2月", "6月", "12月"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("記録なし");
    expect(html).toContain("¥182,400");
    // 各月からその月のホームへ飛べる
    expect(html).toContain('href="/?m=2026-01"');
    expect(html).toContain('href="/?m=2026-12"');
    // 年間の合計
    expect(html).toContain("2026年の合計");
  });

  it("YearOverview は記録が無い年でも落ちない", () => {
    const html = renderToStaticMarkup(
      <YearOverview summary={summarizeYear(2026, [])} />,
    );
    expect(html).toContain("2026年の合計");
    // 12 行すべて「記録なし」
    expect(html.match(/記録なし/g)).toHaveLength(12);
  });
});

describe("Tier 1 の部品（ADR-0011）", () => {
  it("MissingCategoriesNotice が先月だけにあるカテゴリを出す", () => {
    const html = renderToStaticMarkup(
      <MissingCategoriesNotice
        rows={[row({ categoryId: "c1", category: { name: "食費" } })]}
        previousRows={[
          row({
            amount: 4980,
            categoryId: "c2",
            category: { name: "通信" },
          }),
        ]}
      />,
    );
    expect(html).toContain("通信");
    expect(html).toContain("先月 ¥4,980");
    // 先月の金額つきで /new へ飛ぶ
    expect(html).toContain("amount=4980");
    expect(html).toContain("category=c2");
    // 今月あるカテゴリは出さない
    expect(html).not.toContain("食費");
  });

  it("MissingCategoriesNotice は候補が無ければ何も描かない", () => {
    expect(
      renderToStaticMarkup(
        <MissingCategoriesNotice
          rows={[row({ categoryId: "c1", category: { name: "食費" } })]}
          previousRows={[row({ categoryId: "c1", category: { name: "食費" } })]}
        />,
      ),
    ).toBe("");
  });

  it("PayerSplit が支払者別の金額と精算額を出す", () => {
    const html = renderToStaticMarkup(
      <PayerSplit
        rows={[
          row({ amount: 8000, paidById: "p1" }),
          row({ amount: 2000, paidById: "p2" }),
        ]}
        members={[
          { id: "p1", displayName: "たっつ" },
          { id: "p2", displayName: "はなこ" },
        ]}
      />,
    );
    expect(html).toContain("たっつ");
    expect(html).toContain("¥8,000");
    expect(html).toContain("80%");
    // 差額 6000 の半分
    expect(html).toContain("¥3,000");
    expect(html).toContain("均等に分けるなら");
  });

  it("PayerSplit は 1 人の世帯では何も描かない", () => {
    expect(
      renderToStaticMarkup(
        <PayerSplit
          rows={[row({ amount: 8000, paidById: "p1" })]}
          members={[{ id: "p1", displayName: "たっつ" }]}
        />,
      ),
    ).toBe("");
  });

  it("PayerSplit は支出が無ければ何も描かない", () => {
    expect(
      renderToStaticMarkup(
        <PayerSplit
          rows={[row({ kind: "income", amount: 300000, paidById: "p1" })]}
          members={[
            { id: "p1", displayName: "たっつ" },
            { id: "p2", displayName: "はなこ" },
          ]}
        />,
      ),
    ).toBe("");
  });
});

describe("予算の表示（FR-B2 / ADR-0011）", () => {
  it("予算を渡すと消化率と残りを出す", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 42500, categoryId: "c1", category: { name: "食費" } }),
        ]}
        budgets={new Map([["c1", 50000]])}
      />,
    );
    expect(html).toContain("予算 ¥50,000 の85%");
    expect(html).toContain("残り ¥7,500");
    expect(html).not.toContain("超過");
  });

  it("超過は destructive で示す", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 60000, categoryId: "c1", category: { name: "食費" } }),
        ]}
        budgets={new Map([["c1", 50000]])}
      />,
    );
    expect(html).toContain("¥10,000 超過");
    expect(html).toContain("bg-destructive");
  });

  it("予算を設定していないカテゴリには出さない", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 1000, categoryId: "c9", category: { name: "雑費" } }),
        ]}
        budgets={new Map([["c1", 50000]])}
      />,
    );
    expect(html).not.toContain("予算");
  });

  it("budgets を渡さなければ従来どおり（予算の表示なし）", () => {
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        rows={[
          row({ amount: 1000, categoryId: "c1", category: { name: "食費" } }),
        ]}
      />,
    );
    expect(html).not.toContain("予算");
  });
});

describe("定期支出（FR-R2 / ADR-0011）", () => {
  it("候補の件数と合計を出す", () => {
    const html = renderToStaticMarkup(
      <RecurringNotice
        candidates={[
          { name: "家賃", amount: 85000 },
          { name: "通信", amount: 4980 },
        ]}
      />,
    );
    expect(html).toContain("家賃");
    expect(html).toContain("¥85,000");
    expect(html).toContain("2 件");
    // 合計
    expect(html).toContain("¥89,980");
  });

  it("候補が無ければ何も描かない", () => {
    expect(renderToStaticMarkup(<RecurringNotice candidates={[]} />)).toBe("");
  });
});
