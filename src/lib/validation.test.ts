import { describe, expect, it } from "vitest";
import { toDateKey } from "./month";
import type { ActionResult } from "./types";
import {
  MAX_AMOUNT,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeAlnum,
  normalizeDigits,
  parseAmount,
  parseEmail,
  parseInviteCode,
  parseKind,
  parseOccurredOn,
  parseOptionalId,
  parseOptionalText,
  parsePassword,
  parsePasswordConfirmation,
  parseText,
} from "./validation";

/**
 * 入力検証のテスト。
 *
 * [テスト戦略 §4.4](../../docs/03-guidelines/testing-strategy.md) の
 * 「境界値は自動テストにも入れる」の実体。**全角数字と日付のずれは静かに壊れる。**
 */

/** 成功した結果から値を取り出す（失敗ならテストを落とす） */
function value<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(`成功のはずが失敗した: ${result.error.message}`);
  }
  return result.data;
}

/** 失敗した結果の項目名を取り出す（成功ならテストを落とす） */
function errorField<T>(result: ActionResult<T>): string | undefined {
  if (result.ok) throw new Error("失敗のはずが成功した");
  return result.error.field;
}

describe("normalizeDigits", () => {
  it("全角数字を半角に直す", () => {
    expect(normalizeDigits("１２８０")).toBe("1280");
    expect(normalizeDigits("２０２６-１１-０８")).toBe("2026-11-08");
  });

  it("半角と日本語はそのまま残す", () => {
    expect(normalizeDigits("1280")).toBe("1280");
    expect(normalizeDigits("スーパー")).toBe("スーパー");
  });

  it("全角の記号は直さない（数字だけが対象）", () => {
    // 全角ハイフンは半角にならないので、日付としては弾かれる
    expect(normalizeDigits("２０２６－１１－０８")).toBe("2026－11－08");
  });
});

describe("normalizeAlnum", () => {
  it("全角の数字と英字を半角に直す", () => {
    expect(normalizeAlnum("ＡＢ１２３４")).toBe("AB1234");
    expect(normalizeAlnum("ａｂ１２３４")).toBe("ab1234");
  });

  it("日本語には触らない", () => {
    expect(normalizeAlnum("スーパー")).toBe("スーパー");
  });
});

describe("parseAmount", () => {
  it("半角の整数を受け取る", () => {
    expect(value(parseAmount("1280"))).toBe(1280);
  });

  // **全角は弾かずに受け入れる。** スマホの日本語キーボードでは全角が混入する。
  // → docs/03-guidelines/security-guidelines.md §7.1（「弾くか正規化」の後者を選んだ）
  it("全角数字を受け入れる", () => {
    expect(value(parseAmount("１２８０"))).toBe(1280);
  });

  it("桁区切りのカンマを受け入れる", () => {
    expect(value(parseAmount("1,280"))).toBe(1280);
    expect(value(parseAmount("9,999,999"))).toBe(MAX_AMOUNT);
  });

  it("前後の空白を無視する", () => {
    expect(value(parseAmount(" 1280 "))).toBe(1280);
  });

  it("空文字と null を弾く", () => {
    expect(errorField(parseAmount(""))).toBe("amount");
    expect(errorField(parseAmount("   "))).toBe("amount");
    expect(errorField(parseAmount(null))).toBe("amount");
  });

  it("0 と負数を弾く", () => {
    expect(errorField(parseAmount("0"))).toBe("amount");
    expect(errorField(parseAmount("-100"))).toBe("amount");
  });

  it("小数を弾く", () => {
    expect(errorField(parseAmount("12.5"))).toBe("amount");
  });

  it("単位つきの文字列を弾く", () => {
    expect(errorField(parseAmount("1280円"))).toBe("amount");
    expect(errorField(parseAmount("¥1280"))).toBe("amount");
  });

  it("上限（9,999,999）とその 1 円上で結果が変わる", () => {
    expect(value(parseAmount(String(MAX_AMOUNT)))).toBe(MAX_AMOUNT);
    expect(errorField(parseAmount(String(MAX_AMOUNT + 1)))).toBe("amount");
  });

  it("桁あふれを弾く（安全な整数の範囲外）", () => {
    expect(errorField(parseAmount("99999999999999999999"))).toBe("amount");
  });

  it("指数表記を弾く", () => {
    expect(errorField(parseAmount("1e3"))).toBe("amount");
  });
});

