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

echo "[1/3] Applying schema..."
"${PSQL_CMD[@]}" -f "$SEED_DIR/postgres_seed.sql"
echo "✓ Schema applied"

echo "[2/3] Loading CSV data with \"\copy\" (client-side)"

"${PSQL_CMD[@]}" -c "\copy wildchat.cleaned_wildchat(event_timestamp,event_date,country_clean,state,hash_map_id,moderation_flag,turns,conversation_type,toxicity_factor,model,language,redacted,hashed_ip,conversation_text,has_missing_values,valid_timestamp,valid_country,long_conversation,short_conversation,excessive_turns,moderation_present) FROM '$SEED_DIR/cleaned_wildchat.csv' CSV HEADER"

"${PSQL_CMD[@]}" -c "\copy wildchat.country_daily_metrics(event_date,country_clean,state,language,model,conversation_count,turn_count,avg_turn_depth,gpt35_count,gpt4_count,redacted_count,toxic_count,adoption_rate,source_run_id,created_at,updated_at) FROM '$SEED_DIR/country_daily_metrics.csv' CSV HEADER"

"${PSQL_CMD[@]}" -c "\copy wildchat.conversation_annotation(annotation_id,conversation_id,turn_id,annotation_type,annotation_label,annotation_value,confidence,notes,taxonomy_version,created_at,created_by) FROM '$SEED_DIR/conversation_annotations.csv' CSV HEADER"

# topic_clusters.csv may be empty; still attempt copy (no-op if empty)
"${PSQL_CMD[@]}" -c "\copy wildchat.topic_cluster(cluster_id,cluster_label,cluster_description,keywords,language,country_clean,model_version,created_at,updated_at) FROM '$SEED_DIR/topic_clusters.csv' CSV HEADER"

echo "✓ CSV data loaded"
echo "[3/3] Done. Loaded seed into database '$DB'"

echo "Tip: set PGHOST, PGPORT, PGUSER and PGPASSWORD (or .pgpass) for remote databases."

exit 0
