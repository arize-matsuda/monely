-- 機能テスト。NOTICE の OK / NG と、各列の期待値を見る。
\set A 'aaaaaaaa-0000-4000-8000-000000000001'
\set B 'bbbbbbbb-0000-4000-8000-000000000002'
\set C 'cccccccc-0000-4000-8000-000000000003'
\set AJWT '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}'
\set BJWT '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}'
\set CJWT '{"sub":"cccccccc-0000-4000-8000-000000000003","role":"authenticated"}'

\echo '--- 1. サインアップで profiles が自動生成される ---'
insert into auth.users (id, email) values
  (:'A', 'tattu@example.com'), (:'B', 'hanako@example.com'), (:'C', 'kodomo@example.com');
select display_name, household_id is null as "未所属(すべて t)" from public.profiles order by display_name;

\echo '--- 2. 招待コード: 500 件すべて 6 桁英数大文字 ---'
do $$
declare v text; i int; bad int := 0; uniq int;
begin
  create temp table codes(c text);
  for i in 1..500 loop
    v := public.generate_invite_code();
    if v !~ '^[A-Z0-9]{6}$' then bad := bad + 1; end if;
    insert into codes values (v);
  end loop;
  select count(distinct c) into uniq from codes;
  drop table codes;
  if bad > 0 then raise exception 'NG: 不正なコード % 件', bad; end if;
  raise notice 'OK: 形式 500/500、ユニーク % 件', uniq;
end $$;

\echo '--- 3. A が世帯を作る（初期カテゴリ expense 13 / income 5） ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'AJWT';
  do $$ begin perform public.create_household('わが家', 'たっつ'); end $$;
commit;
select name, invite_code, length(invite_code) as "桁数(6)" from public.households;
select kind, count(*) from public.categories group by kind order by kind;

\echo '--- 4. 二重作成を拒否 ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'AJWT';
  do $$ begin
    perform public.create_household('ふたつめ', null);
    raise exception 'NG: 二重作成が通った';
  exception when others then
    if sqlerrm like '%already belongs%' then raise notice 'OK: %', sqlerrm; else raise; end if;
  end $$;
commit;

\echo '--- 5. A が記録を 2 件入れ、自分には見える ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'AJWT';
  insert into public.transactions (household_id, occurred_on, kind, amount, category_id, paid_by, memo, created_by)
  select public.current_household_id(), '2026-11-07', 'expense', 1280,
         (select id from public.categories where name='食費' and kind='expense'),
         auth.uid(), 'スーパー', auth.uid();
  insert into public.transactions (household_id, occurred_on, kind, amount, created_by)
  select public.current_household_id(), '2026-11-06', 'income', 320000, auth.uid();
  select count(*) as "A に見える件数(2)" from public.transactions;
commit;

\echo '--- 6. created_by の偽装を拒否 ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'AJWT';
  do $$ begin
    insert into public.transactions (household_id, occurred_on, kind, amount, created_by)
    values (public.current_household_id(), '2026-11-07', 'expense', 100, 'bbbbbbbb-0000-4000-8000-000000000002');
    raise exception 'NG: created_by の偽装が通った';
  exception when others then
    if sqlerrm like '%row-level security%' then raise notice 'OK: RLS が拒否'; else raise; end if;
  end $$;
commit;

\echo '--- 7. 金額の check 制約（0 と 負数） ---'
do $$
declare v int;
begin
  foreach v in array array[0, -100] loop
    begin
      insert into public.transactions (household_id, occurred_on, kind, amount, created_by)
      values ((select id from public.households limit 1), '2026-11-07', 'expense', v,
              'aaaaaaaa-0000-4000-8000-000000000001');
      raise exception 'NG: amount=% が通った', v;
    exception when check_violation then raise notice 'OK: amount=% を拒否', v;
    end;
  end loop;
end $$;

\echo '--- 8. generate_invite_code は authenticated から直接呼べない ---'
begin;
  set local role authenticated;
  do $$ begin
    perform public.generate_invite_code();
    raise exception 'NG: 直接呼べてしまった';
  exception when insufficient_privilege then raise notice 'OK: 実行権限なし';
  end $$;
commit;

\echo '--- 9. B が別の世帯を作る ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'BJWT';
  do $$ begin perform public.create_household('よその家', 'はなこ'); end $$;
commit;
select count(*) as "世帯の数(2)" from public.households;

\echo '--- 10. 無効な招待コードを拒否 ---'
begin;
  set local role authenticated;
  set local request.jwt.claims = :'CJWT';
  do $$ begin
    perform public.join_household('ZZZZZZ', 'だれか');
    raise exception 'NG: 無効コードが通った';
  exception when others then
    if sqlerrm like '%invalid invite code%' then raise notice 'OK: %', sqlerrm; else raise; end if;
  end $$;
commit;

\echo '--- 11. C が招待コードで A の世帯に参加（小文字入力でも通る） ---'
-- コードは postgres で取る。C は未所属なので RLS で households が見えない（＝実運用では口頭で伝わる値）
select lower(invite_code) as code from public.households where name = 'わが家' \gset
begin;
  set local role authenticated;
  set local request.jwt.claims = :'CJWT';
  select public.join_household(:'code', 'こども') is not null as "参加成功(t)";
  select count(*) as "C に見える記録(2)" from public.transactions;
  select count(*) as "C に見えるメンバー(2)" from public.profiles;
  select count(*) as "C に見えるカテゴリ(18)" from public.categories;
commit;

\echo '--- 12. 所属の一覧 ---'
select p.display_name, coalesce(h.name, '(未所属)') as household
from public.profiles p left join public.households h on h.id = p.household_id
order by p.display_name;
