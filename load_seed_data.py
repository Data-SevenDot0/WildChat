#!/usr/bin/env python3
"""Load seed data directly into metastore (no registration needed if tables exist)."""

from pyspark.sql import SparkSession

spark = (
    SparkSession.builder
    .appName("Load Seed Data")
    .enableHiveSupport()
    .config("spark.driver.memory", "2g")
    .getOrCreate()
)

try:
    # Ensure database exists
    spark.sql("CREATE DATABASE IF NOT EXISTS wildchat")
    
    # Load cleaned conversations
    print("[1/4] Loading cleaned conversations...")
    df_conv = spark.read.parquet("seed_data/cleaned_wildchat")
    spark.sql("DROP TABLE IF EXISTS wildchat.cleaned_wildchat")
    df_conv.write.mode("overwrite").saveAsTable("wildchat.cleaned_wildchat")
    print(f"✓ Loaded {df_conv.count()} conversations")
    
    # Load metrics
    print("[2/4] Loading country daily metrics...")
    df_metrics = spark.read.parquet("seed_data/country_daily_metrics")
    spark.sql("DROP TABLE IF EXISTS wildchat.country_daily_metrics")
    df_metrics.write.mode("overwrite").saveAsTable("wildchat.country_daily_metrics")
    print(f"✓ Loaded {df_metrics.count()} metric records")
    
    # Load annotations
    print("[3/4] Loading conversation annotations...")
    df_annot = spark.read.parquet("seed_data/conversation_annotations")
    spark.sql("DROP TABLE IF EXISTS wildchat.conversation_annotation")
    df_annot.write.mode("overwrite").saveAsTable("wildchat.conversation_annotation")
    print(f"✓ Loaded {df_annot.count()} annotations")
    
    # Load topics
    print("[4/4] Loading topic clusters...")
    df_topics = spark.read.parquet("seed_data/topic_clusters")
    spark.sql("DROP TABLE IF EXISTS wildchat.topic_cluster")
    df_topics.write.mode("overwrite").saveAsTable("wildchat.topic_cluster")
    print(f"✓ Loaded {df_topics.count()} topic clusters")
    
    print("\n✓ All data loaded successfully!")
    print("\nAPI endpoint: http://localhost:8000/api/v1/map")
    
finally:
    spark.stop()
