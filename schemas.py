"""Canonical Spark schemas for the WildChat pipeline.

This module defines the current raw shard schema, the cleaned analytical
dataset schema, and the first-pass tables that support the feature set the
project is aiming for: turn depth analysis, model comparison, geographic
drilldowns, annotations, topic clustering, and ETL run tracking.
"""

from __future__ import annotations

from pyspark.sql.types import (
    ArrayType,
    BooleanType,
    DateType,
    DoubleType,
    IntegerType,
    LongType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)


SCHEMA_VERSION = "v1"


OPENAI_MODERATION_CATEGORIES_SCHEMA = StructType(
    [
        StructField("harassment", BooleanType(), True),
        StructField("harassment/threatening", BooleanType(), True),
        StructField("harassment_threatening", BooleanType(), True),
        StructField("hate", BooleanType(), True),
        StructField("hate/threatening", BooleanType(), True),
        StructField("hate_threatening", BooleanType(), True),
        StructField("self-harm", BooleanType(), True),
        StructField("self-harm/instructions", BooleanType(), True),
        StructField("self-harm/intent", BooleanType(), True),
        StructField("self_harm", BooleanType(), True),
        StructField("self_harm_instructions", BooleanType(), True),
        StructField("self_harm_intent", BooleanType(), True),
        StructField("sexual", BooleanType(), True),
        StructField("sexual/minors", BooleanType(), True),
        StructField("sexual_minors", BooleanType(), True),
        StructField("violence", BooleanType(), True),
        StructField("violence/graphic", BooleanType(), True),
        StructField("violence_graphic", BooleanType(), True),
    ]
)


OPENAI_MODERATION_SCORES_SCHEMA = StructType(
    [
        StructField("harassment", DoubleType(), True),
        StructField("harassment/threatening", DoubleType(), True),
        StructField("harassment_threatening", DoubleType(), True),
        StructField("hate", DoubleType(), True),
        StructField("hate/threatening", DoubleType(), True),
        StructField("hate_threatening", DoubleType(), True),
        StructField("self-harm", DoubleType(), True),
        StructField("self-harm/instructions", DoubleType(), True),
        StructField("self-harm/intent", DoubleType(), True),
        StructField("self_harm", DoubleType(), True),
        StructField("self_harm_instructions", DoubleType(), True),
        StructField("self_harm_intent", DoubleType(), True),
        StructField("sexual", DoubleType(), True),
        StructField("sexual/minors", DoubleType(), True),
        StructField("sexual_minors", DoubleType(), True),
        StructField("violence", DoubleType(), True),
        StructField("violence/graphic", DoubleType(), True),
        StructField("violence_graphic", DoubleType(), True),
    ]
)


OPENAI_MODERATION_SCHEMA = StructType(
    [
        StructField("categories", OPENAI_MODERATION_CATEGORIES_SCHEMA, True),
        StructField("category_scores", OPENAI_MODERATION_SCORES_SCHEMA, True),
        StructField("flagged", BooleanType(), True),
    ]
)


DETOXIFY_MODERATION_SCHEMA = StructType(
    [
        StructField("identity_attack", DoubleType(), True),
        StructField("insult", DoubleType(), True),
        StructField("obscene", DoubleType(), True),
        StructField("severe_toxicity", DoubleType(), True),
        StructField("sexual_explicit", DoubleType(), True),
        StructField("threat", DoubleType(), True),
        StructField("toxicity", DoubleType(), True),
    ]
)


HEADER_SCHEMA = StructType(
    [
        StructField("accept-language", StringType(), True),
        StructField("user-agent", StringType(), True),
    ]
)


RAW_CONVERSATION_MESSAGE_SCHEMA = StructType(
    [
        StructField("content", StringType(), True),
        StructField("country", StringType(), True),
        StructField("hashed_ip", StringType(), True),
        StructField("header", HEADER_SCHEMA, True),
        StructField("language", StringType(), True),
        StructField("redacted", BooleanType(), True),
        StructField("role", StringType(), True),
        StructField("state", StringType(), True),
        StructField("timestamp", TimestampType(), True),
        StructField("toxic", BooleanType(), True),
        StructField("turn_identifier", LongType(), True),
    ]
)


