-- =============================================================================
-- Monely 初期スキーマ
--
-- 設計意図は docs/02-design/database-design.md を参照。
-- 適用方法: このファイルの中身をまるごと Supabase の SQL Editor に貼って実行する。
--
-- このファイルは冪等。何度貼り直しても壊れない。
-- 列の追加・変更は 0002_*.sql 以降を新しく作る。このファイルは編集しない。
-- =============================================================================

-- pgcrypto（招待コードの乱数生成に使う gen_random_bytes）。
-- Supabase では既定で extensions スキーマに入っているので、通常は何も起きない。
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. テーブル
-- -----------------------------------------------------------------------------

-- 家計簿を共有する単位
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- auth.users と 1:1。所属世帯はここに持つ（1 ユーザー = 1 世帯。ADR-0003）
-- household_id が null = まだ世帯に未所属（セットアップ前）。これは正式な状態。
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  household_id uuid references public.households (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_household_id_idx
  on public.profiles (household_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  name text not null,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  -- 同じ世帯に同名カテゴリを作らせない（BR-8）
  constraint categories_household_kind_name_key unique (household_id, kind, name)
);

create index if not exists categories_household_kind_idx
  on public.categories (household_id, kind, sort_order);

-- 収支 1 件。
-- amount は「円」の正の整数。符号は持たず、向きは kind で表す（BR-2）。
--   → 集計で kind の指定を忘れたときに、静かに間違った値が出るのを避ける。
-- occurred_on は date 型。時刻を持たないことでタイムゾーンによる日のずれを防ぐ（BR-10）。
-- household_id は非正規化だが、全クエリで JOIN を省けるので意図的に持つ（RLS の判定にも使う）。
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('expense', 'income')),
  amount integer not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  paid_by uuid references public.profiles (id) on delete set null,
  memo text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 月次一覧のクエリがそのまま乗る（NFR-P4）
create index if not exists transactions_household_occurred_idx
  on public.transactions (household_id, occurred_on desc, created_at desc);

-- -----------------------------------------------------------------------------
-- 2. ヘルパー関数とトリガー
-- -----------------------------------------------------------------------------

-- 現在のユーザーの世帯 ID を返す。RLS のポリシーから呼ぶ。
--
-- security definer にする理由:
--   profiles の SELECT ポリシーに「同じ世帯のメンバーは読める」と書くと、
--   条件の中で profiles を参照することになり、ポリシーがポリシーを呼んで無限再帰する。
--   security definer 関数の中からの参照には RLS が適用されないため、これを断ち切れる。
--
-- 引数を取らない理由:
--   世帯 ID を引数で受け取る形にすると、呼び出し側が他人の世帯 ID を渡せてしまう。
--   見るのは auth.uid() だけ。
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_household_id() from public;
grant execute on function public.current_household_id() to authenticated;

-- サインアップ時にプロフィールを自動作成する。
-- display_name の初期値はメールアドレスの @ より前。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'メンバー'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- 招待コードを生成する。6 桁の英数字（大文字）= 36^6 ≈ 22 億通り（ADR-0002）。
--
-- random() ではなく gen_random_bytes を使う。招待コードは世帯の全記録への
-- 読み書き権限と同等なので、予測可能な擬似乱数を使わない。
-- 剰余バイアスを避けるため、252（= 7 * 36）以上のバイトは捨てる。
--
-- search_path に extensions を含めるのは gen_random_bytes を解決するため。
-- 固定している点は変わらないので、search_path 差し替えの対策は維持される。
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  c_alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code text := '';
  v_bytes bytea;
  v_byte integer;
  i integer;
begin
  while length(v_code) < 6 loop
    v_bytes := gen_random_bytes(16);
    for i in 0..15 loop
      exit when length(v_code) >= 6;
      v_byte := get_byte(v_bytes, i);
      continue when v_byte >= 252;
      v_code := v_code || substr(c_alphabet, (v_byte % 36) + 1, 1);
    end loop;
  end loop;
  return v_code;
end;
$$;

revoke all on function public.generate_invite_code() from public;

-- -----------------------------------------------------------------------------
-- 3. RPC（RLS では表現できない複合操作）
-- -----------------------------------------------------------------------------

