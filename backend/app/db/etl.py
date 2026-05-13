"""
One-time ETL: load conversation metadata from the parquet file into Postgres.
Runs in a background thread at startup; subsequent startups are instant because
the table already has rows (INSERT ... ON CONFLICT DO NOTHING).
"""
import json
import logging
import threading
from pathlib import Path

import pyarrow.parquet as pq
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import SessionLocal
from app.models.wildchat_conversation import WildchatConversation

logger = logging.getLogger(__name__)

# Set once the ETL finishes so _match_keywords knows the table is ready.
etl_ready = threading.Event()


def _find_parquet() -> Path:
    root = Path(__file__).parents[3]
    candidates = [
        root / "data"        / "WildChatData" / "combined_data_tagged.parquet",
        root / "Step_0_Data" / "WildChatData" / "combined_data_tagged.parquet",
    ]
    for p in candidates:
        if p.exists():
            return p
    return candidates[0]

_SLIM_COLS = [
    "conversation_hash", "model", "language", "country", "state",
    "turn", "timestamp", "redacted", "toxic", "tags",
]


def _flatten_tags(tags_val) -> str:
    if not tags_val:
        return ""
    if isinstance(tags_val, list):
        return " ".join(str(t) for t in tags_val).lower()
    if isinstance(tags_val, str):
        try:
            return " ".join(str(t) for t in json.loads(tags_val)).lower()
        except Exception:
            return tags_val.lower()
    return ""


def run_etl() -> None:
    db = SessionLocal()
    try:
        existing = db.query(WildchatConversation.conversation_hash).limit(1).first()
        if existing:
            logger.info("wildchat_conversation already populated — skipping ETL")
            etl_ready.set()
            return

        parquet_path = _find_parquet()
        logger.info("Starting parquet → Postgres ETL for conversation metadata …")
        pf = pq.ParquetFile(parquet_path)
        total_rgs = pf.metadata.num_row_groups
        inserted = 0

        for rg_idx in range(total_rgs):
            batch = pf.read_row_group(rg_idx, columns=_SLIM_COLS).to_pydict()
            n = len(batch["conversation_hash"])
            rows = []
            for i in range(n):
                ts = batch["timestamp"][i]
                rows.append({
                    "conversation_hash": batch["conversation_hash"][i],
                    "model":    (batch["model"][i] or ""),
                    "language": (batch["language"][i] or ""),
                    "country":  (batch["country"][i] or ""),
                    "state":    batch["state"][i] or None,
                    "turn_count": int(batch["turn"][i]) if batch["turn"][i] is not None else 0,
                    "timestamp": ts if ts is not None else None,
                    "redacted": bool(batch["redacted"][i]) if batch["redacted"][i] is not None else False,
                    "toxic":    bool(batch["toxic"][i]) if batch["toxic"][i] is not None else False,
                    "tags_text": _flatten_tags(batch["tags"][i]),
                })

            if rows:
                stmt = pg_insert(WildchatConversation.__table__).on_conflict_do_nothing(
                    index_elements=["conversation_hash"]
                )
                db.execute(stmt, rows)
                db.commit()
                inserted += n

            pct = round((rg_idx + 1) / total_rgs * 100)
            if pct % 10 == 0 or rg_idx == total_rgs - 1:
                logger.info("ETL progress: %d%% (%d rows)", pct, inserted)

        logger.info("ETL complete — %d rows loaded into wildchat_conversation", inserted)
    except Exception:
        logger.exception("ETL failed")
    finally:
        db.close()
        etl_ready.set()  # Unblock matching even on failure so the server stays usable


def start_etl_background() -> None:
    threading.Thread(target=run_etl, daemon=True, name="conv-etl").start()
