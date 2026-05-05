#!/usr/bin/env python3
"""
Apache Spark connector route to aggregate WildChat parquet shards by day.
"""

import argparse

from pathlib import Path

from pyspark.sql import SparkSession, functions as F


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aggregate WildChat parquet shards into a daily Spark summary."
    )
    parser.add_argument(
        "--input",
        default="./data",
        help="Directory containing source parquet shards.",
    )
    parser.add_argument(
        "--output",
        default="./data/aggregated",
        help="Directory where the aggregated parquet output will be written.",
    )
    return parser.parse_args()


def run_connector_route(input_dir: str, output_dir: str) -> None:
    spark = (
        SparkSession.builder.appName("WildChat Data Aggregation")
        .config("spark.driver.memory", "2g")
        .getOrCreate()
    )

    spark.sparkContext.setLogLevel("WARN")

    data_path = Path(input_dir)
    # Recursively find parquet files in input directory and subdirectories
    parquet_files = sorted(str(path) for path in data_path.rglob("*.parquet"))

    print(f"Found {len(parquet_files)} parquet files")
    print("=" * 80)

    try:
        if not parquet_files:
            print("No parquet files found in the input directory")
            return

        df = spark.read.parquet(*parquet_files)

        print("\nData Schema:")
        df.printSchema()

        print("\nDataFrame Info:")
        print(f"Total rows: {df.count()}")
        print(f"Total columns: {len(df.columns)}")
        print(f"\nColumn names: {df.columns}")

        print("\nSample Data (first 5 rows):")
        df.show(5, truncate=False)

        print("\nSummary Statistics:")
        df.describe().show()

        if "timestamp" not in df.columns:
            raise ValueError("Input parquet files do not contain a timestamp column")

        daily_summary = (
            df.withColumn("event_date", F.to_date(F.col("timestamp")))
            .groupBy("event_date")
            .agg(
                F.count("*").alias("row_count"),
                F.sum(F.col("toxic").cast("int")).alias("toxic_count"),
                F.sum(F.col("redacted").cast("int")).alias("redacted_count"),
                F.countDistinct("model").alias("model_count"),
            )
            .orderBy("event_date")
        )

        print(f"\nSaving daily aggregation to {output_dir}...")
        daily_summary.coalesce(1).write.mode("overwrite").parquet(output_dir)
        print("Aggregated data saved!")
    finally:
        spark.stop()


def main() -> None:
    args = parse_args()
    run_connector_route(args.input, args.output)


if __name__ == "__main__":
    main()
