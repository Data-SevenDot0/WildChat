#!/usr/bin/env python3
"""Translate conversation texts to a target language (default: English).

This script reads the cleaned conversations (table or parquet), translates
non-target-language rows using a provider (googletrans by default), and
writes an updated table `wildchat.cleaned_wildchat_translated` with columns:
  - conversation_text_translated (target language text)
  - translated_language (target language code)
  - translation_provider
  - translation_run_id

Usage examples:
  # Translate from metastore table into English (dry-run shows counts)
  python translate_conversations.py --input-table wildchat.cleaned_wildchat --target en --dry-run

  # Apply and write translated table to metastore
  python translate_conversations.py --input-table wildchat.cleaned_wildchat --target en --apply

Notes:
- Installs: pip install googletrans==4.0.0-rc1
- For production, replace provider with Google Cloud Translate or other API
  and supply credentials via env vars.
"""
from __future__ import annotations

import argparse
import uuid
import os
from datetime import datetime
import time

from pyspark.sql import SparkSession, functions as F

try:
    from googletrans import Translator
except Exception:
    Translator = None


def parse_args():
    p = argparse.ArgumentParser(description="Translate conversations to a target language")
    p.add_argument("--input-table", default="wildchat.cleaned_wildchat", help="Source table or parquet dir")
    p.add_argument("--input-path", help="Alternative: parquet directory path")
    p.add_argument("--target", default="en", help="Target language code (default: en)")
    p.add_argument("--provider", default="googletrans", choices=["googletrans"], help="Translation provider")
    p.add_argument("--apply", action="store_true", help="Write translated table to metastore")
    p.add_argument("--dry-run", action="store_true", help="Only show counts, do not write")
    p.add_argument("--batch-size", type=int, default=1000, help="Number of rows to translate per batch when using pandas")
    return p.parse_args()


def ensure_translator(provider: str):
    if provider == "googletrans":
        if Translator is None:
            raise RuntimeError("googletrans not installed. Install with: pip install googletrans==4.0.0-rc1")
        return Translator()
    raise RuntimeError(f"Unknown provider: {provider}")


def run_translate(df_pandas, translator, target: str):
    # df_pandas must contain 'hash_map_id' and 'conversation_text' and 'language'
    texts = df_pandas["conversation_text"].fillna("").astype(str).tolist()
    langs = df_pandas.get("language", None)

    translated_texts = []
    translated_langs = []

    for i, text in enumerate(texts):
        # retry a few times on transient errors
        attempt = 0
        translated = ""
        tlang = ""
        while attempt < 3:
            try:
                res = translator.translate(text, dest=target)
                translated = res.text
                tlang = getattr(res, "dest", "")
                break
            except Exception:
                attempt += 1
                time.sleep(0.5 * attempt)
        translated_texts.append(translated)
        translated_langs.append(tlang)

    df_pandas["conversation_text_translated"] = translated_texts
    df_pandas["translated_language"] = translated_langs
    return df_pandas


def main():
    args = parse_args()

    spark = (
        SparkSession.builder.appName("wildchat-translate")
        .config("spark.driver.memory", "2g")
        .enableHiveSupport()
        .getOrCreate()
    )

    try:
        if args.input_path:
            df = spark.read.parquet(args.input_path)
        else:
            df = spark.table(args.input_table)

        total = df.count()
        print(f"Source rows: {total}")

        # Only translate rows where language != target (or missing)
        to_translate = df.filter((F.col("language") != args.target) | F.col("language").isNull())
        need_count = to_translate.count()
        print(f"Rows to translate (language != {args.target}): {need_count}")

        if args.dry_run:
            print("Dry-run: exiting without writing")
            return

        translator = ensure_translator(args.provider)

        # Process in batches using pandas for library compatibility.
        # Read the subset to translate into pandas once, then slice it to avoid
        # repeated Spark queries (the previous offset logic was invalid).
        run_id = f"translate_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}"
        translated_rows = []

        pdf_all = to_translate.toPandas()
        if pdf_all.empty:
            print("No rows to translate after filtering.")
            return

        total_rows = len(pdf_all)
        batch = args.batch_size
        for start in range(0, total_rows, batch):
            end = min(start + batch, total_rows)
            pdf = pdf_all.iloc[start:end].copy()
            pdf = run_translate(pdf, translator, args.target)
            pdf["translation_provider"] = args.provider
            pdf["translation_run_id"] = run_id
            pdf["translation_updated_at"] = datetime.utcnow()
            translated_rows.append(pdf)

        if not translated_rows:
            print("No rows translated (all are already in target language).")
            return

        import pandas as pd
        all_translated = pd.concat(translated_rows, ignore_index=True)

        # Create Spark DataFrame from translated subset and join back to original
        trans_spark = spark.createDataFrame(all_translated)
        trans_spark = trans_spark.select("hash_map_id", "conversation_text_translated", "translated_language", "translation_provider", "translation_run_id", "translation_updated_at")

        # Write joined table: left join original df with translations
        joined = df.join(trans_spark, on="hash_map_id", how="left")

        if args.apply:
            out_table = "wildchat.cleaned_wildchat_translated"
            print(f"Writing translated table to {out_table} ...")
            joined.write.mode("overwrite").saveAsTable(out_table)
            print("Write complete")
        else:
            print("Translation complete (in-memory). Re-run with --apply to persist to metastore.")

    finally:
        spark.stop()


if __name__ == "__main__":
    main()