RAW_WILDCHAT_SCHEMA = StructType(
    [
        StructField("conversation_hash", StringType(), True),
        StructField("model", StringType(), True),
        StructField("timestamp", TimestampType(), True),
        StructField("conversation", ArrayType(RAW_CONVERSATION_MESSAGE_SCHEMA, True), True),
        StructField("turn", LongType(), True),
        StructField("language", StringType(), True),
        StructField("openai_moderation", ArrayType(OPENAI_MODERATION_SCHEMA, True), True),
        StructField("detoxify_moderation", ArrayType(DETOXIFY_MODERATION_SCHEMA, True), True),
        StructField("toxic", BooleanType(), True),
        StructField("redacted", BooleanType(), True),
        StructField("state", StringType(), True),
        StructField("country", StringType(), True),
        StructField("hashed_ip", StringType(), True),
        StructField("header", HEADER_SCHEMA, True),
    ]
)


CLEANED_WILDCHAT_SCHEMA = StructType(
    [
        StructField("event_timestamp", TimestampType(), True),
        StructField("event_date", DateType(), True),
        StructField("country_clean", StringType(), True),
        StructField("hash_map_id", StringType(), True),
        StructField("moderation_flag", BooleanType(), True),
        StructField("turns", IntegerType(), True),
        StructField("conversation_type", StringType(), True),
        StructField("toxicity_factor", DoubleType(), True),
        StructField("model", StringType(), True),
        StructField("language", StringType(), True),
        StructField("state", StringType(), True),
        StructField("redacted", BooleanType(), True),
        StructField("hashed_ip", StringType(), True),
        StructField("conversation_text", StringType(), True),
        StructField("has_missing_values", BooleanType(), True),
        StructField("valid_timestamp", BooleanType(), True),
        StructField("valid_country", BooleanType(), True),
        StructField("conversation_length", IntegerType(), True),
        StructField("long_conversation", BooleanType(), True),
        StructField("short_conversation", BooleanType(), True),
        StructField("excessive_turns", BooleanType(), True),
        StructField("moderation_present", BooleanType(), True),
    ]
)


CONVERSATION_FACT_SCHEMA = StructType(
    [
        StructField("conversation_id", StringType(), True),
        StructField("source_conversation_hash", StringType(), True),
        StructField("event_timestamp", TimestampType(), True),
        StructField("event_date", DateType(), True),
        StructField("country_clean", StringType(), True),
        StructField("state", StringType(), True),
        StructField("language", StringType(), True),
        StructField("model", StringType(), True),
        StructField("turn_count", IntegerType(), True),
        StructField("conversation_text", StringType(), True),
        StructField("conversation_type", StringType(), True),
        StructField("summary_text", StringType(), True),
        StructField("toxicity_factor", DoubleType(), True),
        StructField("moderation_flag", BooleanType(), True),
        StructField("redacted", BooleanType(), True),
        StructField("hashed_ip", StringType(), True),
        StructField("translation_status", StringType(), True),
        StructField("translated_language", StringType(), True),
        StructField("tag_version", StringType(), True),
        StructField("topic_cluster_id", StringType(), True),
        StructField("source_run_id", StringType(), True),
        StructField("created_at", TimestampType(), True),
        StructField("updated_at", TimestampType(), True),
    ]
)


CONVERSATION_TURN_SCHEMA = StructType(
    [
        StructField("conversation_id", StringType(), True),
        StructField("turn_id", StringType(), True),
        StructField("turn_index", IntegerType(), True),
        StructField("role", StringType(), True),
        StructField("content", StringType(), True),
        StructField("content_translated", StringType(), True),
        StructField("event_timestamp", TimestampType(), True),
        StructField("language", StringType(), True),
        StructField("translated_language", StringType(), True),
        StructField("country_clean", StringType(), True),
        StructField("state", StringType(), True),
        StructField("model", StringType(), True),
        StructField("toxic", BooleanType(), True),
        StructField("redacted", BooleanType(), True),
        StructField("turn_identifier", LongType(), True),
        StructField("source_run_id", StringType(), True),
        StructField("created_at", TimestampType(), True),
    ]
)


