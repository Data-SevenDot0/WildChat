"""Unit and integration tests for WildChat ETL pipelines."""

import pytest
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, IntegerType

from schemas import get_schema, schema_names
from schema_utils import validate_schema, repair_schema


@pytest.fixture(scope="session")
def spark():
    """Create a Spark session for testing."""
    return (
        SparkSession.builder
        .appName("test")
        .master("local")
        .config("spark.sql.shuffle.partitions", "1")
        .getOrCreate()
    )


class TestSchemas:
    """Test schema definitions."""

    def test_schema_names_not_empty(self):
        """Schemas registry should contain tables."""
        names = schema_names()
        assert len(names) > 0
        assert "cleaned_wildchat" in names
        assert "country_daily_metrics" in names

    def test_cleaned_wildchat_schema(self):
        """Cleaned schema should have key columns."""
        schema = get_schema("cleaned_wildchat")
        col_names = [f.name for f in schema.fields]
        assert "event_timestamp" in col_names
        assert "country_clean" in col_names
        assert "model" in col_names
        assert "conversation_text" in col_names


class TestSchemaValidation:
    """Test schema validation utilities."""

    def test_validate_schema_exact_match(self, spark):
        """DataFrame with matching schema should pass validation."""
        test_schema = StructType([
            StructField("id", StringType(), True),
            StructField("count", IntegerType(), True),
        ])

        df = spark.createDataFrame([("a", 1), ("b", 2)], schema=test_schema)
        is_valid, issues = validate_schema(df, test_schema, strict=True)

        assert is_valid is True
        assert len(issues) == 0

    def test_validate_schema_missing_column(self, spark):
        """DataFrame missing columns should fail validation."""
        expected_schema = StructType([
            StructField("id", StringType(), True),
            StructField("count", IntegerType(), True),
            StructField("required_field", StringType(), True),
        ])

        df = spark.createDataFrame([("a", 1), ("b", 2)], 
            schema=StructType([
                StructField("id", StringType(), True),
                StructField("count", IntegerType(), True),
            ])
        )
        is_valid, issues = validate_schema(df, expected_schema, strict=False)

        assert is_valid is False
        assert len(issues) > 0
        assert any("Missing required column" in issue for issue in issues)

    def test_repair_schema_adds_missing_columns(self, spark):
        """Repair should add missing columns as null."""
        test_schema = StructType([
            StructField("id", StringType(), True),
            StructField("count", IntegerType(), True),
        ])

        expected_schema = StructType([
            StructField("id", StringType(), True),
            StructField("count", IntegerType(), True),
            StructField("new_field", StringType(), True),
        ])

        df = spark.createDataFrame([("a", 1), ("b", 2)], schema=test_schema)
        repaired = repair_schema(df, expected_schema)

        assert "new_field" in repaired.columns
        assert len(repaired.columns) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
