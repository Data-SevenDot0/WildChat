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