-- 世帯を作り、初期カテゴリを入れ、自分を所属させる。
-- この 3 つを 1 回の呼び出しで完結させる（途中で失敗して中途半端な状態が残るのを防ぐ）。
create or replace function public.create_household(
  p_name text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
  v_code text;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  -- 所属の上書きを事故で起こさない（ADR-0003）
  if public.current_household_id() is not null then
    raise exception 'already belongs to a household';
  end if;

  loop
    v_code := public.generate_invite_code();
    exit when not exists (
      select 1 from public.households where invite_code = v_code
    );
  end loop;

  insert into public.households (name, invite_code)
  values (coalesce(nullif(btrim(p_name), ''), 'わが家'), v_code)
  returning id into v_household_id;

  -- 初期カテゴリ（FR-C4）。「その他」は sort_order 999 で末尾に固定。
  insert into public.categories (household_id, kind, name, sort_order)
  select v_household_id, 'expense', seed.name, seed.ord
  from (values
    ('食費', 10), ('日用品', 20), ('住居', 30), ('水道・光熱', 40),
    ('通信', 50), ('交通', 60), ('医療・健康', 70), ('教育', 80),
    ('趣味・娯楽', 90), ('衣服・美容', 100), ('交際費', 110),
    ('特別費', 120), ('その他', 999)
  ) as seed(name, ord);

  insert into public.categories (household_id, kind, name, sort_order)
  select v_household_id, 'income', seed.name, seed.ord
  from (values
    ('給与', 10), ('賞与', 20), ('副収入', 30), ('臨時収入', 40), ('その他', 999)
  ) as seed(name, ord);

  update public.profiles
  set household_id = v_household_id,
      display_name = coalesce(nullif(btrim(p_display_name), ''), display_name)
  where id = v_uid;

  return v_household_id;
end;
$$;

revoke all on function public.create_household(text, text) from public;
grant execute on function public.create_household(text, text) to authenticated;

-- 招待コードで既存の世帯に参加する
create or replace function public.join_household(
  p_invite_code text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select id into v_household_id
  from public.households
  where invite_code = upper(btrim(p_invite_code));

  if v_household_id is null then
    raise exception 'invalid invite code';
  end if;

  update public.profiles
  set household_id = v_household_id,
      display_name = coalesce(nullif(btrim(p_display_name), ''), display_name)
  where id = v_uid;

  return v_household_id;
end;
$$;

revoke all on function public.join_household(text, text) from public;
grant execute on function public.join_household(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. 権限
--
-- RLS のポリシーだけでは足りない。ロールにテーブル権限が無ければそもそも触れないし、
-- 逆に余分な権限が付いていると RLS をすり抜ける操作が残る。
--
-- 重要: Supabase は既定で
--   alter default privileges in schema public grant all on tables to anon, authenticated, service_role
-- を設定しているため、public に作ったテーブルには作成時点で ALL が付与されている。
-- ALL には TRUNCATE / TRIGGER / REFERENCES が含まれ、**TRUNCATE は RLS の対象外**。
-- つまり grant を足すだけでは足りず、ログイン済みの誰でも
--   truncate public.transactions
-- で全世帯のデータを消せてしまう（ローカルの Postgres 17 で実際に再現した）。
--
-- そのため「まず全部剥がしてから、必要な操作だけ付け直す」。
-- 付与する操作は docs/02-design/database-design.md §5.1 のポリシー表と一致させ、
-- 「権限 × ポリシー」の二重で絞る。
-- -----------------------------------------------------------------------------

revoke all on public.households from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.transactions from anon, authenticated;

-- households: 読みと世帯名の変更のみ。作成・参加は RPC 経由、削除は提供しない
grant select, update on public.households to authenticated;

-- profiles: 削除は提供しない
grant select, insert, update on public.profiles to authenticated;

grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;

-- anon（未ログイン）には何も付与しない。上の revoke で剥がしたままにする。

-- -----------------------------------------------------------------------------
-- 5. RLS
--
-- 認可の本体（ADR-0002）。アプリのクエリ条件はセキュリティではない。
-- 提供しない操作はポリシーを作らない = 全拒否（安全側の失敗）。
-- -----------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- households ------------------------------------------------------------------
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated
  using (id = public.current_household_id());

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

-- profiles --------------------------------------------------------------------
-- 自分と同居メンバーを読める。更新できるのは自分の行だけ（BR-4）。
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      household_id is not null
      and household_id = public.current_household_id()
    )
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- categories ------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated
  using (household_id = public.current_household_id());

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated
  with check (household_id = public.current_household_id());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete to authenticated
  using (household_id = public.current_household_id());

-- transactions ----------------------------------------------------------------
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select to authenticated
  using (household_id = public.current_household_id());

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (
    household_id = public.current_household_id()
    -- 入力者を偽れないようにする（BR-6）
    and created_by = auth.uid()
  );

-- 同じ世帯のメンバーは、誰が作った記録でも編集・削除できる（BR-3 / FR-T7）
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
  for update to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
  for delete to authenticated
  using (household_id = public.current_household_id());
