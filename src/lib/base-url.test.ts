import { describe, expect, it } from "vitest";
import { LOCAL_BASE_URL, resolveBaseURL } from "./base-url";

describe("resolveBaseURL", () => {
  it("何も無ければローカル", () => {
    expect(resolveBaseURL({})).toBe(LOCAL_BASE_URL);
  });

  it("BETTER_AUTH_URL を優先する", () => {
    expect(
      resolveBaseURL({
        BETTER_AUTH_URL: "https://example.com",
        VERCEL_PROJECT_PRODUCTION_URL: "monely.vercel.app",
      }),
    ).toBe("https://example.com");
  });

  // Vercel に入れ忘れても動くようにする（本番 URL は Vercel が渡してくる）
  it("Vercel の本番ドメインから組み立てる", () => {
    expect(
      resolveBaseURL({ VERCEL_PROJECT_PRODUCTION_URL: "monely.vercel.app" }),
    ).toBe("https://monely.vercel.app");
  });

  it("末尾のスラッシュを落とす", () => {
    expect(resolveBaseURL({ BETTER_AUTH_URL: "https://example.com/" })).toBe(
      "https://example.com",
    );
    expect(resolveBaseURL({ BETTER_AUTH_URL: "https://example.com///" })).toBe(
      "https://example.com",
    );
  });

  it("前後の空白を落とす", () => {
    expect(resolveBaseURL({ BETTER_AUTH_URL: "  https://example.com  " })).toBe(
      "https://example.com",
    );
  });

  it("空文字は未設定として扱う", () => {
    expect(resolveBaseURL({ BETTER_AUTH_URL: "" })).toBe(LOCAL_BASE_URL);
  });

  // ★ 実際に本番で踏んだ値。どの変数が悪いのかを名指しする
  it("★ URL として読めない値は変数名つきで落とす", () => {
    expect(() => resolveBaseURL({ BETTER_AUTH_URL: "e" })).toThrow(
      /BETTER_AUTH_URL/,
    );
    expect(() => resolveBaseURL({ BETTER_AUTH_URL: "e" })).toThrow(/"e"/);
  });

  it("プロトコルが無い値を弾く", () => {
    expect(() =>
      resolveBaseURL({ BETTER_AUTH_URL: "monely.vercel.app" }),
    ).toThrow(/BETTER_AUTH_URL/);
  });

  it("http と https 以外を弾く", () => {
    expect(() =>
      resolveBaseURL({ BETTER_AUTH_URL: "ftp://example.com" }),
    ).toThrow(/http か https/);
    expect(() =>
      resolveBaseURL({ BETTER_AUTH_URL: "javascript:alert(1)" }),
    ).toThrow();
  });

  it("http のローカルも通す（開発用）", () => {
    expect(resolveBaseURL({ BETTER_AUTH_URL: "http://localhost:3100" })).toBe(
      "http://localhost:3100",
    );
  });

  it("Vercel の値が壊れていれば変数名つきで落とす", () => {
    expect(() =>
      resolveBaseURL({ VERCEL_PROJECT_PRODUCTION_URL: "ス ペース" }),
    ).toThrow(/VERCEL_PROJECT_PRODUCTION_URL/);
  });
});
