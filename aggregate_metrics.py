#!/usr/bin/env python3
"""Aggregate country/day metrics for model comparison and adoption tracking.

Reads cleaned conversations and computes daily metrics by country, state,
language, and model. Outputs to `wildchat.country_daily_metrics` table.

Usage:
  python aggregate_metrics.py --input-table wildchat.cleaned_wildchat --apply
  python aggregate_metrics.py --input-dir ./data/cleaned --apply
"""

from __future__ import annotations

import argparse
from datetime import datetime
import uuid

from pyspark.sql import SparkSession, functions as F
from pyspark.sql.window import Window

from schemas import get_schema, SCHEMA_VERSION


def parse_args():
    p = argparse.ArgumentParser(description="Aggregate country/day metrics for analytics")
    p.add_argument("--input-table", default=None, help="Read from metastore table (db.table)")
    p.add_argument("--input-dir", default=None, help="Read from parquet directory")
    p.add_argument("--output-table", default="wildchat.country_daily_metrics", help="Target metrics table")
    p.add_argument("--apply", action="store_true", help="Write to metastore; otherwise dry-run")
    p.add_argument("--mode", choices=["overwrite", "append"], default="append", help="Write mode")
    return p.parse_args()


def compute_metrics(df):
    """Compute country/day/model metrics from cleaned conversations.
    
    Groups by event_date, country_clean, state, language, model and aggregates:
    - conversation_count: distinct conversations
    - turn_count: total turns
    - avg_turn_depth: average turns per conversation
    - gpt35_count, gpt4_count: model-specific counts
    - redacted_count, toxic_count: flag counts
    - adoption_rate: gpt4 / (gpt35 + gpt4)
    """

    # create model version flags
    df = df.withColumn(
        "is_gpt35",
        F.lower(F.col("model")).contains("gpt-3.5") | F.lower(F.col("model")).contains("3.5")
    ).withColumn(
        "is_gpt4",
        F.lower(F.col("model")).contains("gpt-4") & ~F.lower(F.col("model")).contains("gpt-4o")
    ).withColumn(
        "is_redacted",
        F.coalesce(F.col("redacted").cast("int"), F.lit(0))
    ).withColumn(
        "is_toxic",
        F.coalesce(F.col("moderation_flag").cast("int"), F.lit(0))
    )

    # group and aggregate
    metrics = (
        df.groupBy("event_date", "country_clean", "state", "language", "model")
        .agg(
            F.countDistinct("hash_map_id").alias("conversation_count"),
            F.sum("turns").alias("turn_count"),
            F.avg("turns").alias("avg_turn_depth"),
            F.sum(F.when(F.col("is_gpt35"), 1).otherwise(0)).alias("gpt35_count"),
            F.sum(F.when(F.col("is_gpt4"), 1).otherwise(0)).alias("gpt4_count"),
            F.sum("is_redacted").alias("redacted_count"),
            F.sum("is_toxic").alias("toxic_count"),
        )
        .withColumn(
            "adoption_rate",
            F.when(
                (F.col("gpt35_count") + F.col("gpt4_count")) > 0,
                F.col("gpt4_count") / (F.col("gpt35_count") + F.col("gpt4_count"))
            ).otherwise(F.lit(None))
        )
    )

    return metrics


def main():
    args = parse_args()

    spark = (
        SparkSession.builder.appName("WildChat Metrics Aggregation")
        .config("spark.driver.memory", "2g")
        .getOrCreate()
    )

    spark.sparkContext.setLogLevel("WARN")

    try:
        # read input
        if args.input_table:
            print(f"Reading from metastore table {args.input_table}...")
            df = spark.table(args.input_table)
        elif args.input_dir:
            print(f"Reading from parquet directory {args.input_dir}...")
            df = spark.read.parquet(args.input_dir)
        else:
            # default to cleaned table
            print("Defaulting to wildchat.cleaned_wildchat...")
            df = spark.table("wildchat.cleaned_wildchat")

        print(f"Input row count: {df.count()}")

        # compute metrics
        print("Computing country/day metrics...")
        metrics = compute_metrics(df)
        print(f"Metrics row count: {metrics.count()}")

        # add source tracking
        run_id = str(uuid.uuid4())
        metrics = metrics.withColumn("source_run_id", F.lit(run_id))

        # display sample
        print("\nSample metrics (first 10 rows):")
        metrics.show(10, truncate=False)

        # write output
        if args.apply:
            print(f"\nWriting metrics to {args.output_table} (mode={args.mode})...")
            metrics.write.mode(args.mode).saveAsTable(args.output_table)
            print("Metrics written successfully")

            # log to ETL run log
            try:
                from schemas import get_schema as gs
                log_entry = {
                    "run_id": run_id,
                    "pipeline_name": "aggregate_metrics",
                    "input_path": args.input_table or args.input_dir or "wildchat.cleaned_wildchat",
                    "output_path": args.output_table,
                    "schema_version": SCHEMA_VERSION,
                    "started_at": datetime.utcnow(),
                    "finished_at": datetime.utcnow(),
                    "status": "success",
                    "input_row_count": df.count(),
                    "output_row_count": metrics.count(),
                    "error_row_count": 0,
                    "notes": None,
                }
                log_schema = gs("etl_run_log")
                spark.createDataFrame([log_entry], schema=log_schema).write.mode("append").saveAsTable("wildchat.etl_run_log")
                print("Logged to etl_run_log")
            except Exception as e:
                print(f"Warning: failed to log to etl_run_log: {e}")
        else:
            print("Dry-run mode: no changes made. Re-run with --apply to write to metastore.")

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
