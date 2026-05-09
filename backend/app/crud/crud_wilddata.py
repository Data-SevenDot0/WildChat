from sqlalchemy.orm import Session
from app.models import User
from app.core.security import verify_password, get_password_hash
from typing import Optional
from app.schemas.wilddata_schema import WildChatRecord
import pandas as pd
from pathlib import Path
from pyspark.sql import SparkSession

# Get root directory (3 levels up from crud file)
ROOT_DIR = Path(__file__).parent.parent.parent.parent
parquet_path = ROOT_DIR / "data" / "s2_workfile_cleaned.parquet"

# Initialize Spark session
spark = SparkSession.builder.appName("WildChat").getOrCreate()

def read_parquet_file() -> list[dict]:
    """Read entire parquet file using PySpark"""
    df = spark.read.parquet(str(parquet_path))
    return [row.asDict() for row in df.collect()]

def read_parquet_paginated(limit: int = 10, offset: int = 0) -> list[dict]:
    """Read parquet file with pagination using Spark SQL LIMIT/OFFSET"""
    df = spark.read.parquet(str(parquet_path))
    df.createOrReplaceTempView("wilddata_temp")
    result = spark.sql(f"SELECT * FROM wilddata_temp LIMIT {limit} OFFSET {offset}")
    return [row.asDict() for row in result.collect()]