describe("parseOccurredOn", () => {
  it("YYYY-MM-DD を UTC 0 時の Date にする", () => {
    const date = value(parseOccurredOn("2026-11-08"));
    expect(date.toISOString()).toBe("2026-11-08T00:00:00.000Z");
  });

  // ここがずれると一覧の日付見出しが 1 日ずれる（@db.Date の UTC 問題）
  it("入れた日付をそのまま読み出せる（往復でずれない）", () => {
    for (const key of [
      "2026-01-01",
      "2026-10-31",
      "2026-11-01",
      "2026-12-31",
    ]) {
      expect(toDateKey(value(parseOccurredOn(key)))).toBe(key);
    }
  });

  it("全角数字の日付を受け入れる", () => {
    const date = value(parseOccurredOn("２０２６-１１-０８"));
    expect(toDateKey(date)).toBe("2026-11-08");
  });

  it("空文字を弾く", () => {
    expect(errorField(parseOccurredOn(""))).toBe("occurredOn");
    expect(errorField(parseOccurredOn(null))).toBe("occurredOn");
  });

  it("形式が違うものを弾く", () => {
    expect(errorField(parseOccurredOn("2026/11/08"))).toBe("occurredOn");
    expect(errorField(parseOccurredOn("26-11-08"))).toBe("occurredOn");
    expect(errorField(parseOccurredOn("2026-11"))).toBe("occurredOn");
    expect(errorField(parseOccurredOn("きのう"))).toBe("occurredOn");
  });

  it("存在しない日付を弾く", () => {
    expect(errorField(parseOccurredOn("2026-02-30"))).toBe("occurredOn");
    expect(errorField(parseOccurredOn("2026-13-01"))).toBe("occurredOn");
    expect(errorField(parseOccurredOn("2026-00-10"))).toBe("occurredOn");
  });

  it("うるう日を正しく扱う", () => {
    expect(toDateKey(value(parseOccurredOn("2028-02-29")))).toBe("2028-02-29");
    expect(errorField(parseOccurredOn("2026-02-29"))).toBe("occurredOn");
  });
});

describe("parseKind", () => {
  it("許可リストの値だけを通す", () => {
    expect(value(parseKind("expense"))).toBe("expense");
    expect(value(parseKind("income"))).toBe("income");
  });

  it("それ以外を弾く", () => {
    expect(errorField(parseKind("EXPENSE"))).toBe("kind");
    expect(errorField(parseKind("transfer"))).toBe("kind");
    expect(errorField(parseKind(""))).toBe("kind");
    expect(errorField(parseKind(null))).toBe("kind");
  });
});

describe("parseInviteCode", () => {
  it("小文字を大文字に直して通す", () => {
    expect(value(parseInviteCode("a1b2c3"))).toBe("A1B2C3");
    expect(value(parseInviteCode("a1b2c3 "))).toBe("A1B2C3");
  });

  // 全角入力モードのまま打つと英字も全角になる。
  // 招待コードは英数字しか取り得ないので正規化して受け入れる
  it("全角の英数字を直して通す", () => {
    expect(value(parseInviteCode("ＡＢ１２３４"))).toBe("AB1234");
    expect(value(parseInviteCode("ａｂ１２３４"))).toBe("AB1234");
  });

  it("桁数が違うものを弾く", () => {
    expect(errorField(parseInviteCode("A1B2C"))).toBe("inviteCode");
    expect(errorField(parseInviteCode("A1B2C34"))).toBe("inviteCode");
    expect(errorField(parseInviteCode(""))).toBe("inviteCode");
  });

  it("英数字以外を弾く", () => {
    expect(errorField(parseInviteCode("A1B2C-"))).toBe("inviteCode");
    expect(errorField(parseInviteCode("あいうえおか"))).toBe("inviteCode");
  });
});

