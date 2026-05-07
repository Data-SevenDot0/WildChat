"""
WildChat data endpoints — reads combined_data_tagged.parquet.
Slim DataFrame (no conversation text) is loaded once at first request and cached.
Individual conversation detail is fetched on-demand via PyArrow predicate filter.
"""
import json
import threading
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd
import pyarrow.parquet as pq
from fastapi import APIRouter, HTTPException, Query

data_router = APIRouter(prefix="/data", tags=["wildchat-data"])

# ── Paths ──────────────────────────────────────────────────────────────────────

PARQUET_PATH = (
    Path(__file__).parents[3] / "Step_0_Data" / "WildChatData" / "combined_data_tagged.parquet"
)

SLIM_COLS = [
    "conversation_hash", "model", "timestamp", "turn",
    "language", "toxic", "redacted", "state", "country", "tags",
]

TOPIC_CATEGORIES: dict[str, list[str]] = {
    "Coding / tech": [
        "python code", "javascript frontend", "lua roblox scripting",
        "cpp java systems code", "sql database", "cybersecurity",
        "data science ml ai", "excel powerbi data tools", "cloud devops",
        "api rest integration", "networking sysadmin it", "software architecture",
        "coding interview prep", "json data formats", "midjourney image generation",
        "chatbot persona setup", "chatgpt jailbreak",
    ],
    "Writing": [
        "fiction short stories", "sports creative writing", "ddlc fanfiction",
        "world building lore", "summarize paraphrase rewrite", "youtube content creation",
        "marketing seo copywriting", "dialogue scripts screenplays",
        "social media reply generation", "email business writing", "essay academic writing",
        "etsy ecommerce listings", "grammar proofreading", "resume cv job application",
        "anime manga fanfiction", "western media fanfiction",
    ],
    "Research / info": [
        "history civilizations", "philosophy ethics", "psychology behavior",
        "politics current events", "health medical", "mental health therapy",
        "nutrition fitness diet", "travel tourism geography", "food recipes cooking",
        "finance investing crypto", "legal contracts compliance",
        "education curriculum teaching", "career development workplace",
        "religion spirituality", "image generation art design", "photography editing",
        "music lyrics production", "video games", "tabletop rpg dnd",
        "relationship dating social", "greeting casual chat",
        "productivity self improvement", "ai model identity questions",
        "astrology tarot esoteric", "parenting children education",
    ],
    "Translation": [
        "translation multilingual", "language learning", "language simplification",
    ],
    "Math / science": [
        "math algebra calculus", "science biology physics chemistry",
    ],
}

# Build reverse lookup once
_TAG_TO_CATEGORY: dict[str, str] = {
    tag: cat for cat, tags in TOPIC_CATEGORIES.items() for tag in tags
}

# ── Data cache ─────────────────────────────────────────────────────────────────

_df: Optional[pd.DataFrame] = None
_lock = threading.Lock()
_stats_cache: dict = {}


def _load_df() -> pd.DataFrame:
    global _df
    if _df is None:
        with _lock:
            if _df is None:
                _df = pd.read_parquet(PARQUET_PATH, columns=SLIM_COLS)
                _df["timestamp"] = pd.to_datetime(_df["timestamp"], utc=True)
    return _df


def _get_stats() -> dict:
    """Compute and cache all aggregated stats (runs once)."""
    if _stats_cache:
        return _stats_cache

    df = _load_df()
    total = len(df)

    # Overview
    lang_counts = df["language"].value_counts()
    _stats_cache["overview"] = {
        "total_conversations": total,
        "total_languages": int(df["language"].nunique()),
        "avg_turns": round(float(df["turn"].mean()), 1),
        "max_turns": int(df["turn"].max()),
        "redacted_count": int(df["redacted"].sum()),
        "redacted_pct": round(float(df["redacted"].mean()) * 100, 2),
        "total_models": int(df["model"].nunique()),
        "total_countries": int(df["country"].nunique()),
        "date_from": df["timestamp"].min().isoformat(),
        "date_to": df["timestamp"].max().isoformat(),
        "top_language": str(lang_counts.index[0]),
        "top_language_pct": round(float(lang_counts.iloc[0]) / total * 100, 1),
    }

    # Topics
    cat_counts: dict[str, int] = {c: 0 for c in TOPIC_CATEGORIES}
    cat_counts["Other"] = 0
    for tags_str in df["tags"].dropna():
        for tag in json.loads(tags_str):
            cat_counts[_TAG_TO_CATEGORY.get(tag, "Other")] += 1
    topic_total = sum(cat_counts.values())
    _stats_cache["topics"] = [
        {"category": cat, "count": cnt, "pct": round(cnt / topic_total * 100, 1)}
        for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1])
    ]

    # Languages
    _stats_cache["languages"] = [
        {"language": lang, "count": int(c), "pct": round(c / total * 100, 1)}
        for lang, c in lang_counts.items()
    ]

    # Models
    model_stats = (
        df.groupby("model")
        .agg(count=("turn", "count"), avg_turns=("turn", "mean"))
        .reset_index()
        .sort_values("count", ascending=False)
    )
    _stats_cache["models"] = [
        {
            "model": row["model"],
            "count": int(row["count"]),
            "pct": round(row["count"] / total * 100, 1),
            "avg_turns": round(float(row["avg_turns"]), 1),
        }
        for _, row in model_stats.iterrows()
    ]

    # Countries
    country_counts = df["country"].value_counts()
    _stats_cache["countries"] = [
        {"country": c, "count": int(n), "pct": round(n / total * 100, 1)}
        for c, n in country_counts.items()
    ]

    # Summary stats
    gpt35_mask = df["model"].str.startswith("gpt-3.5")
    gpt4_mask = df["model"].str.startswith("gpt-4")
    en_pct = round(float((df["language"] == "English").mean()) * 100, 1)
    us_pct = round(float((df["country"] == "United States").mean()) * 100, 1)
    _stats_cache["summary"] = {
        "gpt35_avg_turns": round(float(df.loc[gpt35_mask, "turn"].mean()), 1),
        "gpt4_avg_turns": round(float(df.loc[gpt4_mask, "turn"].mean()), 1),
        "english_share_pct": en_pct,
        "us_share_pct": us_pct,
    }

    return _stats_cache


