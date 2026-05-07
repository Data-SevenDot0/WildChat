#!/usr/bin/env bash
set -euo pipefail
# Load WildChat seed data into a Postgres database using psql/\copy (client-side)

# Usage: ./scripts/load_postgres_seed.sh [database]
# Environment variables: PGHOST, PGPORT, PGUSER, PGPASSWORD (optional)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEED_DIR="$REPO_ROOT/seed_data_pg_test/postgres"
DB="${1:-wildchat}"

if [ ! -d "$SEED_DIR" ]; then
  echo "Seed directory not found: $SEED_DIR" >&2
  exit 1
fi

PSQL_CMD=(psql -v ON_ERROR_STOP=1 -q -d "$DB")

echo "[1/6] Applying schema..."
"${PSQL_CMD[@]}" -f "$SEED_DIR/postgres_seed.sql"
echo "✓ Schema applied"

echo "[2/5] Loading CSV data with \"\copy\" (client-side)"

"${PSQL_CMD[@]}" -c "\copy wildchat.country_daily_metrics(event_date,country_clean,state,language,model,conversation_count,turn_count,avg_turn_depth,gpt35_count,gpt4_count,redacted_count,toxic_count,adoption_rate,source_run_id,created_at,updated_at) FROM '$SEED_DIR/country_daily_metrics.csv' CSV HEADER"

echo "✓ Loaded country_daily_metrics"

"${PSQL_CMD[@]}" -c "\copy wildchat.conversation_annotation(annotation_id,conversation_id,turn_id,annotation_type,annotation_label,annotation_value,confidence,notes,taxonomy_version,created_at,created_by) FROM '$SEED_DIR/conversation_annotations.csv' CSV HEADER"

echo "✓ Loaded conversation_annotation"

# topic_clusters.csv may be empty; still attempt copy (no-op if empty)
"${PSQL_CMD[@]}" -c "\copy wildchat.topic_cluster(cluster_id,cluster_label,cluster_description,keywords,language,country_clean,model_version,created_at,updated_at) FROM '$SEED_DIR/topic_clusters.csv' CSV HEADER"

echo "✓ Loaded topic_cluster"

# Load new part-1 and part-2 tables
echo "[3/5] Loading part_1..."
"${PSQL_CMD[@]}" -c "\copy wildchat.part_1(conversation_id,model,timestamp,turn,language,toxicity_flag,redacted,state,country,hashed_ip,conversation_text,first_role) FROM '$SEED_DIR/part_1.csv' CSV HEADER"

echo "✓ Loaded part_1"

echo "[4/5] Loading part_2..."
"${PSQL_CMD[@]}" -c "\copy wildchat.part_2(conversation_id,model,timestamp,turn,language,toxicity_flag,redacted,state,country,hashed_ip,conversation_text,first_role) FROM '$SEED_DIR/part_2.csv' CSV HEADER"

echo "✓ Loaded part_2"

echo "[5/5] Verifying data loads..."
"${PSQL_CMD[@]}" -c "SELECT 'country_daily_metrics' as table_name, COUNT(*) as row_count FROM wildchat.country_daily_metrics UNION SELECT 'conversation_annotation', COUNT(*) FROM wildchat.conversation_annotation UNION SELECT 'topic_cluster', COUNT(*) FROM wildchat.topic_cluster UNION SELECT 'part_1', COUNT(*) FROM wildchat.part_1 UNION SELECT 'part_2', COUNT(*) FROM wildchat.part_2;"

echo "Done. Loaded seed into database '$DB'"

echo "Tip: set PGHOST, PGPORT, PGUSER and PGPASSWORD (or .pgpass) for remote databases."

exit 0
