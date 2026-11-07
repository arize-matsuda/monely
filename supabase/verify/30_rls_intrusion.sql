-- AC-9: B（よその家）から A（わが家）のデータを狙う。
-- 20_functional.sql の実行後に流す。
\set BJWT '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}'

select id as tx_id from public.transactions where amount = 1280 \gset
select id as a_household from public.households where name = 'わが家' \gset

\echo '--- 1〜5. 読み取り（すべて 0 であること） ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'BJWT';
  select
    (select count(*) from public.transactions)                                      as "記録 全件(0)",
    (select count(*) from public.transactions where id = :'tx_id')                  as "A の記録を ID 指定(0)",
    (select count(*) from public.households  where id = :'a_household')             as "A の世帯(0)",
    (select count(*) from public.profiles    where display_name in ('たっつ','こども')) as "A のメンバー(0)",
    (select count(*) from public.categories  where household_id = :'a_household')   as "A のカテゴリ(0)";

  \echo '--- 6〜9. A のデータの書き換え・削除（すべて 0 行） ---'
  update public.transactions set amount = 1        where id = :'tx_id';
  update public.households   set name = 'のっとり' where id = :'a_household';
  update public.profiles     set display_name = 'のっとり' where display_name = 'たっつ';
  delete from public.transactions where id = :'tx_id';
commit;

\echo '--- 10. TRUNCATE（RLS の対象外。権限で拒否されること） ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'BJWT';
  do $$ begin
    truncate public.transactions;
    raise exception 'NG: TRUNCATE が通った。revoke all が抜けている';
  exception when insufficient_privilege then raise notice 'OK: TRUNCATE を拒否';
  end $$;
commit;

\echo '--- 11. A の世帯へ書き込む（RLS で拒否されること） ---'
\set ON_ERROR_STOP 0
begin;
  set local role authenticated;
  set local request.jwt.claims = :'BJWT';
  insert into public.transactions (household_id, occurred_on, kind, amount, created_by)
  values (:'a_household', '2026-11-07', 'expense', 99999, 'bbbbbbbb-0000-4000-8000-000000000002');
rollback;
\set ON_ERROR_STOP 1
\echo '    ↑ "new row violates row-level security policy" が出れば OK'

\echo '--- 12. 自分の世帯に A のカテゴリを紐付ける（RLS では防げない = アプリ側の所属確認が必須） ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'BJWT';
  do $$
  declare v_cat uuid;
  begin
    select id into v_cat from public.categories
      where household_id = (select id from public.households where name = 'わが家');
    insert into public.transactions (household_id, occurred_on, kind, amount, category_id, created_by)
    values (public.current_household_id(), '2026-11-07', 'expense', 500, v_cat, auth.uid());
    raise notice '想定どおり: RLS だけでは他世帯の category_id を防げない（API設計 §4.3 の所属確認が必須）';
  exception when others then
    raise notice '予想外に RLS が拒否した: %', sqlerrm;
  end $$;
rollback;

\echo '--- 13. 未ログイン（anon）からの読み取り ---'
begin;
  set local role anon;
  do $$ begin
    perform count(*) from public.transactions;
    raise exception 'NG: anon が読めた';
  exception when insufficient_privilege then raise notice 'OK: anon は権限なし';
  end $$;
commit;

\echo '--- A のデータが無傷か（postgres で確認） ---'
select count(*) as "記録の件数(2)", max(amount) as "最大金額(320000)" from public.transactions;
select name as "世帯名(わが家)" from public.households where id = :'a_household';
select display_name as "表示名(たっつ)" from public.profiles
  where id = 'aaaaaaaa-0000-4000-8000-000000000001';
