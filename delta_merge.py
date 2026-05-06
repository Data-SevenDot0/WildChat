"""Delta merge runner for incoming translated/tagged conversation data.

Supports dry-run summaries and an --apply mode that performs an atomic
Delta MERGE into a target table (recommended: wildchat.conversation_fact).

Usage examples:
  # dry-run (no metastore changes)
  python delta_merge.py --incoming incoming/translated.parquet --table wildchat.conversation_fact

  # apply merge
  python delta_merge.py --incoming incoming/translated.parquet --table wildchat.conversation_fact --apply

Note: this requires the `delta-spark` package installed in your Python
environment. Install with:
  /Users/bianca/.venv/bin/python -m pip install delta-spark
"""

from __future__ import annotations

import argparse
import sys
from typing import Sequence


def parse_args(argv: Sequence[str] | None = None):
    p = argparse.ArgumentParser(description="Delta merge incoming conversation data")
    p.add_argument("--incoming", required=True, help="Path to incoming parquet/Delta data")
    p.add_argument("--table", default="wildchat.conversation_fact", help="Target Delta table name (db.table)")
    p.add_argument("--key", default="conversation_id", help="Primary key column to merge on")
    p.add_argument("--apply", action="store_true", help="Perform the merge; otherwise dry-run")
    p.add_argument("--update-all", action="store_true", help="When matched, update all target columns with source values")
    return p.parse_args(argv)


def _require_delta():
    try:
        from delta.tables import DeltaTable  # type: ignore
    except Exception as exc:  # pragma: no cover - runtime import
        raise RuntimeError(
            "delta-spark is required to run merges. Install with 'pip install delta-spark'."
        ) from exc


def dry_run_summary(spark, incoming_path: str, table_name: str, key: str) -> None:
    src = spark.read.parquet(incoming_path)
    print(f"Incoming rows: {src.count()}")

    # If target exists, compare keys
    try:
        tgt = spark.table(table_name)
    except Exception:
        print(f"Target table {table_name} does not exist in metastore — all incoming rows are new.")
        return

    incoming_keys = src.select(key).distinct()
    matched = incoming_keys.join(tgt.select(key).distinct(), key, how="inner")
    new = incoming_keys.join(tgt.select(key).distinct(), key, how="left_anti")
    print(f"Matching keys (existing rows to update): {matched.count()}")
    print(f"New keys (rows to insert): {new.count()}")


def apply_merge(spark, incoming_path: str, table_name: str, key: str, update_all: bool) -> None:
    from delta.tables import DeltaTable  # type: ignore

    src = spark.read.parquet(incoming_path)

    # ensure target exists and is a Delta table
    delta = DeltaTable.forName(spark, table_name)

    merge_cond = f"t.{key} = s.{key}"

    merger = delta.alias("t").merge(src.alias("s"), merge_cond)

    if update_all:
        merger = merger.whenMatchedUpdateAll()
    else:
        # update a small set of sensible columns if they exist
        # default to updating common tag/translation metadata
        update_map = {}
        for col in ["summary_text", "translated_language", "tag_version", "updated_at"]:
            if col in src.columns:
                update_map[col] = f"s.{col}"

        if update_map:
            merger = merger.whenMatchedUpdate(set=update_map)

    merger = merger.whenNotMatchedInsertAll()
    merger.execute()


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv)

    # create Spark session with Delta enabled
    from pyspark.sql import SparkSession

    spark = (
        SparkSession.builder.appName("wildchat-delta-merge")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .getOrCreate()
    )

    try:
        if not args.apply:
            print("Performing dry-run summary (no changes):")
            dry_run_summary(spark, args.incoming, args.table, args.key)
            return

        # assert delta-spark available
        try:
            _require_delta()
        except RuntimeError as e:
            print(e)
            sys.exit(2)

        print(f"Applying Delta MERGE from {args.incoming} into {args.table} on key {args.key}")
        apply_merge(spark, args.incoming, args.table, args.key, args.update_all)
        print("Merge complete")
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
