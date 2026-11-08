import { describe, expect, it } from "vitest";
import { duplicateHref, isCurrentMonth, parsePrefill } from "./prefill";

const BASE = {
  categoryIds: ["c1", "c2"],
  memberIds: ["p1", "p2"],
  defaultPaidById: "p1",
};

function prefill(params: Record<string, string | string[] | undefined>) {
  return parsePrefill({ ...BASE, params });
}

describe("parsePrefill", () => {
  it("何も無ければ既定値を返す", () => {
    expect(prefill({})).toEqual({
      kind: "expense",
      amount: "",
      categoryId: "",
      paidById: "p1",
      memo: "",
    });
  });

  it("すべて指定できる", () => {
    expect(
      prefill({
        kind: "income",
        amount: "1280",
        category: "c2",
        paidBy: "p2",
        memo: "スーパー",
      }),
    ).toEqual({
      kind: "income",
      amount: "1280",
      categoryId: "c2",
      paidById: "p2",
      memo: "スーパー",
    });
  });

  // ★ URL は書き換えられる。選択肢に無い ID を「選択済み」に見せない
  it("★ 選択肢に無いカテゴリは捨てる", () => {
    expect(prefill({ category: "他世帯のID" }).categoryId).toBe("");
  });

  it("★ 選択肢に無いメンバーは既定（自分）に戻す", () => {
    expect(prefill({ paidBy: "他世帯のID" }).paidById).toBe("p1");
  });

  it("kind は許可リストで照合する", () => {
    expect(prefill({ kind: "income" }).kind).toBe("income");
    expect(prefill({ kind: "expense" }).kind).toBe("expense");
    // 知らない値は支出として扱う（既定）
    expect(prefill({ kind: "transfer" }).kind).toBe("expense");
    expect(prefill({ kind: "INCOME" }).kind).toBe("expense");
  });

  describe("金額", () => {
    it("全角とカンマを受け入れる", () => {
      expect(prefill({ amount: "１２８０" }).amount).toBe("1280");
      expect(prefill({ amount: "1,280" }).amount).toBe("1280");
    });

    it("数字でないものは空にする", () => {
      for (const bad of ["abc", "12.5", "-100", "0", "", "1e3", "1280円"]) {
        expect(prefill({ amount: bad }).amount).toBe("");
      }
    });

    it("上限を超えたら空にする", () => {
      expect(prefill({ amount: "9999999" }).amount).toBe("9999999");
      expect(prefill({ amount: "10000000" }).amount).toBe("");
      expect(prefill({ amount: "99999999999999999999" }).amount).toBe("");
    });
  });

  it("メモは 200 文字で切る（弾かない）", () => {
    expect(prefill({ memo: "あ".repeat(250) }).memo).toHaveLength(200);
  });

  it("配列で渡されても先頭だけ見る", () => {
    expect(prefill({ amount: ["1280", "9999"] }).amount).toBe("1280");
    expect(prefill({ category: ["c1", "c2"] }).categoryId).toBe("c1");
  });
});

describe("duplicateHref", () => {
  it("種別・金額・カテゴリ・支払者・メモを引き継ぐ", () => {
    const href = duplicateHref({
      kind: "expense",
      amount: 85000,
      categoryId: "c1",
      paidById: "p1",
      memo: "家賃",
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("kind")).toBe("expense");
    expect(params.get("amount")).toBe("85000");
    expect(params.get("category")).toBe("c1");
    expect(params.get("paidBy")).toBe("p1");
    expect(params.get("memo")).toBe("家賃");
  });

  // 複製は「毎月同じものを今月も入れる」用途なので、日付は常に今日が正しい
  it("日付は引き継がない", () => {
    const href = duplicateHref({
      kind: "expense",
      amount: 100,
      categoryId: null,
      paidById: null,
      memo: null,
    });
    expect(href).not.toContain("occurredOn");
    expect(href).not.toContain("date");
  });

  it("null の項目はパラメータに入れない", () => {
    const href = duplicateHref({
      kind: "income",
      amount: 100,
      categoryId: null,
      paidById: null,
      memo: null,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.has("category")).toBe(false);
    expect(params.has("paidBy")).toBe(false);
    expect(params.has("memo")).toBe(false);
  });

  it("メモに記号が入ってもエスケープされる", () => {
    const href = duplicateHref({
      kind: "expense",
      amount: 100,
      categoryId: null,
      paidById: null,
      memo: "A&B=C みかん",
    });
    expect(new URLSearchParams(href.split("?")[1]).get("memo")).toBe(
      "A&B=C みかん",
    );
  });

  it("往復できる（duplicateHref → parsePrefill）", () => {
    const href = duplicateHref({
      kind: "expense",
      amount: 85000,
      categoryId: "c1",
      paidById: "p2",
      memo: "家賃",
    });
    const params = Object.fromEntries(
      new URLSearchParams(href.split("?")[1]).entries(),
    );
    expect(parsePrefill({ ...BASE, params })).toEqual({
      kind: "expense",
      amount: "85000",
      categoryId: "c1",
      paidById: "p2",
      memo: "家賃",
    });
  });
});

describe("isCurrentMonth", () => {
  it("今月なら true", () => {
    expect(isCurrentMonth("2026-11", "2026-11")).toBe(true);
  });

  it("違う月なら false", () => {
    expect(isCurrentMonth("2026-10", "2026-11")).toBe(false);
    expect(isCurrentMonth("2026-12", "2026-11")).toBe(false);
  });

  it("月として不正なら false", () => {
    expect(isCurrentMonth("abc", "2026-11")).toBe(false);
  });
});
