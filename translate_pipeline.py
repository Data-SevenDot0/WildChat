"""
translate_pipeline.py  —  Helsinki-NLP edition

Drops moderation columns, translates non-English conversations locally using
Helsinki-NLP opus-mt models on Apple Silicon MPS, and writes output parquet
with conversation_en immediately after conversation.

Usage:
    from translate_pipeline import run
    run("data/WildChatData/s2_workfile_cleaned.parquet/part-00000-*.parquet",
        "data/WildChatData/translated/part-00000.parquet", spark)
"""

import json
from collections import defaultdict
from pathlib import Path

import torch
from transformers import MarianMTModel, MarianTokenizer
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, monotonically_increasing_id, to_json, from_json
from pyspark.sql.types import StringType


# ── Device ───────────────────────────────────────────────────────────────────

DEVICE = (
    "mps"  if torch.backends.mps.is_available()  else
    "cuda" if torch.cuda.is_available()          else
    "cpu"
)
print(f"[translate_pipeline] Using device: {DEVICE}")

BATCH_SIZE = 32  # messages per inference batch — reduce if you hit OOM


# ── Language → Helsinki model map ────────────────────────────────────────────
# WildChat stores full language names. Anything not listed falls back to
# opus-mt-mul-en, which covers most European languages.

_LANG_MODELS: dict[str, str] = {
    "Chinese":             "Helsinki-NLP/opus-mt-zh-en",
    "Chinese Simplified":  "Helsinki-NLP/opus-mt-zh-en",
    "Chinese Traditional": "Helsinki-NLP/opus-mt-zh-en",
    "Japanese":            "Helsinki-NLP/opus-mt-ja-en",
    "Korean":              "Helsinki-NLP/opus-mt-ko-en",
    "Arabic":              "Helsinki-NLP/opus-mt-ar-en",
    "Russian":             "Helsinki-NLP/opus-mt-ru-en",
    "Spanish":             "Helsinki-NLP/opus-mt-es-en",
    "French":              "Helsinki-NLP/opus-mt-fr-en",
    "German":              "Helsinki-NLP/opus-mt-de-en",
    "Portuguese":          "Helsinki-NLP/opus-mt-pt-en",
    "Italian":             "Helsinki-NLP/opus-mt-it-en",
    "Dutch":               "Helsinki-NLP/opus-mt-nl-en",
    "Turkish":             "Helsinki-NLP/opus-mt-tr-en",
    "Vietnamese":          "Helsinki-NLP/opus-mt-vi-en",
    "Polish":              "Helsinki-NLP/opus-mt-pl-en",
    "Ukrainian":           "Helsinki-NLP/opus-mt-uk-en",
    "Indonesian":          "Helsinki-NLP/opus-mt-id-en",
    "Romanian":            "Helsinki-NLP/opus-mt-ro-en",
    "Czech":               "Helsinki-NLP/opus-mt-cs-en",
    "Swedish":             "Helsinki-NLP/opus-mt-sv-en",
    "Hebrew":              "Helsinki-NLP/opus-mt-he-en",
    "Persian":             "Helsinki-NLP/opus-mt-fa-en",
    "Hindi":               "Helsinki-NLP/opus-mt-hi-en",
    "Thai":                "Helsinki-NLP/opus-mt-th-en",
}
_DEFAULT_MODEL = "Helsinki-NLP/opus-mt-mul-en"


# ── Translation core ─────────────────────────────────────────────────────────

def _run_model(texts: list[str], model_id: str) -> list[str]:
    """Load model → translate in batches → unload. Returns same-length list."""
    tokenizer = MarianTokenizer.from_pretrained(model_id)
    model = MarianMTModel.from_pretrained(model_id).to(DEVICE)
    model.eval()

    results = []
    for i in range(0, len(texts), BATCH_SIZE):
        chunk = texts[i : i + BATCH_SIZE]
        inputs = tokenizer(
            chunk, return_tensors="pt", padding=True,
            truncation=True, max_length=512
        ).to(DEVICE)
        with torch.no_grad():
            translated = model.generate(**inputs, max_new_tokens=512)
        results.extend(tokenizer.batch_decode(translated, skip_special_tokens=True))

    del model, tokenizer
    if DEVICE == "mps":
        torch.mps.empty_cache()
    return results


