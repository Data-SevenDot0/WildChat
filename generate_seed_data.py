#!/usr/bin/env python3
"""Generate realistic sample data for WildChat analytics.

Creates Parquet files with sample conversations, metrics, and annotations
ready for ingestion into the Spark metastore.

Usage:
  python generate_seed_data.py --output ./seed_data --size large
"""

from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, DoubleType,
    BooleanType, TimestampType, DateType, ArrayType
)


def parse_args():
    p = argparse.ArgumentParser(description="Generate seed data for WildChat")
    p.add_argument("--output", default="./seed_data", help="Output directory")
    p.add_argument("--size", default="large", choices=["small", "medium", "large"],
                   help="Dataset size")
    p.add_argument("--rows", type=int, help="Override row count")
    return p.parse_args()


def get_row_count(size: str, rows: int | None) -> int:
    if rows:
        return rows
    return {"small": 100, "medium": 1000, "large": 10000}[size]


def generate_conversations(spark, row_count: int) -> "pyspark.sql.DataFrame":
    """Generate sample cleaned_wildchat data."""
    
    countries = ["US", "CA", "GB", "AU", "DE", "FR", "JP", "IN", "BR", "MX"]
    languages = ["en", "es", "fr", "de", "ja", "zh", "pt", "hi", "ko"]
    models = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "claude-2", "llama-2"]
    conversation_types = ["general", "research", "education", "support", "creative"]
    states = ["CA", "NY", "TX", "FL", "PA", "IL", "OH", "GA", "NC", "MI"]

    sample_texts = [
        "Can you help me understand machine learning algorithms?",
        "How do I optimize my Python code for performance?",
        "What are the best practices for API design?",
        "Explain quantum computing in simple terms",
        "How do I deploy a containerized application?",
        "What's the difference between SQL and NoSQL databases?",
        "Help me debug this JavaScript error",
        "Recommend a good book on data science",
        "How do I write unit tests effectively?",
        "What are microservices and when should I use them?",
    ]

    # Generate raw data
    data = []
    for i in range(row_count):
        timestamp = datetime.now() - timedelta(days=random.randint(0, 365))
        data.append({
            "event_timestamp": timestamp,
            "event_date": timestamp.date(),
            "country_clean": random.choice(countries),
            "state": random.choice(states),
            "hash_map_id": f"conv_{i:08d}",
            "moderation_flag": random.choice([True, False]),
            "turns": random.randint(1, 50),
            "conversation_type": random.choice(conversation_types),
            "toxicity_factor": round(random.random() * 0.5, 2),
            "model": random.choice(models),
            "language": random.choice(languages),
            "redacted": random.choice([True, False]),
            "hashed_ip": f"ip_{random.randint(1000, 9999)}",
            "conversation_text": random.choice(sample_texts),
            "has_missing_values": False,
            "valid_timestamp": True,
            "valid_country": True,
            "long_conversation": random.randint(1, 50) > 20,
            "short_conversation": random.randint(1, 50) < 3,
            "excessive_turns": random.randint(1, 50) > 30,
            "moderation_present": random.choice([True, False]),
        })

    schema = StructType([
        StructField("event_timestamp", TimestampType(), True),
        StructField("event_date", DateType(), True),
        StructField("country_clean", StringType(), True),
        StructField("state", StringType(), True),
        StructField("hash_map_id", StringType(), True),
        StructField("moderation_flag", BooleanType(), True),
        StructField("turns", IntegerType(), True),
        StructField("conversation_type", StringType(), True),
        StructField("toxicity_factor", DoubleType(), True),
        StructField("model", StringType(), True),
        StructField("language", StringType(), True),
        StructField("redacted", BooleanType(), True),
        StructField("hashed_ip", StringType(), True),
        StructField("conversation_text", StringType(), True),
        StructField("has_missing_values", BooleanType(), True),
        StructField("valid_timestamp", BooleanType(), True),
        StructField("valid_country", BooleanType(), True),
        StructField("long_conversation", BooleanType(), True),
        StructField("short_conversation", BooleanType(), True),
        StructField("excessive_turns", BooleanType(), True),
        StructField("moderation_present", BooleanType(), True),
    ])

    df = spark.createDataFrame(data, schema=schema)
    return df.coalesce(1)


def generate_metrics(spark, conversations_df) -> "pyspark.sql.DataFrame":
    """Generate aggregated country_daily_metrics from conversations."""
    
    metrics = (
        conversations_df
        .groupBy("event_date", "country_clean", "state", "language", "model")
        .agg(
            F.countDistinct("hash_map_id").alias("conversation_count"),
            F.sum("turns").alias("turn_count"),
            F.avg("turns").alias("avg_turn_depth"),
            F.sum(F.when(F.col("model").like("%gpt-3.5%"), 1).otherwise(0)).alias("gpt35_count"),
            F.sum(F.when(F.col("model").like("%gpt-4%"), 1).otherwise(0)).alias("gpt4_count"),
            F.sum(F.when(F.col("moderation_flag"), 1).otherwise(0)).alias("redacted_count"),
            F.sum(F.when(F.col("moderation_present"), 1).otherwise(0)).alias("toxic_count"),
        )
        .withColumn("adoption_rate", 
            F.when(
                (F.col("gpt35_count") + F.col("gpt4_count")) > 0,
                F.col("gpt4_count") / (F.col("gpt35_count") + F.col("gpt4_count"))
            ).otherwise(0)
        )
        .withColumn("source_run_id", F.lit("seed_load_001"))
        .withColumn("created_at", F.current_timestamp())
        .withColumn("updated_at", F.current_timestamp())
    )
    
    return metrics.coalesce(1)


