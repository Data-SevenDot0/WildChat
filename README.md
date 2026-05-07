# WildChat — Data Engineering Pipeline & Analytics Platform

A complete data engineering pipeline for the WildChat-1M dataset: extract, transform, load, analyze, and visualize insights from a large collection of user interactions with AI systems (GPT-3.5, GPT-4, etc.).

## Features

- **Schema-first ETL**: Canonical Spark schemas for raw, cleaned, and analytical tables
- **Model comparison**: Track GPT-3.5 vs. GPT-4 adoption, usage patterns, and turn depth by region
- **Geographic insights**: Interactive map with country/state drill-down and time-series filtering
- **Data quality tracking**: Validation flags, run logs, and provenance metadata
- **Extensible ingestion**: Merge translated/tagged data from your team into Delta Lake tables
- **Conversation search**: Full-text search, filters, and inline preview support
- **Topic clustering**: Auto-cluster conversations by semantic similarity
- **Annotation workflows**: Track human tags and labels for conversations

## Quick Start

### 1. Setup Python Environment

```bash
cd /Users/bianca/projects/WildChat
python -m venv venv
source venv/bin/activate
pip install pyspark delta-spark flask pytest psycopg2-binary
```

### 2. Initialize Spark Metastore & Schemas

```bash
python register_schemas.py --apply
```

This creates the `wildchat` database and registers 8 canonical tables.

### 3. Run the Cleaning Pipeline

```bash
python clean_dataset.py --input ./data --output ./data/cleaned --write-table
```

Cleans raw WildChat shards and writes output to:
- Parquet: `./data/cleaned/`
- Metastore: `wildchat.cleaned_wildchat`

### 4. Compute Analytics Metrics

```bash
python aggregate_metrics.py --apply
```

Populates `wildchat.country_daily_metrics` with:
- Daily conversation volume by country, state, language, model
- Average turn depth and model adoption rates
- Redacted and toxic content flags

### 5. Launch the API

```bash
pip install flask
python api.py
```

Open http://localhost:5000/api/v1/health and explore endpoints:
- `GET /api/v1/map` — country metrics for map visualization
- `GET /api/v1/models/comparison` — GPT-3.5 vs GPT-4 comparison
- `GET /api/v1/conversations/search` — full-text search with filters
- `GET /api/v1/filter-presets` — predefined filter sets
- `GET /api/v1/tables/schema` — schema reference

### PostgreSQL Backend

If you want the API to read from PostgreSQL instead of Spark, set `POSTGRES_URL` or `DATABASE_URL` before starting `api.py`:

```bash
export POSTGRES_URL='postgresql://user:password@localhost:5432/wildchat'
python api.py
```

The endpoints will automatically switch to PostgreSQL when that variable is present.

To generate PostgreSQL-compatible seed files, run:

```bash
python generate_seed_data.py --size large --output ./seed_data --postgres-compatible
```

This writes CSV exports and a `postgres_seed.sql` file under `./seed_data/postgres/`.

For the team seed I added in this branch, use the Postgres seed schema and loader under `seed_data_pg_test/postgres/` and `scripts/`.
That seed is based on the new `part_1` and `part_2` data only and does not include the cleaned dataset.

```bash
./scripts/load_postgres_seed.sh wildchat
```

Example PostgreSQL load flow:

```bash
psql "$POSTGRES_URL" -f seed_data/postgres/postgres_seed.sql
```

Then load the CSVs with `COPY` or `\copy` into each table.

## Pipeline Architecture

```
Raw Parquet Shards (./data/)
    ↓
[clean_dataset.py]
    ↓
Cleaned Dataset (./data/cleaned + wildchat.cleaned_wildchat)
    ↓
[aggregate_metrics.py]  [cluster_topics.py]  [ingest_translated.py]
    ↓                        ↓                       ↓
country_daily_metrics   topic_cluster      conversation_fact/turn
    ↓
[api.py]
    ↓
Map | Filters | Search | Model Comparison | Conversation Preview
```

## ETL Scripts

### clean_dataset.py
Flatten raw WildChat parquet shards into analysis-ready dataset.

```bash
python clean_dataset.py --input ./data --output ./data/cleaned --write-table
```

Outputs:
- `event_timestamp`, `event_date`, `country_clean`, `hash_map_id`
- `moderation_flag`, `turns`, `conversation_type`, `toxicity_factor`
- `model`, `language`, `state`, `redacted`, `hashed_ip`, `conversation_text`
- Quality flags: `has_missing_values`, `valid_timestamp`, `valid_country`, `excessive_turns`

### aggregate_metrics.py
Compute country/day metrics for map and comparison views.

```bash
python aggregate_metrics.py --input-table wildchat.cleaned_wildchat --apply
```

Outputs `wildchat.country_daily_metrics`:
- `conversation_count`, `turn_count`, `avg_turn_depth`
- `gpt35_count`, `gpt4_count`, `adoption_rate`
- `redacted_count`, `toxic_count`, `source_run_id`

### cluster_topics.py
Cluster conversations by topic similarity.

```bash
python cluster_topics.py --n-topics 20 --apply
```

Outputs `wildchat.topic_cluster`:
- Cluster metadata: `cluster_label`, `keywords`, `conversation_count`
- Conversation-to-cluster links

### ingest_translated.py
Merge translated/tagged data into `conversation_fact` or `conversation_turn` tables.

```bash
python ingest_translated.py --incoming incoming/translated.parquet --type fact --apply
```

Uses Delta Lake for atomic MERGE (upsert) with schema validation.

