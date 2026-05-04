"""
translate_pipeline.py

Mini-pipeline per parquet partition:
  1. Drop moderation columns
  2. Translate non-English conversations via Anthropic Batch API
  3. Write output with conversation_en immediately after conversation

Usage (from notebook or CLI):
    from translate_pipeline import run
    run("data/WildChatData/s2_workfile_cleaned.parquet/part-00000-*.parquet",
        "data/WildChatData/translated/part-00000.parquet",
        spark)
"""

import json
import re
import time
from pathlib import Path

import anthropic
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, monotonically_increasing_id, to_json, from_json
from pyspark.sql.types import StringType


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_PROMPT = (
    "Translate every message in this conversation to English. "
    "Return ONLY a valid JSON array with the exact same structure — "
    "each object must have 'role' and 'content' keys. "
    "Preserve code blocks, URLs, proper nouns, and all formatting exactly. "
    "No explanation. No markdown fences. No preamble."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_fences(text: str) -> str:
    """Remove markdown code fences if the model adds them anyway."""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    return m.group(1).strip() if m else text


def _submit_batch(client: anthropic.Anthropic, rows: list[dict], max_retries: int = 5) -> str:
    """rows: list of {custom_id, conversation_json}. Returns batch_id."""
    requests = [
        {
            "custom_id": r["custom_id"],
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 8192,
                "messages": [
                    {"role": "user", "content": f"{_PROMPT}\n\n{r['conversation_json']}"}
                ],
            },
        }
        for r in rows
    ]
    for attempt in range(max_retries):
        try:
            batch = client.messages.batches.create(requests=requests, timeout=120)
            return batch.id
        except (anthropic.InternalServerError, anthropic.APITimeoutError, anthropic.APIConnectionError) as e:
            wait = 2 ** attempt
            print(f"  Attempt {attempt + 1}/{max_retries} failed — retrying in {wait}s: {e}")
            time.sleep(wait)
    raise RuntimeError(f"Batch submission failed after {max_retries} attempts")


def _wait_for_batch(client: anthropic.Anthropic, batch_id: str, poll_secs: int = 30) -> tuple[dict, dict]:
    """Poll until complete. Returns (results, errors) both keyed by custom_id."""
    print(f"  Polling batch {batch_id} every {poll_secs}s ...")
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        c = batch.request_counts
        print(f"    {batch.processing_status} — "
              f"succeeded={c.succeeded}  errored={c.errored}  processing={c.processing}")
        if batch.processing_status == "ended":
            break
        time.sleep(poll_secs)

    results, errors = {}, {}
    for item in client.messages.batches.results(batch_id):
        if item.result.type == "succeeded":
            results[item.custom_id] = item.result.message.content[0].text
        else:
            errors[item.custom_id] = str(item.result.error)

    return results, errors


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run(input_path: str, output_path: str, spark: SparkSession) -> None:
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    out_dir = Path(output_path).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. Read ──────────────────────────────────────────────────────────
    print(f"\n[1/6] Reading {input_path}")
    df = spark.read.parquet(input_path)

    # ── 2. Drop moderation columns ───────────────────────────────────────
    mod_cols = [c for c in df.columns if "moderation" in c.lower()]
    df = df.drop(*mod_cols)
    print(f"[2/6] Dropped moderation columns: {mod_cols}")

    conv_schema = df.schema["conversation"].dataType

    # ── 3. Split English / non-English ───────────────────────────────────
    # Use a stable synthetic key so we can join results back without
    # relying on conversation_hash uniqueness guarantees.
    df = df.withColumn("_id", monotonically_increasing_id().cast(StringType()))

    eng_df = (
        df.filter(col("language") == "English")
          .withColumn("conversation_en", lit(None).cast(conv_schema))
    )
    foreign_df = df.filter(col("language") != "English")
    n_foreign = foreign_df.count()
    print(f"[3/6] Non-English rows to translate: {n_foreign:,}")

    if n_foreign == 0:
        print("  Nothing to translate — writing as-is.")
        _write(eng_df.drop("_id"), conv_schema, output_path)
        return

    # ── 4. Collect and submit batch ──────────────────────────────────────
    print("[4/6] Collecting conversations for batch submission ...")
    payload = (
        foreign_df
        .select("_id", "conversation_hash", to_json(col("conversation")).alias("conv_json"))
        .collect()
    )
    id_to_hash = {r["_id"]: r["conversation_hash"] for r in payload}
    rows = [{"custom_id": r["_id"], "conversation_json": r["conv_json"]} for r in payload]

    print(f"  Submitting {len(rows):,} requests ...")
    batch_id = _submit_batch(client, rows)
    # Persist batch ID so you can recover results if the process dies
    batch_id_file = out_dir / "batch_id.txt"
    batch_id_file.write_text(batch_id)
    print(f"  Batch ID: {batch_id}  (saved to {batch_id_file})")

    # ── 5. Wait and collect results ──────────────────────────────────────
    print("[5/6] Waiting for batch to complete ...")
    results, api_errors = _wait_for_batch(client, batch_id)

    # Surface every failure — nothing silent
    if api_errors:
        err_out = {id_to_hash.get(k, k): v for k, v in api_errors.items()}
        err_file = out_dir / "translation_errors.json"
        err_file.write_text(json.dumps(err_out, indent=2))
        print(f"\n  !! {len(api_errors):,} API failures — see {err_file}")

    # Validate JSON in every successful response
    clean, parse_errors = [], {}
    for custom_id, raw in results.items():
        cleaned = _strip_fences(raw)
        try:
            json.loads(cleaned)
            clean.append((custom_id, cleaned))
        except json.JSONDecodeError as exc:
            parse_errors[id_to_hash.get(custom_id, custom_id)] = (
                f"JSONDecodeError: {exc} | raw[:300]: {raw[:300]}"
            )

    if parse_errors:
        pe_file = out_dir / "translation_parse_errors.json"
        pe_file.write_text(json.dumps(parse_errors, indent=2))
        print(f"  !! {len(parse_errors):,} JSON parse failures — see {pe_file}")

    print(f"\n  Summary: {len(clean):,} clean  |  "
          f"{len(api_errors):,} API errors  |  "
          f"{len(parse_errors):,} parse errors  |  "
          f"{n_foreign - len(clean) - len(api_errors) - len(parse_errors):,} other")

    # ── 6. Rebuild DataFrame and write ──────────────────────────────────
    print("[6/6] Joining translations and writing output ...")

    trans_df = (
        spark.createDataFrame(clean, ["_id", "_conv_en_json"])
             .withColumn("conversation_en", from_json(col("_conv_en_json"), conv_schema))
             .drop("_conv_en_json")
    )

    # Left join so rows with failed translations keep conversation_en = null
    # (explicit null is visible; nothing is silently dropped)
    foreign_translated = foreign_df.join(trans_df, on="_id", how="left").drop("_id")
    combined = foreign_translated.unionByName(eng_df.drop("_id"))

    _write(combined, conv_schema, output_path)
    print(f"  Written to {output_path}\n")


def _write(df, conv_schema, output_path: str) -> None:
    """Reorder columns so conversation_en is adjacent to conversation, then write."""
    cols = [c for c in df.columns if c != "conversation_en"]
    idx = cols.index("conversation")
    ordered = cols[: idx + 1] + ["conversation_en"] + cols[idx + 1 :]
    df.select(ordered).write.mode("overwrite").parquet(output_path)
