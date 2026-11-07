-- PostgREST（Supabase の REST API）から public スキーマを閉じる。
--
-- 背景:
--   Supabase は既定で
--     alter default privileges in schema public grant all on tables to anon, authenticated, service_role
--   を設定している。Prisma が postgres ロールでテーブルを作ると、この既定が効いて
--   anon / authenticated に ALL が付与される。
--
--   RLS を使う構成（ADR-0002）ではポリシーが行を絞っていたが、
--   ADR-0005 で RLS をやめたため、**Publishable key だけで全テーブルの
--   読み取り・挿入・削除ができる状態になっていた**（2026-11-07 に実測）。
--     GET    /rest/v1/transactions         -> 200
--     POST   /rest/v1/households           -> CHECK 制約まで到達（権限はある）
--     DELETE /rest/v1/transactions?id=eq.. -> 204
--   Publishable key はブラウザのバンドルに埋め込まれる = 公開値なので、実害がある。
--
-- 方針:
--   このアプリは supabase-js をデータアクセスに使わない（認証のみ）。
--   DB へは Prisma が postgres ロールで接続する。
--   よって anon / authenticated には public スキーマへのアクセスを一切与えない。
--
--   テーブル単位の revoke だけでは、**将来 Prisma が作るテーブル**に既定権限が
--   再び付与される。そのため
--     - スキーマへの usage ごと剥がす（これだけで全テーブルに届かなくなる）
--     - 既定権限そのものを打ち消す
--   の両方を行う。
--
-- 確認方法 -> docs/03-guidelines/testing-strategy.md
-- 判断の記録 -> docs/05-decisions/ADR-0005-authorization-in-app-layer.md

-- 既存のオブジェクトから剥がす
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- スキーマへの usage を剥がす。これが効けばテーブル単位の権限に関係なく届かない
revoke usage  on schema public from anon, authenticated;
revoke create on schema public from anon, authenticated;

-- 将来 postgres ロールが作るオブジェクトに権限が付かないようにする
-- （Supabase の既定設定を打ち消す）
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
