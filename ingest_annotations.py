"""Ingest and validate conversation annotations (tags, labels, confidence scores).

Normalizes incoming annotation files to the canonical schema and merges into
`wildchat.conversation_annotation` table.

Usage:
  python ingest_annotations.py --incoming annotations.parquet --dry-run
  python ingest_annotations.py --incoming annotations.parquet --apply
"""

from __future__ import annotations

import argparse
from datetime import datetime
import uuid

from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import StructType

from schemas import get_schema


def parse_args():
    p = argparse.ArgumentParser(description="Ingest conversation annotations")
    p.add_argument("--incoming", required=True, help="Path to annotation parquet/csv/json")
    p.add_argument("--apply", action="store_true", help="Write to metastore; otherwise dry-run")
    p.add_argument("--table", default="wildchat.conversation_annotation", help="Target table")
    return p.parse_args()


def normalize_annotations(df: "pyspark.sql.DataFrame", schema: StructType) -> "pyspark.sql.DataFrame":
    """Normalize incoming annotation DataFrame to canonical schema."""

    # ensure all schema fields present and in order
    cols = []
    lower_cols = {c.lower(): c for c in df.columns}

    for field in schema.fields:
        name = field.name
        if name in df.columns:
            cols.append(F.col(name).alias(name))
        elif name.lower() in lower_cols:
            cols.append(F.col(lower_cols[name.lower()]).alias(name))
        else:
            try:
                dtype_name = field.dataType.simpleString()
            except Exception:
                dtype_name = "string"
            cols.append(F.lit(None).cast(dtype_name).alias(name))

    return df.select(*cols)


def main():
    args = parse_args()

    spark = (
        SparkSession.builder.appName("wildchat-ingest-annotations")
        .config("spark.driver.memory", "1g")
        .getOrCreate()
    )

    try:
        # read input
        from pathlib import Path
        p = Path(args.incoming)
        if p.suffix == ".parquet":
            df = spark.read.parquet(args.incoming)
        elif p.suffix == ".json":
            df = spark.read.json(args.incoming)
        elif p.suffix == ".csv":
            df = spark.read.option("header", True).csv(args.incoming)
        else:
            df = spark.read.parquet(args.incoming)

        print(f"Incoming annotations: {df.count()}")

        # normalize to schema
        schema = get_schema("conversation_annotation")
        normalized = normalize_annotations(df, schema)

        if not args.apply:
            print("Dry-run mode: showing sample normalized rows")
            normalized.show(5, truncate=False)
            return

        # write to metastore
        print(f"Writing annotations to {args.table}...")
        normalized.write.mode("append").saveAsTable(args.table)
        print(f"Annotations written: {normalized.count()} rows")

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
