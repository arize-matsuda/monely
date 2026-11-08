#!/usr/bin/env bash
# テスト用のローカル Postgres を管理する。
#
#   ./scripts/test-db.sh up     起動してマイグレーションを適用する
#   ./scripts/test-db.sh down   停止して削除する
#   ./scripts/test-db.sh reset   作り直す
#
# **本番の Supabase には一切触れない。** 接続先は .env.test（localhost のみ）。
# 前提: Docker が起動していること。
set -euo pipefail

CONTAINER=monely-test-db
IMAGE=postgres:17
PORT=55432
DB=monely_test
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker が起動していません。Docker Desktop を起動してから再実行してください。" >&2
    exit 1
  fi
}

up() {
  require_docker
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "すでに起動しています。"
  else
    step "コンテナを起動"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --name "$CONTAINER" \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB="$DB" \
      -p "$PORT:5432" \
      "$IMAGE" >/dev/null
    for _ in $(seq 1 60); do
      docker exec "$CONTAINER" pg_isready -U postgres -d "$DB" >/dev/null 2>&1 && break
      sleep 1
    done
    docker exec "$CONTAINER" pg_isready -U postgres -d "$DB" >/dev/null
  fi

  step "マイグレーションを適用"
  # 0002 は Supabase 固有のロール（anon / authenticated）に触るので、
  # ローカルにも同名のロールを作っておく
  docker exec "$CONTAINER" psql -U postgres -d "$DB" -q -c \
    "do \$\$ begin
       if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
       if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
     end \$\$;"

  ( cd "$DIR" && pnpm exec dotenv -e .env.test -- prisma migrate deploy 2>/dev/null \
    || DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:$PORT/$DB" \
       DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:$PORT/$DB" \
       pnpm exec prisma migrate deploy )

  step "完了"
  echo "接続先: postgresql://postgres:postgres@127.0.0.1:$PORT/$DB"
  echo "テストの実行: pnpm test"
}

down() {
  require_docker
  step "コンテナを削除"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  echo "削除しました。"
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  reset) down; up ;;
  *) echo "使い方: $0 [up|down|reset]" >&2; exit 1 ;;
esac