describe("parseEmail", () => {
  it("形のあるアドレスを通す", () => {
    expect(value(parseEmail(" user@example.com "))).toBe("user@example.com");
  });

  it("形が違うものを弾く", () => {
    for (const bad of [
      "user",
      "user@",
      "@example.com",
      "user@example",
      "a b@c.d",
    ]) {
      expect(errorField(parseEmail(bad))).toBe("email");
    }
  });

  it("空文字と長すぎるものを弾く", () => {
    expect(errorField(parseEmail(""))).toBe("email");
    expect(errorField(parseEmail(`${"a".repeat(250)}@example.com`))).toBe(
      "email",
    );
  });
});

describe("parsePassword", () => {
  it("下限と上限の境界", () => {
    expect(value(parsePassword("a".repeat(MIN_PASSWORD_LENGTH)))).toHaveLength(
      MIN_PASSWORD_LENGTH,
    );
    expect(errorField(parsePassword("a".repeat(MIN_PASSWORD_LENGTH - 1)))).toBe(
      "password",
    );
    expect(value(parsePassword("a".repeat(MAX_PASSWORD_LENGTH)))).toHaveLength(
      MAX_PASSWORD_LENGTH,
    );
    expect(errorField(parsePassword("a".repeat(MAX_PASSWORD_LENGTH + 1)))).toBe(
      "password",
    );
  });

  // パスワードは前後の空白も意味を持つので trim しない
  it("空白を削らない", () => {
    expect(value(parsePassword("  pass  "))).toBe("  pass  ");
  });

  it("項目名を差し替えられる", () => {
    expect(errorField(parsePassword("", "newPassword"))).toBe("newPassword");
  });
});

describe("parsePasswordConfirmation", () => {
  it("一致すれば通る", () => {
    expect(value(parsePasswordConfirmation("secret12", "secret12"))).toBe(
      "secret12",
    );
  });

  it("一致しなければ弾く", () => {
    expect(errorField(parsePasswordConfirmation("secret12", "secret13"))).toBe(
      "passwordConfirmation",
    );
    expect(errorField(parsePasswordConfirmation("secret12", null))).toBe(
      "passwordConfirmation",
    );
  });
});

describe("parseText", () => {
  const options = { field: "displayName", label: "名前", min: 1, max: 20 };

  it("前後の空白を削って通す", () => {
    expect(value(parseText("  たつ  ", options))).toBe("たつ");
  });

  it("空文字と長すぎるものを弾く", () => {
    expect(errorField(parseText("", options))).toBe("displayName");
    expect(errorField(parseText("   ", options))).toBe("displayName");
    expect(errorField(parseText("あ".repeat(21), options))).toBe("displayName");
  });

  it("上限ちょうどは通す", () => {
    expect(value(parseText("あ".repeat(20), options))).toHaveLength(20);
  });
});

describe("parseOptionalText", () => {
  const options = { field: "memo", label: "メモ", max: 200 };

  it("空文字は null にする", () => {
    expect(value(parseOptionalText("", options))).toBeNull();
    expect(value(parseOptionalText("   ", options))).toBeNull();
    expect(value(parseOptionalText(null, options))).toBeNull();
  });

  it("上限ちょうどは通し、超えたら弾く", () => {
    expect(value(parseOptionalText("あ".repeat(200), options))).toHaveLength(
      200,
    );
    expect(errorField(parseOptionalText("あ".repeat(201), options))).toBe(
      "memo",
    );
  });
});

describe("parseOptionalId", () => {
  it("空文字は null にする", () => {
    expect(value(parseOptionalId("", "categoryId"))).toBeNull();
    expect(value(parseOptionalId("   ", "categoryId"))).toBeNull();
  });

  it("長さだけを見る（所属の確認は DAL の仕事）", () => {
    const id = "c".repeat(64);
    expect(value(parseOptionalId(id, "categoryId"))).toBe(id);
    expect(errorField(parseOptionalId("c".repeat(65), "categoryId"))).toBe(
      "categoryId",
    );
  });
});
