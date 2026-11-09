/**
 * 認証後の画面の読み込み中の表示。
 *
 * **これが無いと遷移中に何も起きない。** 認証後のページは
 * `instant = false`（サーバーで描画完了まで待つ）なので、タップしてから
 * 画面が入れ替わるまで古い画面のまま固まって見える
 * （2026-11-10 に「スムーズに遷移しない」と指摘を受けた）。
 *
 * Next.js はこのファイルをセグメントの Suspense の fallback として使い、
 * **クライアント側の遷移では即座に表示する。** サイドバーと下部タブは
 * レイアウト側なので保持され、入れ替わるのは中身だけになる。
 *
 * 枠だけを出す。**個人のデータは一切含めない**（ここは静的に配信される）。
 */
export default function Loading() {
  return (
    /* <output> は暗黙で role="status"（Biome の useSemanticElements に合わせた）。
       既定が inline なので block にする */
    <output
      className="mx-auto block w-full max-w-[480px] flex-1 px-4 pt-4 md:max-w-6xl md:px-8 md:pt-8"
      aria-busy="true"
    >
      {/* 読み上げには「読み込み中」だけを伝え、骨組みは読ませない */}
      <span className="sr-only">読み込み中</span>

      <div className="animate-pulse" aria-hidden>
        {/* 見出し（月の切り替えや画面名） */}
        <div className="flex items-center justify-between gap-2">
          <div className="size-11 rounded-xl bg-muted" />
          <div className="h-6 w-32 rounded-lg bg-muted" />
          <div className="size-11 rounded-xl bg-muted" />
        </div>

        {/* 合計のカード */}
        <div className="mt-4 h-32 rounded-xl bg-muted md:mt-6" />

        {/* 一覧 */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-[60px] rounded-xl bg-muted" />
          <div className="h-[60px] rounded-xl bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-[60px] rounded-xl bg-muted" />
        </div>
      </div>
    </output>
  );
}