def _translate_all(rows: list[dict]) -> tuple[dict, dict]:
    """
    Translate all non-English conversations, grouped by model.

    rows     — list of {"_id": str, "language": str, "conv_json": str}
    returns  — (translated, truncated)
        translated : {_id: [msg_dict, ...]}  — rebuilt conversation
        truncated  : {_id: [msg_indices]}    — messages that likely got cut off
    """
    groups: dict[str, list] = defaultdict(list)
    for row in rows:
        model_id = _LANG_MODELS.get(row["language"], _DEFAULT_MODEL)
        groups[model_id].append(row)

    translated: dict[str, list] = {}
    truncated:  dict[str, list] = {}

    for model_id, group in groups.items():
        langs = {r["language"] for r in group}
        print(f"  {model_id}  →  {len(group):,} conversations  {langs}")

        # Flatten every message across all conversations in this group
        flat_keys:   list[tuple[int, int]] = []   # (row_idx, msg_idx)
        flat_texts:  list[str]             = []
        parsed_convs: list[list[dict]]     = []

        for row_idx, row in enumerate(group):
            msgs = json.loads(row["conv_json"])
            parsed_convs.append(msgs)
            for msg_idx, msg in enumerate(msgs):
                flat_keys.append((row_idx, msg_idx))
                flat_texts.append(msg.get("content") or "")

        translated_texts = _run_model(flat_texts, model_id)

        # Flag likely truncation: translated output < 20% the length of source
        for (row_idx, msg_idx), src, tgt in zip(flat_keys, flat_texts, translated_texts):
            if src and len(src) > 50 and len(tgt) < len(src) * 0.2:
                row_id = group[row_idx]["_id"]
                truncated.setdefault(row_id, []).append(msg_idx)

        # Rebuild conversations — preserve every original field, only swap content
        rebuilt: dict[int, dict[int, str]] = defaultdict(dict)
        for (row_idx, msg_idx), text in zip(flat_keys, translated_texts):
            rebuilt[row_idx][msg_idx] = text

        for row_idx, row in enumerate(group):
            msgs = parsed_convs[row_idx]
            new_msgs = []
            for msg_idx, msg in enumerate(msgs):
                new_msg = dict(msg)
                new_msg["content"] = rebuilt[row_idx].get(msg_idx, msg.get("content"))
                new_msgs.append(new_msg)
            translated[row["_id"]] = new_msgs

    return translated, truncated


# ── Pipeline entry point ─────────────────────────────────────────────────────

def run(input_path: str, output_path: str, spark: SparkSession) -> None:
    out_dir = Path(output_path).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Read
    print(f"\n[1/5] Reading   {input_path}")
    df = spark.read.parquet(input_path)

    # 2. Drop moderation
    mod_cols = [c for c in df.columns if "moderation" in c.lower()]
    df = df.drop(*mod_cols)
    print(f"[2/5] Dropped   {mod_cols or 'none'}")

    conv_schema = df.schema["conversation"].dataType

    # 3. Split English / non-English
    df = df.withColumn("_id", monotonically_increasing_id().cast(StringType()))
    eng_df     = (df.filter(col("language") == "English")
                    .withColumn("conversation_en", lit(None).cast(conv_schema)))
    foreign_df = df.filter(col("language") != "English")
    n_foreign  = foreign_df.count()
    print(f"[3/5] To translate: {n_foreign:,}")

    if n_foreign == 0:
        _write(eng_df.drop("_id"), output_path)
        print("  Nothing to translate — done.")
        return

    # 4. Collect and translate locally
    print("[4/5] Translating locally ...")
    payload = (
        foreign_df
        .select("_id", "language", to_json(col("conversation")).alias("conv_json"))
        .collect()
    )
    rows = [{"_id": r["_id"], "language": r["language"], "conv_json": r["conv_json"]}
            for r in payload]

    translated, truncated = _translate_all(rows)

    # Surface every anomaly — nothing silent
    if truncated:
        f = out_dir / "truncation_warnings.json"
        f.write_text(json.dumps(truncated, indent=2))
        print(f"  !! {len(truncated):,} messages likely truncated — {f}")

    failed = {r["_id"]: r["language"] for r in rows if r["_id"] not in translated}
    if failed:
        f = out_dir / "translation_failures.json"
        f.write_text(json.dumps(failed, indent=2))
        print(f"  !! {len(failed):,} conversations failed entirely — {f}")

    print(f"  translated={len(translated):,}  truncated={len(truncated):,}  failed={len(failed):,}")

    # 5. Join back into Spark and write
    print(f"[5/5] Writing   {output_path}")
    clean = [(row_id, json.dumps(msgs)) for row_id, msgs in translated.items()]

    trans_df = (
        spark.createDataFrame(clean, ["_id", "_conv_en_json"])
             .withColumn("conversation_en", from_json(col("_conv_en_json"), conv_schema))
             .drop("_conv_en_json")
    )

    foreign_translated = foreign_df.join(trans_df, on="_id", how="left").drop("_id")
    combined = foreign_translated.unionByName(eng_df.drop("_id"))
    _write(combined, output_path)
    print("  Done.\n")


def _write(df, output_path: str) -> None:
    cols = [c for c in df.columns if c != "conversation_en"]
    idx  = cols.index("conversation")
    ordered = cols[: idx + 1] + ["conversation_en"] + cols[idx + 1 :]
    df.select(ordered).write.mode("overwrite").parquet(output_path)