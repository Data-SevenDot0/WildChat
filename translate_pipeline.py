"""
translate_pipeline.py  —  Anthropic Batch API, parallel edition

Submits all partitions as simultaneous batches, polls them together,
and writes each partition's output as its batch completes.

Usage:
    from translate_pipeline import run_all
    import glob

    parts = sorted(glob.glob("data/WildChatData/s2_workfile_cleaned.parquet/part-*.parquet"))
    run_all(parts, "data/WildChatData/translated", spark)
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path

import anthropic
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, monotonically_increasing_id, to_json, from_json
from pyspark.sql.types import StringType


_PROMPT = (
    "Translate every message in this conversation to English. "
    "Return ONLY a valid JSON array with the exact same structure — "
    "each object must have 'role' and 'content' keys. "
    "Preserve code blocks, URLs, proper nouns, and all formatting exactly. "
    "No explanation. No markdown fences. No preamble."
)

_POLL_SECS   = 60
_CHUNK_SIZE  = 1000  # rows per HTTP request to avoid Cloudflare 502s on large payloads


# ── Helpers ──────────────────────────────────────────────────────────────────

def _strip_fences(text: str) -> str:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    return m.group(1).strip() if m else text


def _submit_one_batch(client: anthropic.Anthropic, rows: list[dict], max_retries: int = 5) -> str:
    """Submit one batch. rows: list of {custom_id, conversation_json}. Returns batch_id."""
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
            print(f"    Attempt {attempt + 1}/{max_retries} failed — retrying in {wait}s: {e}")
            time.sleep(wait)
    raise RuntimeError(f"Batch submission failed after {max_retries} attempts")


def _collect_batch_results(client: anthropic.Anthropic, batch_id: str) -> tuple[dict, dict]:
    """Pull results for a completed batch. Returns (results, errors) keyed by custom_id."""
    results, errors = {}, {}
    for item in client.messages.batches.results(batch_id):
        if item.result.type == "succeeded":
            results[item.custom_id] = item.result.message.content[0].text
        else:
            errors[item.custom_id] = str(item.result.error)
    return results, errors


# ── Phase 1: Submit all batches ───────────────────────────────────────────────

def _submit_all(client, input_paths, out_dir, spark):
    """
    Read every partition, drop moderation columns, collect non-English rows,
    chunk into _CHUNK_SIZE sub-batches to avoid 502s on large payloads,
    and submit all chunks. Returns manifest dict and per-partition data.
    """
    manifest  = {}   # batch_id -> {idx, chunk, input_path, output_path}
    part_data = {}   # batch_id -> {id_to_hash}
    part_meta = {}   # idx -> {foreign_df, eng_df, conv_schema, batch_ids, output_path}

    for idx, input_path in enumerate(input_paths):
        print(f"  [{idx+1:02d}/{len(input_paths)}] Reading   {Path(input_path).name}")
        df = spark.read.parquet(input_path)

        mod_cols = [c for c in df.columns if "moderation" in c.lower()]
        df = df.drop(*mod_cols)

        conv_schema = df.schema["conversation"].dataType
        df = df.withColumn("_id", monotonically_increasing_id().cast(StringType()))

        eng_df     = df.filter(col("language") == "English").withColumn(
                         "conversation_en", lit(None).cast(conv_schema))
        foreign_df = df.filter(col("language") != "English")
        n_foreign  = foreign_df.count()

        output_path = str(Path(out_dir) / f"part-{idx:05d}.parquet")

        if n_foreign == 0:
            print(f"           No non-English rows — writing directly.")
            _write(eng_df.drop("_id"), output_path)
            continue

        payload = (
            foreign_df
            .select("_id", "conversation_hash", to_json(col("conversation")).alias("conv_json"))
            .collect()
        )
        id_to_hash = {r["_id"]: r["conversation_hash"] for r in payload}
        rows       = [{"custom_id": r["_id"], "conversation_json": r["conv_json"]} for r in payload]

        # Split into chunks to keep each HTTP request small
        chunks     = [rows[i: i + _CHUNK_SIZE] for i in range(0, len(rows), _CHUNK_SIZE)]
        batch_ids  = []
        print(f"           {n_foreign:,} rows → {len(chunks)} chunk(s) of ≤{_CHUNK_SIZE}")

        for chunk_idx, chunk in enumerate(chunks):
            batch_id = _submit_one_batch(client, chunk)
            print(f"             chunk {chunk_idx+1:02d}/{len(chunks)}  batch_id={batch_id}")
            batch_ids.append(batch_id)
            manifest[batch_id]  = {"idx": idx, "chunk": chunk_idx, "output_path": output_path}
            part_data[batch_id] = {"id_to_hash": id_to_hash}

        part_meta[idx] = {
            "foreign_df":  foreign_df,
            "eng_df":      eng_df,
            "conv_schema": conv_schema,
            "output_path": output_path,
            "batch_ids":   batch_ids,
            "pending_ids": set(batch_ids),
            "all_results": {},
            "all_errors":  {},
        }

    return manifest, part_data, part_meta


# ── Phase 2: Poll all chunks, accumulate results, write when partition done ───

def _poll_and_write(client, manifest, part_data, part_meta, out_dir, spark):
    pending = dict(manifest)  # batch_id -> info
    out_dir_p = Path(out_dir)

    while pending:
        time.sleep(_POLL_SECS)
        now = datetime.now().strftime("%H:%M:%S")
        n_total = len(manifest)
        print(f"\n{'─'*60}")
        print(f"  Status  {now}  —  {len(pending)}/{n_total} chunks remaining")
        print(f"{'─'*60}")

        completed = []
        for batch_id, info in pending.items():
            batch  = client.messages.batches.retrieve(batch_id)
            c      = batch.request_counts
            status = batch.processing_status
            marker = "✓" if status == "ended" else "…"
            print(f"  {marker} Part {info['idx']+1:02d} chunk {info['chunk']+1:02d}  "
                  f"{status:12s}  "
                  f"succeeded={c.succeeded:<6} errored={c.errored:<6} processing={c.processing}")
            if status == "ended":
                completed.append(batch_id)

        # Collect completed chunks and accumulate into their partition
        for batch_id in completed:
            info  = pending.pop(batch_id)
            idx   = info["idx"]
            meta  = part_meta[idx]
            id_to_hash = part_data[batch_id]["id_to_hash"]

            raw_results, api_errors = _collect_batch_results(client, batch_id)
            meta["all_results"].update(raw_results)
            meta["all_errors"].update({id_to_hash.get(k, k): v for k, v in api_errors.items()})
            meta["pending_ids"].discard(batch_id)

            # All chunks for this partition are done — write it out
            if not meta["pending_ids"]:
                print(f"\n  All chunks done for partition {idx+1:02d} — writing ...")
                _write_partition(meta, idx, out_dir_p, spark)

    print(f"\n{'─'*60}")
    print(f"  All {len(manifest)} chunks complete.")
    print(f"{'─'*60}\n")


def _write_partition(meta, idx, out_dir_p, spark):
    raw_results = meta["all_results"]
    api_errors  = meta["all_errors"]

    if api_errors:
        f = out_dir_p / f"api_errors_part{idx:05d}.json"
        f.write_text(json.dumps(api_errors, indent=2))
        print(f"    !! {len(api_errors):,} API errors — {f}")

    clean, parse_errors = [], {}
    for custom_id, raw in raw_results.items():
        stripped = _strip_fences(raw)
        try:
            json.loads(stripped)
            clean.append((custom_id, stripped))
        except json.JSONDecodeError as e:
            parse_errors[custom_id] = f"{e} | raw[:200]: {raw[:200]}"

    if parse_errors:
        f = out_dir_p / f"parse_errors_part{idx:05d}.json"
        f.write_text(json.dumps(parse_errors, indent=2))
        print(f"    !! {len(parse_errors):,} parse errors — {f}")

    print(f"    succeeded={len(clean):,}  api_errors={len(api_errors):,}  parse_errors={len(parse_errors):,}")

    conv_schema = meta["conv_schema"]
    trans_df = (
        spark.createDataFrame(clean, ["_id", "_conv_en_json"])
             .withColumn("conversation_en", from_json(col("_conv_en_json"), conv_schema))
             .drop("_conv_en_json")
    )

    foreign_translated = meta["foreign_df"].join(trans_df, on="_id", how="left").drop("_id")
    combined           = foreign_translated.unionByName(meta["eng_df"].drop("_id"))
    _write(combined, meta["output_path"])
    print(f"    Written → {meta['output_path']}")


# ── Writer ────────────────────────────────────────────────────────────────────

def _write(df, output_path: str) -> None:
    cols    = [c for c in df.columns if c != "conversation_en"]
    idx     = cols.index("conversation")
    ordered = cols[: idx + 1] + ["conversation_en"] + cols[idx + 1 :]
    df.select(ordered).write.mode("overwrite").parquet(output_path)


# ── Entry point ───────────────────────────────────────────────────────────────

def run_all(input_paths: list[str], out_dir: str, spark: SparkSession) -> None:
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  PHASE 1 — Submitting {len(input_paths)} batches")
    print(f"{'='*60}\n")
    manifest, part_data, part_meta = _submit_all(client, input_paths, out_dir, spark)

    # Save manifest so batches can be recovered if the kernel dies
    manifest_file = Path(out_dir) / "batch_manifest.json"
    manifest_file.write_text(json.dumps(manifest, indent=2))
    print(f"\n  Manifest saved to {manifest_file}")
    print(f"  {len(manifest)} chunks in flight across {len(part_meta)} partitions\n")

    print(f"{'='*60}")
    print(f"  PHASE 2 — Polling every {_POLL_SECS}s, writing as partitions complete")
    print(f"{'='*60}")
    _poll_and_write(client, manifest, part_data, part_meta, out_dir, spark)