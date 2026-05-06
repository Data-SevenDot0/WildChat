# WildChat
This capstone project challenges your team to build a complete data engineering pipeline using real-world conversational AI data. You will extract, transform, load, analyze, and visualize insights from the WildChat-1M dataset—a large collection of user interactions with AI systems hosted on HuggingFace.

## Cleaning Pipeline

Use [clean_dataset.py](clean_dataset.py) to flatten the raw parquet shards into an analysis-ready dataset.

Example:

```bash
python clean_dataset.py --input ./data --output ./data/cleaned
```

The cleaned output includes:

- `event_timestamp` and `event_date`
- `country_clean`
- `hash_map_id`
- `moderation_flag`
- `turns`
- `conversation_type`
- `toxicity_factor`
- `model`, `language`, `state`, `redacted`, and `hashed_ip`

## Schema First

The project now keeps its canonical Spark schemas in [schemas.py](schemas.py). The first layer mirrors the raw WildChat parquet shard structure, and the downstream tables are organized so future translated and tagged imports can flow into:

- a conversation fact table for search, previews, model comparisons, and geo filters
- a turn table for turn-depth analysis and conversation flow
- an annotation table for human tagging and review workflows
- topic cluster and ETL run-log tables for analysis and pipeline governance

The current cleaned parquet output already matches the cleaned conversation schema, so you can treat that as the first contract before any new imports are added.