def generate_annotations(spark, row_count: int) -> "pyspark.sql.DataFrame":
    """Generate sample conversation_annotation data."""
    
    annotation_types = ["sentiment", "topic", "quality", "bias", "accuracy"]
    labels = ["positive", "negative", "neutral", "technical", "non-technical", "high", "low", "biased", "fair"]
    confidences = [round(random.uniform(0.5, 1.0), 2) for _ in range(row_count)]
    
    data = []
    for i in range(min(row_count // 2, 5000)):  # Create annotations for subset
        data.append({
            "annotation_id": f"annot_{i:08d}",
            "conversation_id": f"conv_{random.randint(0, row_count-1):08d}",
            "turn_id": random.randint(0, 50),
            "annotation_type": random.choice(annotation_types),
            "annotation_label": random.choice(labels),
            "annotation_value": round(random.random(), 2),
            "confidence": random.choice(confidences),
            "notes": f"Annotated sample {i}",
            "taxonomy_version": "v1",
            "created_at": datetime.now() - timedelta(days=random.randint(0, 30)),
            "created_by": f"annotator_{random.randint(1, 10)}",
        })

    schema = StructType([
        StructField("annotation_id", StringType(), True),
        StructField("conversation_id", StringType(), True),
        StructField("turn_id", IntegerType(), True),
        StructField("annotation_type", StringType(), True),
        StructField("annotation_label", StringType(), True),
        StructField("annotation_value", DoubleType(), True),
        StructField("confidence", DoubleType(), True),
        StructField("notes", StringType(), True),
        StructField("taxonomy_version", StringType(), True),
        StructField("created_at", TimestampType(), True),
        StructField("created_by", StringType(), True),
    ])

    df = spark.createDataFrame(data, schema=schema)
    return df.coalesce(1)


def generate_topics(spark, row_count: int) -> "pyspark.sql.DataFrame":
    """Generate sample topic_cluster data."""
    from pyspark.sql.types import ArrayType
    
    keywords_list = [
        ["machine", "learning", "algorithm", "model"],
        ["database", "sql", "query", "schema"],
        ["api", "rest", "web", "service"],
        ["cloud", "deployment", "kubernetes", "docker"],
        ["security", "encryption", "authentication", "token"],
        ["performance", "optimization", "caching", "load"],
        ["frontend", "ui", "react", "javascript"],
        ["backend", "python", "node", "framework"],
        ["data", "analytics", "visualization", "dashboard"],
        ["testing", "unit", "integration", "pytest"],
    ]

    data = []
    for i in range(min(20, row_count // 500)):
        data.append({
            "cluster_id": i,
            "cluster_label": f"Topic_{i}",
            "cluster_description": f"Auto-clustered topic group {i}",
            "keywords": random.choice(keywords_list),
            "language": "multilingual",
            "country_clean": None,
            "model_version": "v1",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        })

    schema = StructType([
        StructField("cluster_id", IntegerType(), True),
        StructField("cluster_label", StringType(), True),
        StructField("cluster_description", StringType(), True),
        StructField("keywords", ArrayType(StringType()), True),
        StructField("language", StringType(), True),
        StructField("country_clean", StringType(), True),
        StructField("model_version", StringType(), True),
        StructField("created_at", TimestampType(), True),
        StructField("updated_at", TimestampType(), True),
    ])

    df = spark.createDataFrame(data, schema=schema)
    return df.coalesce(1)


def main():
    args = parse_args()
    row_count = get_row_count(args.size, args.rows)
    
    print(f"Generating {args.size} dataset ({row_count} rows)...")
    
    spark = (
        SparkSession.builder.appName("WildChat Seed Data Generator")
        .config("spark.driver.memory", "2g")
        .getOrCreate()
    )
    
    try:
        output_path = Path(args.output)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Generate datasets
        print("Generating conversations...")
        conversations = generate_conversations(spark, row_count)
        conv_path = output_path / "cleaned_wildchat"
        conversations.write.mode("overwrite").parquet(str(conv_path))
        print(f"✓ Saved {conversations.count()} conversations to {conv_path}")
        
        print("Generating metrics...")
        metrics = generate_metrics(spark, conversations)
        metrics_path = output_path / "country_daily_metrics"
        metrics.write.mode("overwrite").parquet(str(metrics_path))
        print(f"✓ Saved {metrics.count()} metric records to {metrics_path}")
        
        print("Generating annotations...")
        annotations = generate_annotations(spark, row_count)
        annot_path = output_path / "conversation_annotations"
        annotations.write.mode("overwrite").parquet(str(annot_path))
        print(f"✓ Saved {annotations.count()} annotations to {annot_path}")
        
        print("Generating topics...")
        topics = generate_topics(spark, row_count)
        topics_path = output_path / "topic_clusters"
        topics.write.mode("overwrite").parquet(str(topics_path))
        print(f"✓ Saved {topics.count()} topics to {topics_path}")
        
        print(f"\n✓ Seed data generated in {output_path}")
        print(f"\nTo load into metastore, run:")
        print(f"  python ingest_translated.py --incoming {conv_path} --type fact --apply")
        print(f"  python aggregate_metrics.py --input-dir {metrics_path} --apply")
        
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