CONVERSATION_ANNOTATION_SCHEMA = StructType(
    [
        StructField("annotation_id", StringType(), True),
        StructField("conversation_id", StringType(), True),
        StructField("turn_id", StringType(), True),
        StructField("annotator_id", StringType(), True),
        StructField("annotation_type", StringType(), True),
        StructField("annotation_label", StringType(), True),
        StructField("annotation_value", StringType(), True),
        StructField("confidence", DoubleType(), True),
        StructField("notes", StringType(), True),
        StructField("taxonomy_version", StringType(), True),
        StructField("status", StringType(), True),
        StructField("created_at", TimestampType(), True),
        StructField("updated_at", TimestampType(), True),
    ]
)


TOPIC_CLUSTER_SCHEMA = StructType(
    [
        StructField("topic_cluster_id", StringType(), True),
        StructField("cluster_label", StringType(), True),
        StructField("cluster_description", StringType(), True),
        StructField("keywords", ArrayType(StringType(), True), True),
        StructField("language", StringType(), True),
        StructField("country_clean", StringType(), True),
        StructField("model_version", StringType(), True),
        StructField("created_at", TimestampType(), True),
        StructField("updated_at", TimestampType(), True),
    ]
)


COUNTRY_DAILY_METRICS_SCHEMA = StructType(
    [
        StructField("event_date", DateType(), True),
        StructField("country_clean", StringType(), True),
        StructField("state", StringType(), True),
        StructField("language", StringType(), True),
        StructField("model", StringType(), True),
        StructField("conversation_count", LongType(), True),
        StructField("turn_count", LongType(), True),
        StructField("avg_turn_depth", DoubleType(), True),
        StructField("gpt35_count", LongType(), True),
        StructField("gpt4_count", LongType(), True),
        StructField("redacted_count", LongType(), True),
        StructField("toxic_count", LongType(), True),
        StructField("adoption_rate", DoubleType(), True),
        StructField("source_run_id", StringType(), True),
    ]
)


ETL_RUN_LOG_SCHEMA = StructType(
    [
        StructField("run_id", StringType(), True),
        StructField("pipeline_name", StringType(), True),
        StructField("input_path", StringType(), True),
        StructField("output_path", StringType(), True),
        StructField("schema_version", StringType(), True),
        StructField("started_at", TimestampType(), True),
        StructField("finished_at", TimestampType(), True),
        StructField("status", StringType(), True),
        StructField("input_row_count", LongType(), True),
        StructField("output_row_count", LongType(), True),
        StructField("error_row_count", LongType(), True),
        StructField("notes", StringType(), True),
    ]
)


SCHEMA_REGISTRY = {
    "raw_wildchat": RAW_WILDCHAT_SCHEMA,
    "cleaned_wildchat": CLEANED_WILDCHAT_SCHEMA,
    "conversation_fact": CONVERSATION_FACT_SCHEMA,
    "conversation_turn": CONVERSATION_TURN_SCHEMA,
    "conversation_annotation": CONVERSATION_ANNOTATION_SCHEMA,
    "topic_cluster": TOPIC_CLUSTER_SCHEMA,
    "country_daily_metrics": COUNTRY_DAILY_METRICS_SCHEMA,
    "etl_run_log": ETL_RUN_LOG_SCHEMA,
}


def get_schema(name: str) -> StructType:
    """Return a named schema from the registry."""

    return SCHEMA_REGISTRY[name]


def schema_names() -> list[str]:
    """Return the available schema names in sorted order."""

    return sorted(SCHEMA_REGISTRY)