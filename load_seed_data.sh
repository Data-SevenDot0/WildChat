#!/bin/bash
# Load generated seed data into WildChat metastore and test API endpoints
set -e

echo "=== WildChat Seed Data Loader ==="
echo ""

cd /Users/bianca/projects/WildChat
source .venv/bin/activate

# Register schemas if not already done
echo "[1/5] Registering metastore schemas..."
python register_schemas.py --apply --quiet 2>/dev/null || python register_schemas.py --apply >/dev/null 2>&1
echo "✓ Schemas registered"

# Load cleaned conversations
echo "[2/5] Loading cleaned conversations..."
python -c "
from pyspark.sql import SparkSession
spark = SparkSession.builder.enableHiveSupport().getOrCreate()
df = spark.read.parquet('seed_data/cleaned_wildchat')
df.write.mode('append').saveAsTable('wildchat.cleaned_wildchat')
print(f'✓ Loaded {df.count()} conversations')
spark.stop()
" 2>/dev/null

# Load metrics
echo "[3/5] Loading country daily metrics..."
python -c "
from pyspark.sql import SparkSession
spark = SparkSession.builder.enableHiveSupport().getOrCreate()
df = spark.read.parquet('seed_data/country_daily_metrics')
df.write.mode('append').saveAsTable('wildchat.country_daily_metrics')
print(f'✓ Loaded {df.count()} metric records')
spark.stop()
" 2>/dev/null

# Load annotations
echo "[4/5] Loading conversation annotations..."
python -c "
from pyspark.sql import SparkSession
spark = SparkSession.builder.enableHiveSupport().getOrCreate()
df = spark.read.parquet('seed_data/conversation_annotations')
df.write.mode('append').saveAsTable('wildchat.conversation_annotation')
print(f'✓ Loaded {df.count()} annotations')
spark.stop()
" 2>/dev/null

# Load topics
echo "[5/5] Loading topic clusters..."
python -c "
from pyspark.sql import SparkSession
spark = SparkSession.builder.enableHiveSupport().getOrCreate()
df = spark.read.parquet('seed_data/topic_clusters')
df.write.mode('append').saveAsTable('wildchat.topic_cluster')
print(f'✓ Loaded {df.count()} topic clusters')
spark.stop()
" 2>/dev/null

echo ""
echo "✓ All data loaded successfully!"
echo ""
echo "API is running at: http://localhost:8000"
echo ""
echo "Try these endpoints:"
echo "  curl http://localhost:8000/health"
echo "  curl 'http://localhost:8000/api/v1/map'"
echo "  curl 'http://localhost:8000/api/v1/models/comparison'"
echo "  curl 'http://localhost:8000/api/v1/conversations/search?q=learning&limit=10'"
echo "  curl 'http://localhost:8000/api/v1/filter-presets'"
echo ""
