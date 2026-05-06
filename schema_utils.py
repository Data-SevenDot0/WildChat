"""Schema validation and enforcement utilities for WildChat ETL.

Provides helpers to load DataFrames with schema validation, compare
actual vs. expected schemas, and repair/adapt mismatches.
"""

from __future__ import annotations

from typing import Iterable

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.types import StructType


def validate_schema(df: DataFrame, expected_schema: StructType, strict: bool = False) -> tuple[bool, list[str]]:
    """Validate that DataFrame matches expected schema.

    Returns (is_valid, issues) where issues is a list of mismatches.
    If strict=True, only allows exact matches; otherwise, allows superset
    of columns (extra columns OK, missing columns not OK).
    """

    issues = []
    actual_cols = {f.name: f.dataType for f in df.schema.fields}
    expected_cols = {f.name: f.dataType for f in expected_schema.fields}

    # check for missing columns
    for col in expected_cols:
        if col not in actual_cols:
            issues.append(f"Missing required column: {col}")

    # check for type mismatches
    for col in expected_cols:
        if col in actual_cols:
            actual_type = str(actual_cols[col])
            expected_type = str(expected_cols[col])
            if actual_type != expected_type:
                issues.append(f"Type mismatch for '{col}': expected {expected_type}, got {actual_type}")

    # check for extra columns (if strict mode)
    if strict:
        for col in actual_cols:
            if col not in expected_cols:
                issues.append(f"Extra column not in schema: {col}")

    return (len(issues) == 0, issues)


def read_with_schema(spark: SparkSession, path: str, schema: StructType, enforce: bool = True) -> DataFrame:
    """Read a parquet/table with schema validation.

    If enforce=True and schema mismatch, raises error. Otherwise logs warnings.
    Returns DataFrame with schema-validated read.
    """

    df = spark.read.parquet(path)
    is_valid, issues = validate_schema(df, schema, strict=False)

    if not is_valid:
        msg = f"Schema validation failed for {path}:\n" + "\n".join(issues)
        if enforce:
            raise ValueError(msg)
        else:
            print(f"WARNING: {msg}")

    return df


def repair_schema(df: DataFrame, expected_schema: StructType) -> DataFrame:
    """Repair DataFrame schema to match expected schema.

    Adds missing columns as null, removes extra columns, reorders to match
    expected schema.
    """

    actual_cols = {f.name for f in df.schema.fields}
    expected_cols = {f.name: f for f in expected_schema.fields}

    # add missing columns
    for col_name, field in expected_cols.items():
        if col_name not in actual_cols:
            from pyspark.sql import functions as F

            df = df.withColumn(col_name, F.lit(None).cast(field.dataType))

    # select and reorder to match expected schema
    cols_to_select = [c.name for c in expected_schema.fields if c.name in actual_cols or c.name in expected_cols]
    df = df.select(*cols_to_select)

    return df


def log_schema_summary(df: DataFrame, label: str = "DataFrame") -> None:
    """Print a summary of the DataFrame schema."""

    print(f"\n{label} schema summary:")
    print(f"  Columns: {len(df.columns)}")
    print(f"  Fields: {', '.join(df.columns)}")
