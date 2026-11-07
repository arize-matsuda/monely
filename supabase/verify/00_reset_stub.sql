-- 検証環境のリセット + Supabase 環境の模倣（本番には流さない）
drop schema if exists public cascade;
drop schema if exists auth cascade;
create schema public;
create schema auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;

-- Supabase の既定。public の新規テーブルに ALL が付与される。
-- これがあるからこそ 0001_init.sql の revoke に意味がある。
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;
