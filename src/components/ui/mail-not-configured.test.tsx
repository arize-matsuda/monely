import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MailNotConfigured } from "./mail-not-configured";

/**
 * **本番で踏んだ不具合の再発防止**（2026-11-09）。
 *
 * `RESEND_API_KEY` が未設定のまま本番を動かすと、画面には
 * 「メールを送りました」と出るのに 1 通も届かない。
 * リンクはサーバーのログに出るだけで、利用者からは見えない。
 */
describe("MailNotConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("★ 未設定なら警告を出す", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAIL_FROM", "");
    const html = renderToStaticMarkup(<MailNotConfigured />);
    expect(html).toContain("メールを送信できない設定");
    expect(html).toContain('role="alert"');
  });

  it("両方そろっていれば何も描かない", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "Monely <no-reply@example.com>");
    expect(renderToStaticMarkup(<MailNotConfigured />)).toBe("");
  });

  // 片方だけでは送れない（sendMail が両方を要求する）
  it("★ 片方だけなら警告を出す", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "");
    expect(renderToStaticMarkup(<MailNotConfigured />)).toContain(
      "メールを送信できない設定",
    );

    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAIL_FROM", "Monely <no-reply@example.com>");
    expect(renderToStaticMarkup(<MailNotConfigured />)).toContain(
      "メールを送信できない設定",
    );
  });
});
