import type { BudgetMap } from "./data/budgets";

/**
 * 予算の消化率（FR-B2 / ADR-0011）。
 *
 * **DB に問い合わせない。** 予算の一覧と、既に取得済みのカテゴリ別合計を
 * 突き合わせるだけ。
 */

export type BudgetUsage = {
  /** 予算額（円） */
  budget: number;
  /** 使った額（円） */
  spent: number;
  /** 消化率（0〜）。**1 を超えうる**（超過） */
  ratio: number;
  /** 予算を超えているか */
  over: boolean;
  /** 残り（円）。超過時は負 */
  remaining: number;
};

/** 予算を設定していないカテゴリは null */
export function budgetUsage(
  budgets: BudgetMap,
  categoryId: string | null,
  spent: number,
): BudgetUsage | null {
  if (categoryId === null) return null;
  const budget = budgets.get(categoryId);
  if (budget === undefined || budget <= 0) return null;

  return {
    budget,
    spent,
    ratio: spent / budget,
    over: spent > budget,
    remaining: budget - spent,
  };
}

/**
 * 予算を設定しているカテゴリの合計（FR-B3）。
 *
 * **予算を設定していないカテゴリの支出は含めない。** 混ぜると
 * 「予算 10 万に対して 15 万使った」が、予算外の支出のせいなのか
 * 使いすぎなのか分からなくなる。
 */
export function totalBudgetUsage(
  budgets: BudgetMap,
  spentByCategory: readonly { categoryId: string | null; total: number }[],
): BudgetUsage | null {
  let budget = 0;
  let spent = 0;

  for (const [, amount] of budgets) {
    budget += amount;
  }
  if (budget === 0) return null;

  for (const row of spentByCategory) {
    if (row.categoryId === null) continue;
    if (!budgets.has(row.categoryId)) continue;
    spent += row.total;
  }

  return {
    budget,
    spent,
    ratio: spent / budget,
    over: spent > budget,
    remaining: budget - spent,
  };
}
