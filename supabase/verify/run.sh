#!/usr/bin/env bash
# マイグレーションをローカルの Postgres に対して検証する。
#   ./supabase/verify/run.sh
#
# Supabase 環境（auth スキーマ、anon / authenticated ロール、既定権限）を模倣した
# 捨てのコンテナを立て、0001_init.sql を 2 回流し、構造・権限・機能・RLS を確認する。
# 本番の Supabase プロジェクトには一切触れない。
#
# 前提: Docker が起動していること（Supabase CLI は不要）。
set -euo pipefail

CONTAINER=monely-pgcheck
IMAGE=postgres:17
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION="$DIR/../migrations/0001_init.sql"

psql_run() { docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 "$@"; }
step() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

if ! docker info >/dev/null 2>&1; then
  echo "Docker が起動していません。Docker Desktop を起動してから再実行してください。" >&2
  exit 1
fi

step "コンテナを起動"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null

step "Supabase 環境の模倣"
psql_run -q < "$DIR/00_reset_stub.sql" 2>&1 | grep -v NOTICE || true

step "マイグレーション 1 回目"
psql_run -q < "$MIGRATION" 2>&1 | grep -v NOTICE || true

step "マイグレーション 2 回目（冪等性）"
psql_run -q < "$MIGRATION" 2>&1 | grep -v NOTICE || true

step "構造と権限"
psql_run < "$DIR/10_structure.sql"

step "機能テスト"
psql_run < "$DIR/20_functional.sql" 2>&1 \
  | grep -v '^SET$\|^BEGIN$\|^COMMIT$\|^DO$\|^INSERT 0\|^$' || true

step "AC-9 RLS 侵入確認"
psql_run < "$DIR/30_rls_intrusion.sql" 2>&1 \
  | grep -v '^SET$\|^BEGIN$\|^COMMIT$\|^DO$\|^$' || true

step "片付け"
docker rm -f "$CONTAINER" >/dev/null
echo "コンテナを削除しました。"
cat <<'JUDGE'

判定のしかた
  - NOTICE に "NG:" が 1 つも無いこと
  - 各列の見出しに書いた期待値（例 "A に見える件数(2)"）と数値が一致すること
  - 「11. A の世帯へ書き込む」で出る
      ERROR: new row violates row-level security policy for table "transactions"
    は**期待どおり**。これ以外の ERROR は失敗。
JUDGE
