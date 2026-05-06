"""Ingest translated/tagged conversation data and merge into Delta tables.

This script normalizes incoming files to the canonical schema (`schemas.py`)
for `conversation_fact` or `conversation_turn`, writes a staging parquet file,
and invokes the Delta merge runner to upsert into the target Delta table.

Usage:
  python ingest_translated.py --incoming incoming/translated.parquet --type fact --dry-run
  python ingest_translated.py --incoming incoming/translated.parquet --type fact --apply
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
import importlib
import uuid

from pyspark.sql import SparkSession, functions as F

from schemas import get_schema


def parse_args():
    p = argparse.ArgumentParser(description="Ingest translated/tagged conversation data and prepare for Delta merge")
    p.add_argument("--incoming", required=True, help="Path to incoming parquet/csv/json file or directory")
    p.add_argument("--type", choices=["fact", "turn"], default="fact", help="Which schema/table to target")
    p.add_argument("--apply", action="store_true", help="Perform the Delta merge (calls delta_merge.py --apply)")
    p.add_argument("--staging-dir", default="/tmp/wildchat/staging", help="Staging directory for normalized parquet")
    p.add_argument("--table", default=None, help="Override target table name (db.table)")
    return p.parse_args()


def choose_table_and_schema(kind: str):
    if kind == "fact":
        return "wildchat.conversation_fact", get_schema("conversation_fact")
    return "wildchat.conversation_turn", get_schema("conversation_turn")


def normalize_df_to_schema(df, schema):
    # ensure all schema fields are present and in the canonical order
    cols = []
    lower_cols = {c.lower(): c for c in df.columns}
    for field in schema.fields:
        name = field.name
        if name in df.columns:
            cols.append(F.col(name).alias(name))
        elif name.lower() in lower_cols:
            cols.append(F.col(lower_cols[name.lower()]).alias(name))
        else:
            # create a null column cast to the schema type
            try:
                dtype_name = field.dataType.simpleString()
            except Exception:
                dtype_name = "string"
            cols.append(F.lit(None).cast(dtype_name).alias(name))

    return df.select(*cols)


def main():
    args = parse_args()

    spark = (
        SparkSession.builder.appName("wildchat-ingest")
        .config("spark.driver.memory", "1g")
        .getOrCreate()
    )

    try:
        incoming = args.incoming
        # read input, support parquet/csv/json by extension
        p = Path(incoming)
        if p.suffix in [".parquet"]:
            df = spark.read.parquet(incoming)
        elif p.suffix in [".json"]:
            df = spark.read.json(incoming)
        elif p.suffix in [".csv"]:
            df = spark.read.option("header", True).csv(incoming)
        else:
            # fallback to reading as parquet directory
            df = spark.read.parquet(incoming)

        table_name, schema = choose_table_and_schema(args.type)
        if args.table:
            table_name = args.table

        normalized = normalize_df_to_schema(df, schema)

        # write staging parquet
        stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        run_id = uuid.uuid4().hex[:8]
        staging_dir = Path(args.staging_dir) / f"{args.type}_staged_{stamp}_{run_id}"
        staging_dir.mkdir(parents=True, exist_ok=True)
        staging_path = str(staging_dir / "data.parquet")
        normalized.write.mode("overwrite").parquet(staging_path)
        print(f"Wrote normalized staging parquet to {staging_path}")

        # call delta_merge dry-run or apply
        dm = importlib.import_module("delta_merge")
        argv = ["--incoming", staging_path, "--table", table_name]
        if args.apply:
            argv.append("--apply")
        print("Invoking delta_merge with:", " ".join(argv))
        dm.main(argv)

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
