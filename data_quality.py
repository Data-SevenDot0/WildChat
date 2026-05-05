"""Data quality flagging utilities for WildChat cleaned dataset."""

from functools import reduce

from pyspark.sql import functions as F
from pyspark.sql.dataframe import DataFrame


def add_data_quality_flags(df: DataFrame) -> DataFrame:
    """Add data quality validation flags to a conversation DataFrame.

    Flags added:
    - has_missing_values: any of key fields is null
    - valid_timestamp: timestamp is not null
    - valid_country: country is non-empty
    - conversation_length: length of concatenated conversation text
    - long_conversation: conversation_length > 5000 chars
    - short_conversation: conversation_length < 30 chars
    - excessive_turns: turns > 100
    - moderation_present: at least one moderation field present/true

    Returns the DataFrame with new boolean/integer columns added.
    """

    key_fields = ["event_timestamp", "conversation_text", "hash_map_id"]

    # missing values flag
    missing_checks = [F.col(c).isNull() for c in key_fields]
    has_missing = reduce(lambda a, b: a | b, missing_checks)

    df = df.withColumn("has_missing_values", has_missing)

    # timestamp and country checks
    df = df.withColumn("valid_timestamp", F.col("event_timestamp").isNotNull())
    df = df.withColumn("valid_country", (F.col("country_clean").isNotNull()) & (F.length(F.col("country_clean")) > 0))

    # conversation length and turn limits
    df = df.withColumn("conversation_length", F.length(F.col("conversation_text")))
    df = df.withColumn("long_conversation", F.col("conversation_length") > F.lit(5000))
    df = df.withColumn("short_conversation", F.col("conversation_length") < F.lit(30))
    df = df.withColumn("excessive_turns", F.col("turns") > F.lit(100))

    # moderation presence
    moderation_present = (
        F.coalesce(F.col("moderation_flag").cast("int"), F.lit(0))
        + F.when(F.col("toxicity_factor") > 0, 1).otherwise(0)
    ) > 0
    df = df.withColumn("moderation_present", moderation_present)

    return df
