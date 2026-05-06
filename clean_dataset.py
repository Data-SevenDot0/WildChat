#!/usr/bin/env python3
"""Clean WildChat parquet data into a flat, analysis-ready Spark dataset."""

from __future__ import annotations

import argparse
from pathlib import Path
from datetime import datetime
import uuid

from pyspark.sql import SparkSession, functions as F
from pyspark.sql.window import Window

from conversation_genre import conversation_text_column, infer_genre
from data_quality import add_data_quality_flags
from schemas import SCHEMA_VERSION, get_schema


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clean WildChat parquet shards into a normalized dataset."
    )
    parser.add_argument(
        "--input",
        default="./data",
        help="Directory containing source parquet shards.",
    )
    parser.add_argument(
        "--output",
        default="./data/cleaned",
        help="Directory where the cleaned parquet output will be written.",
    )
    parser.add_argument(
        "--write-table",
        action="store_true",
        help="Also write the cleaned dataset into a Spark metastore table",
    )
    parser.add_argument(
        "--table-name",
        default="wildchat.cleaned_wildchat",
        help="Target metastore table name to write cleaned dataset into (db.table)",
    )
    parser.add_argument(
        "--table-mode",
        default="overwrite",
        choices=["overwrite", "append", "ignore"],
        help="Write mode when saving to metastore table",
    )
    return parser.parse_args()


def build_file_list(input_dir: str) -> list[str]:
    data_path = Path(input_dir)
    # Recursively collect parquet files from input directory and all subdirectories
    return sorted(str(path) for path in data_path.rglob("*.parquet"))


def clean_dataset(input_dir: str, output_dir: str) -> None:
    spark = (
        SparkSession.builder.appName("WildChat Data Cleaning")
        .config("spark.driver.memory", "2g")
        .getOrCreate()
    )

    spark.sparkContext.setLogLevel("WARN")
    parquet_files = build_file_list(input_dir)

    run_id = str(uuid.uuid4())
    pipeline_name = "clean_dataset"
    started_at = datetime.utcnow()
    etl_log = {
        "run_id": run_id,
        "pipeline_name": pipeline_name,
        "input_path": input_dir,
        "output_path": output_dir,
        "schema_version": SCHEMA_VERSION,
        "started_at": started_at,
        "finished_at": None,
        "status": "running",
        "input_row_count": None,
        "output_row_count": None,
        "error_row_count": None,
        "notes": None,
    }

    print(f"Found {len(parquet_files)} parquet files")
    print("=" * 80)

    try:
        if not parquet_files:
            print("No parquet files found in the input directory")
            return

        df = spark.read.parquet(*parquet_files)
        etl_log["input_row_count"] = int(df.count())

        required_columns = {"timestamp", "conversation", "turn", "model", "country", "hashed_ip", "toxic", "redacted", "openai_moderation", "detoxify_moderation"}
        missing_columns = sorted(required_columns - set(df.columns))
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")

        normalized = (
            df.withColumn("event_timestamp", F.col("timestamp"))
            .withColumn("event_date", F.to_date(F.col("timestamp")))
            .withColumn("country_clean", F.trim(F.col("country")))
            .withColumn("hash_map_id", F.coalesce(F.col("conversation_hash"), F.col("hashed_ip")))
            .withColumn("moderation_flag", F.col("toxic").cast("boolean"))
            .withColumn("turns", F.col("turn").cast("int"))
            .withColumn("conversation_text", conversation_text_column(F.col("conversation")))
            .withColumn("conversation_type", infer_genre(F.col("conversation_text")))
            .withColumn(
                "toxicity_factor",
                F.greatest(
                    F.coalesce(F.col("toxic").cast("double"), F.lit(0.0)),
                    F.coalesce(F.expr("aggregate(transform(detoxify_moderation, x -> x.toxicity), 0D, (acc, x) -> greatest(acc, x))"), F.lit(0.0)),
                    F.coalesce(F.expr("aggregate(transform(openai_moderation, x -> x.flagged), 0D, (acc, x) -> greatest(acc, double(x)))"), F.lit(0.0)),
                ),
            )
            .select(
                "event_timestamp",
                "event_date",
                "country_clean",
                F.col("hash_map_id").alias("hash_map_id"),
                "moderation_flag",
                "turns",
                "conversation_type",
                "toxicity_factor",
                "model",
                "language",
                "state",
                "redacted",
                "hashed_ip",
                "conversation_text",
            )
        )

        deduped = normalized.dropDuplicates(["hash_map_id", "event_timestamp", "turns"])

        # Add data quality flags
        cleaned = add_data_quality_flags(deduped)

        print("\nCleaned schema:")
        cleaned.printSchema()

        print("\nCleaned sample:")
        cleaned.show(5, truncate=False)

        print(f"\nWriting cleaned dataset to {output_dir}...")
        # always write parquet to preserve current behavior
        cleaned.write.mode("overwrite").parquet(output_dir)
        print("Cleaned dataset saved!")

        # optionally write into metastore table
        # parse args from CLI if present
        import sys
        args = parse_args()
        if args.write_table:
            table_name = args.table_name
            # ensure database exists if provided
            if "." in table_name:
                db_name = table_name.split(".", 1)[0]
                spark.sql(f"CREATE DATABASE IF NOT EXISTS {db_name}")

            print(f"Writing cleaned dataset to metastore table {table_name} (mode={args.table_mode})")
            cleaned.write.mode(args.table_mode).saveAsTable(table_name)
            print("Table write complete")

        etl_log["output_row_count"] = int(cleaned.count())
        etl_log["finished_at"] = datetime.utcnow()
        etl_log["status"] = "success"

        # write ETL run log to metastore if table exists
        try:
            log_table = "wildchat.etl_run_log"
            # create dataframe for log entry and append
            log_schema = get_schema("etl_run_log")
            log_df = spark.createDataFrame([etl_log], schema=log_schema)
            log_df.write.mode("append").saveAsTable(log_table)
            print(f"Wrote ETL run log to {log_table}")
        except Exception as exc:
            print("Warning: failed to write ETL run log:", exc)
    except Exception:
        etl_log["finished_at"] = datetime.utcnow()
        etl_log["status"] = "failed"
        etl_log["notes"] = "Exception during clean_dataset"
        try:
            from pyspark.sql import SparkSession

            # attempt to write failure log if spark is available
            spark2 = SparkSession.builder.getOrCreate()
            log_schema = get_schema("etl_run_log")
            spark2.createDataFrame([etl_log], schema=log_schema).write.mode("append").saveAsTable("wildchat.etl_run_log")
        except Exception:
            pass
        raise
    finally:
        spark.stop()


def main() -> None:
    args = parse_args()
    clean_dataset(args.input, args.output)


if __name__ == "__main__":
    main()