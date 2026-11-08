import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

/**
 * Button のマークアップのテスト。
 *
 * **ブラウザを使わずに `react-dom/server` で描画する。** 新しい依存は要らない。
 * 狙いは「描画が落ちないこと」で、見た目の検証ではない。
 *
 * これを書いた理由: `pending` を足したときに `asChild` を壊した。
 * Slot は子が React 要素 1 つであることを要求するが、`null` を混ぜて
 * 子が 2 つになり、**ビルドも型も通るのに画面が落ちた**
 * （Slot failed to slot onto its children）。
 */
describe("Button", () => {
  it("既定では button を描く", () => {
    const html = renderToStaticMarkup(<Button>保存する</Button>);
    expect(html).toContain("<button");
    expect(html).toContain("保存する");
    expect(html).toContain('data-slot="button"');
  });

  it("44px 以上の高さを持つ（NFR-U7）", () => {
    expect(renderToStaticMarkup(<Button>押す</Button>)).toContain("h-11");
    expect(renderToStaticMarkup(<Button size="lg">押す</Button>)).toContain(
      "h-12",
    );
    expect(renderToStaticMarkup(<Button size="icon">押す</Button>)).toContain(
      "size-11",
    );
  });

  describe("pending", () => {
    it("スピナーを出して押せなくする", () => {
      const html = renderToStaticMarkup(<Button pending>保存中…</Button>);
      expect(html).toContain("animate-spin");
      expect(html).toContain("disabled");
      expect(html).toContain("保存中…");
    });

    it("アイコンだけのボタンは中身をスピナーに置き換える", () => {
      const html = renderToStaticMarkup(
        <Button pending size="icon" aria-label="保存">
          <svg role="img" aria-label="チェック" />
        </Button>,
      );
      expect(html).toContain("animate-spin");
      expect(html).not.toContain("チェック");
    });

    it("pending でなければスピナーを出さない", () => {
      expect(renderToStaticMarkup(<Button>保存する</Button>)).not.toContain(
        "animate-spin",
      );
    });
  });

  describe("asChild", () => {
    /*
     * ★ ここが壊れていた。
     *
     * children を Fragment で包むと、Slot はその Fragment を単一の子と見て
     * props を渡そうとする。**Fragment は props を黙って捨てる。**
     * サーバー描画では例外にならず「無装飾のリンク」になり、
     * ブラウザでは「Slot failed to slot onto its children」になる。
     *
     * したがって href や文字だけを見ていても検出できない。
     * **className と data-slot が子に届いているかを見る。**
     */
    it("★ 子の要素に差し込める（props も届く）", () => {
      const html = renderToStaticMarkup(
        <Button asChild>
          <a href="/new">記録する</a>
        </Button>,
      );
      expect(html).toContain("<a");
      expect(html).toContain('href="/new"');
      expect(html).toContain("記録する");
      expect(html).toContain('data-slot="button"');
      expect(html).toContain("h-11");
      // button には置き換わらない
      expect(html).not.toContain("<button");
    });

    it("★ 子が入れ子になっていても落ちない", () => {
      const html = renderToStaticMarkup(
        <Button asChild size="icon">
          <a href="/?m=2026-10" aria-label="前の月へ">
            <svg role="img" aria-label="前へ" />
          </a>
        </Button>,
      );
      expect(html).toContain('aria-label="前の月へ"');
      expect(html).toContain("size-11");
    });

    it("★ pending を渡しても落ちない（スピナーは足さない）", () => {
      const html = renderToStaticMarkup(
        <Button asChild pending>
          <a href="/new">記録する</a>
        </Button>,
      );
      expect(html).toContain("記録する");
      expect(html).toContain('data-slot="button"');
      expect(html).not.toContain("animate-spin");
    });
  });
});
