\echo '--- RLS 有効化（4 テーブルすべて t であること） ---'
select relname, relrowsecurity as rls
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('households','profiles','categories','transactions')
order by relname;

\echo '--- ポリシー（13 本） ---'
select tablename, cmd, policyname, roles::text
from pg_policies where schemaname = 'public'
order by tablename, cmd, policyname;

\echo '--- 関数 ---'
select p.proname,
       case p.prosecdef when true then 'definer' else 'invoker' end as sec,
       coalesce(array_to_string(p.proconfig, ','), '(なし)') as config
from pg_proc p
where p.pronamespace = 'public'::regnamespace
order by p.proname;

\echo '--- anon の権限（0 行であること） ---'
select table_name, privilege_type
from information_schema.table_privileges
where grantee = 'anon' and table_schema = 'public'
order by table_name, privilege_type;

\echo '--- authenticated の権限 ---'
select table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
from information_schema.table_privileges
where grantee = 'authenticated' and table_schema = 'public'
group by table_name order by table_name;

\echo '--- インデックス ---'
select tablename, indexname from pg_indexes
where schemaname = 'public' order by tablename, indexname;
