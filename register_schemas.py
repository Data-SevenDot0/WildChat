"""Register canonical Spark schemas as metastore tables for WildChat.

Usage:
  python register_schemas.py --database wildchat --mode overwrite

By default the script will perform a dry-run and only print the tables that
would be created. Pass `--apply` to actually write the tables into the
configured Spark metastore.
"""

from __future__ import annotations

import argparse
import sys
from typing import Iterable

from schemas import get_schema, schema_names


def register_all(database: str = "wildchat", mode: str = "overwrite", apply: bool = False) -> None:
    """Register all schemas in the given database.

    If `apply` is False the function performs a dry-run and only prints
    the tables that would be created.
    """

    names = schema_names()

    print(f"Schemas to register in database '{database}':")
    for n in names:
        print(f" - {database}.{n}")

    if not apply:
        print("Dry-run mode: no changes made. Re-run with --apply to create tables.")
        return

    # Defer importing pyspark until we actually apply so dry-run stays lightweight
    from pyspark.sql import SparkSession

    spark = (
        SparkSession.builder.appName("WildChat Schema Registrar")
        .config("spark.driver.memory", "1g")
        .getOrCreate()
    )

    try:
        print(f"Creating database if missing: {database}")
        spark.sql(f"CREATE DATABASE IF NOT EXISTS {database}")

        for name in names:
            schema = get_schema(name)
            table_name = f"{database}.{name}"
            print(f"Registering table: {table_name} (mode={mode})")
            empty_df = spark.createDataFrame(spark.sparkContext.emptyRDD(), schema)
            empty_df.write.mode(mode).saveAsTable(table_name)

        print("Schema registration complete.")
    finally:
        spark.stop()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Register WildChat schemas into Spark metastore")
    p.add_argument("--database", default="wildchat", help="Target Spark database name")
    p.add_argument("--mode", default="overwrite", choices=["overwrite", "append", "ignore"], help="Write mode when creating tables")
    p.add_argument("--apply", action="store_true", help="Actually create tables instead of dry-run")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    register_all(database=args.database, mode=args.mode, apply=args.apply)


if __name__ == "__main__":
    main()