# ── Endpoints ──────────────────────────────────────────────────────────────────

@data_router.get("/overview")
def get_overview():
    return _get_stats()["overview"]


@data_router.get("/topics")
def get_topics():
    return _get_stats()["topics"]


@data_router.get("/languages")
def get_languages(limit: int = Query(20, ge=1, le=100)):
    return _get_stats()["languages"][:limit]


@data_router.get("/models")
def get_models():
    return _get_stats()["models"]


@data_router.get("/countries")
def get_countries(limit: int = Query(50, ge=1, le=250)):
    return _get_stats()["countries"][:limit]


@data_router.get("/summary")
def get_summary():
    return _get_stats()["summary"]


@data_router.get("/conversations")
def get_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    model: Optional[str] = None,
    language: Optional[str] = None,
    country: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    redacted_only: bool = False,
    search: Optional[str] = None,
):
    df = _load_df()

    if model:
        df = df[df["model"] == model]
    if language:
        df = df[df["language"] == language]
    if country:
        df = df[df["country"] == country]
    if redacted_only:
        df = df[df["redacted"]]
    if date_from:
        df = df[df["timestamp"] >= pd.Timestamp(date_from, tz="UTC")]
    if date_to:
        df = df[df["timestamp"] <= pd.Timestamp(date_to, tz="UTC")]
    if search:
        df = df[df["conversation_hash"].str.contains(search, case=False, na=False)]

    total = len(df)
    start = (page - 1) * per_page
    page_df = df.iloc[start : start + per_page]

    records = [
        {
            "conversation_hash": row["conversation_hash"][:8] + "...",
            "full_hash": row["conversation_hash"],
            "model": row["model"],
            "language": row["language"],
            "turns": int(row["turn"]),
            "country": row["country"],
            "state": row["state"] if pd.notna(row["state"]) else "",
            "redacted": bool(row["redacted"]),
            "toxic": bool(row["toxic"]),
            "timestamp": row["timestamp"].isoformat() if pd.notna(row["timestamp"]) else None,
            "tags": json.loads(row["tags"]) if row["tags"] else [],
        }
        for _, row in page_df.iterrows()
    ]

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "data": records,
    }


@data_router.get("/conversations/{hash}")
def get_conversation(hash: str):
    try:
        table = pq.read_table(
            PARQUET_PATH,
            filters=[("conversation_hash", "=", hash)],
            columns=["conversation_hash", "conversation", "model", "language",
                     "turn", "country", "redacted", "toxic", "timestamp", "tags"],
        )
        if table.num_rows == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")

        row = table.to_pydict()
        conv_raw = row["conversation"][0]

        messages = []
        if conv_raw:
            for msg in conv_raw:
                role = msg.get("role", "") if isinstance(msg, dict) else ""
                content = msg.get("content", "") if isinstance(msg, dict) else str(msg)
                messages.append({"role": role, "content": content or ""})

        ts = row["timestamp"][0]
        return {
            "conversation_hash": row["conversation_hash"][0],
            "model": row["model"][0],
            "language": row["language"][0],
            "turns": int(row["turn"][0]),
            "country": row["country"][0],
            "redacted": bool(row["redacted"][0]),
            "toxic": bool(row["toxic"][0]),
            "timestamp": ts.isoformat() if ts else None,
            "tags": json.loads(row["tags"][0]) if row["tags"][0] else [],
            "messages": messages,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
