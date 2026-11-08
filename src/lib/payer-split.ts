import type { Kind } from "./types";

/**
 * 支払者別の集計と精算（FR-L12 / ADR-0011）。
 *
 * **`paidById` は v1 から記録していたが、一度も集計していなかった。**
 * 一覧に名前を出すだけで、「今月どちらがいくら払ったか」が分からない。
 *
 * **DB に問い合わせない。** ホームが取得済みの行から計算する
 * （ADR-0009 / ADR-0010 と同じ理由）。
 */

type Payable = {
  kind: Kind;
  amount: number;
  paidById: string | null;
};

export type PayerShare = {
  /** 支払者が未指定の行は null にまとめる */
  profileId: string | null;
  name: string;
  total: number;
  /** 支出合計に対する割合（0〜1）。支出が 0 なら 0 */
  ratio: number;
};

export type PayerSplit = {
  shares: PayerShare[];
  /** 支出の合計 */
  total: number;
  /**
   * 均等割りにした場合の精算（FR-L12）。
   *
   * **メンバーが 2 人で、支払者が全員分かっているときだけ出す。**
   * 3 人以上の精算は誰が誰にいくら渡すかの組み合わせが増え、
   * 「割り勘」以外の分担（収入比など）も考えたくなる。v1 の範囲を超える。
   */
  settlement: Settlement | null;
};

export type Settlement = {
  /** 多く払った人 */
  fromName: string;
  /** 少なく払った人。この人が fromName に渡す */
  toName: string;
  /** 渡す額。1 円未満は切り捨て（円で持つため） */
  amount: number;
};

/** 支払者が未指定の行の表示名 */
export const UNKNOWN_PAYER_LABEL = "支払者なし";

/**
 * 金額の多い順。同額なら名前の読み順（表示が毎回入れ替わらないように）。
 *
 * @param members 世帯のメンバー。**払っていない人も 0 円で並べる**
 *   （「誰が払っていないか」が分かるようにする）
 */
export function splitByPayer(
  rows: readonly Payable[],
  members: readonly { id: string; displayName: string }[],
): PayerSplit {
  const totals = new Map<string | null, number>();
  let total = 0;

  for (const row of rows) {
    if (row.kind !== "expense") continue;
    total += row.amount;
    totals.set(row.paidById, (totals.get(row.paidById) ?? 0) + row.amount);
  }

  const shares: PayerShare[] = members.map((member) => ({
    profileId: member.id,
    name: member.displayName,
    total: totals.get(member.id) ?? 0,
    ratio: total === 0 ? 0 : (totals.get(member.id) ?? 0) / total,
  }));

  // 支払者が未指定の行があれば最後にまとめて出す
  const unknown = totals.get(null) ?? 0;
  if (unknown > 0) {
    shares.push({
      profileId: null,
      name: UNKNOWN_PAYER_LABEL,
      total: unknown,
      ratio: total === 0 ? 0 : unknown / total,
    });
  }

  shares.sort(
    (x, y) => y.total - x.total || x.name.localeCompare(y.name, "ja"),
  );

  return { shares, total, settlement: settle(shares, unknown, members.length) };
}

/**
 * 2 人・支払者が全員分かっている場合だけ精算額を出す。
 *
 * 均等割りなので「多く払った額の差額の半分」を渡せば揃う。
 * 1 円未満は切り捨てる（金額は円の整数で持つ）。
 */
function settle(
  shares: readonly PayerShare[],
  unknown: number,
  memberCount: number,
): Settlement | null {
  if (memberCount !== 2) return null;
  // 支払者が未指定の行があると「誰が払ったか」が確定しない
  if (unknown > 0) return null;

  const [high, low] = shares.filter((share) => share.profileId !== null);
  if (high === undefined || low === undefined) return null;

  const amount = Math.floor((high.total - low.total) / 2);
  if (amount <= 0) return null;

  return { fromName: high.name, toName: low.name, amount };
}
