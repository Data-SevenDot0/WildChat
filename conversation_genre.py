"""Heuristic conversation genre classification for WildChat rows."""

from __future__ import annotations

from functools import reduce

from pyspark.sql import functions as F
from pyspark.sql.column import Column


GENRE_KEYWORDS = {
    "funny": [
        "joke",
        "funny",
        "laugh",
        "humor",
        "hilarious",
        "meme",
        "comedy",
    ],
    "sad": [
        "sad",
        "depress",
        "cry",
        "grief",
        "lonely",
        "heartbroken",
        "loss",
    ],
    "family": [
        "family",
        "mom",
        "mother",
        "dad",
        "father",
        "sister",
        "brother",
        "child",
        "kids",
        "home",
    ],
    "happy": [
        "happy",
        "joy",
        "excited",
        "celebrate",
        "congrats",
        "congratulations",
        "love",
    ],
    "work": [
        "job",
        "career",
        "work",
        "office",
        "meeting",
        "project",
        "manager",
        "client",
        "resume",
    ],
    "business": [
        "business",
        "startup",
        "profit",
        "sales",
        "marketing",
        "revenue",
        "company",
        "entrepreneur",
        "investor",
        "market",
    ],
}


def conversation_text_column(conversation_column: Column) -> Column:
    """Turn the nested conversation array into a lower-cased searchable string."""

    return F.lower(F.concat_ws(" ", F.expr("transform(conversation, x -> x.content)")))


def infer_genre(text_column: Column) -> Column:
    """Assign one genre label based on keyword matches in the conversation text."""

    conditions = []
    for genre, keywords in GENRE_KEYWORDS.items():
        keyword_checks = [F.lower(text_column).contains(keyword) for keyword in keywords]
        if keyword_checks:
            conditions.append((genre, reduce(lambda left, right: left | right, keyword_checks)))

    result = F.lit("other")
    for genre, condition in conditions:
        result = F.when(condition, F.lit(genre)).otherwise(result)

    return result