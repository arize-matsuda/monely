import type { Kind } from "@/lib/types";

/**
 * 世帯を作ったときに入れる初期カテゴリ（FR-C4）。
 * 「その他」は sortOrder 999 で末尾に固定する。
 */
export const INITIAL_CATEGORIES: {
  kind: Kind;
  name: string;
  sortOrder: number;
}[] = [
  { kind: "expense", name: "食費", sortOrder: 10 },
  { kind: "expense", name: "日用品", sortOrder: 20 },
  { kind: "expense", name: "住居", sortOrder: 30 },
  { kind: "expense", name: "水道・光熱", sortOrder: 40 },
  { kind: "expense", name: "通信", sortOrder: 50 },
  { kind: "expense", name: "交通", sortOrder: 60 },
  { kind: "expense", name: "医療・健康", sortOrder: 70 },
  { kind: "expense", name: "教育", sortOrder: 80 },
  { kind: "expense", name: "趣味・娯楽", sortOrder: 90 },
  { kind: "expense", name: "衣服・美容", sortOrder: 100 },
  { kind: "expense", name: "交際費", sortOrder: 110 },
  { kind: "expense", name: "特別費", sortOrder: 120 },
  { kind: "expense", name: "その他", sortOrder: 999 },
  { kind: "income", name: "給与", sortOrder: 10 },
  { kind: "income", name: "賞与", sortOrder: 20 },
  { kind: "income", name: "副収入", sortOrder: 30 },
  { kind: "income", name: "臨時収入", sortOrder: 40 },
  { kind: "income", name: "その他", sortOrder: 999 },
];