### ingest_annotations.py
Load conversation annotations (tags, confidence scores).

```bash
python ingest_annotations.py --incoming annotations.parquet --apply
```

Writes to `wildchat.conversation_annotation`.

### delta_merge.py
Advanced: perform raw Delta MERGE on any two Parquet files.

```bash
python delta_merge.py --incoming source.parquet --table target_table --apply
```

## Schema Reference

Canonical schemas defined in [schemas.py](schemas.py):

### Raw Shard (`raw_wildchat`)
Original WildChat parquet structure with nested arrays for moderation.

### Cleaned (`cleaned_wildchat`)
Flattened, deduplicated, with quality flags.

### Analytics Tables
- `conversation_fact`: Core conversation records with metadata
- `conversation_turn`: Individual turns (exchanges) for turn-depth analysis
- `country_daily_metrics`: Aggregated daily metrics by geo/model
- `topic_cluster`: Semantic topic clusters and assignments
- `conversation_annotation`: Human tags and labels
- `etl_run_log`: Pipeline execution history

See [schemas.py](schemas.py) for full schema definitions.

## API Endpoints

### `/api/v1/health` (GET)
Health check; returns `{"status": "ok", "timestamp": "..."}`

### `/api/v1/map` (GET)
Country/day metrics for map visualization.

Query params:
- `start_date`: YYYY-MM-DD (default: 2023-01-01)
- `end_date`: YYYY-MM-DD (default: 2024-12-31)
- `country`: optional country filter

Response: `{"success": true, "count": ..., "data": [...]}`

### `/api/v1/models/comparison` (GET)
GPT-3.5 vs GPT-4 comparison metrics over time.

Query params:
- `country`: optional
- `language`: optional

Response: Daily time series with `gpt35_conversations`, `gpt4_conversations`, `adoption_rate`, etc.

### `/api/v1/conversations/search` (GET)
Full-text search with filters.

Query params:
- `q`: search query (hash or text)
- `country`, `language`, `model`: optional filters
- `limit`: max results (default 100)

Response: Matching conversations with 200-char preview.

### `/api/v1/filter-presets` (GET)
Seven predefined filter sets:
1. Research Questions
2. Educational
3. High Engagement (10+ turns)
4. GPT-4 Adoption Hotspots (>50%)
5. Moderation Flags
6. Last 30 Days
7. Non-English Conversations

### `/api/v1/tables/schema` (GET)
Schema reference for all tables.

## Testing

Run unit and integration tests:

```bash
pip install pytest
pytest tests/test_etl.py -v
```

Tests validate:
- Schema definitions and registry
- Schema validation/repair utilities
- ETL pipeline logic

## Operational Runbook

### Initialize Database
```bash
python register_schemas.py --apply
```

### Run Full ETL Daily
```bash
# Clean raw data
python clean_dataset.py --input ./data --output ./data/cleaned --write-table

# Aggregate metrics
python aggregate_metrics.py --apply

# Cluster topics
python cluster_topics.py --apply
```

### Merge Translated/Tagged Data from Team
```bash
# Prepare and validate
python ingest_translated.py --incoming team_data/translated.parquet --type fact --dry-run

# Apply merge (atomic Delta MERGE)
python ingest_translated.py --incoming team_data/translated.parquet --type fact --apply
```

### Inspect Metastore
```bash
python -c "
from pyspark.sql import SparkSession
spark = SparkSession.builder.enableHiveSupport().getOrCreate()
spark.sql('SHOW DATABASES').show()
spark.sql('USE wildchat; SHOW TABLES').show()
spark.sql('SELECT * FROM wildchat.etl_run_log LIMIT 5').show(truncate=False)
spark.stop()
"
```

## Project Structure

```
├── schemas.py                 # Canonical Spark schemas
├── schema_utils.py            # Validation/repair helpers
├── clean_dataset.py           # Raw → cleaned ETL
├── aggregate_metrics.py       # Analytics aggregation
├── cluster_topics.py          # Topic clustering
├── ingest_translated.py       # Merge team data (fact/turn tables)
├── ingest_annotations.py      # Load annotations
├── delta_merge.py             # Raw Delta merge utility
├── register_schemas.py        # Initialize metastore
├── api.py                     # Flask API server
├── aggregate_data.py          # Legacy aggregator (deprecated)
├── data_quality.py            # Quality flag utilities
├── conversation_genre.py      # Genre inference
├── tests/
│   └── test_etl.py           # Unit/integration tests
└── data/
    ├── *.parquet             # Raw shards (14 files, ~900K rows)
    ├── cleaned/              # Cleaned output (~16K rows)
    └── aggregated/           # Daily metrics
```

## Dependencies

- **PySpark** 3.4+
- **delta-spark** 2.4+
- **Flask** 2.0+
- **pytest** 7.0+ (testing only)

Install all:
```bash
pip install pyspark delta-spark flask pytest
```

## Feature Roadmap

- [ ] Web UI dashboard (React/Streamlit)
- [ ] Real-time metrics update (streaming)
- [ ] Advanced topic modeling (LDA, BERTopic)
- [ ] User session tracking and replay
- [ ] Conversation flow visualization
- [ ] Custom filter builder UI
- [ ] Annotation review workflow UI
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Multi-tenant support
- [ ] Kubernetes deployment

## Contact & Support

For questions or issues, consult the pipeline logs in `wildchat.etl_run_log` or run tests with `pytest tests/ -v`.

---

**Last Updated**: May 2026
