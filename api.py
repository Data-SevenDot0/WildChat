"""Minimal Flask API for WildChat metrics and exploration.

Serves endpoints for:
- Map view: country metrics by date
- Model comparison: GPT-3.5 vs GPT-4 adoption and turn depth
- Conversation search and preview
- Filter presets
"""

from __future__ import annotations

import json
import os
import subprocess
import uuid
from datetime import datetime
from typing import Any, Iterable

from flask import Flask, jsonify, request, send_from_directory
from pyspark.sql import SparkSession

app = Flask(__name__)

# global spark session (initialize on first request)
_spark = None


def use_postgres() -> bool:
    return bool(os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL"))


def postgres_url() -> str:
    return os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL") or ""


def postgres_query(sql: str, params: Iterable[Any] | None = None) -> list[dict]:
    try:
        import psycopg2  # type: ignore
        from psycopg2.extras import RealDictCursor  # type: ignore
    except Exception as exc:
        raise RuntimeError("PostgreSQL support requires psycopg2-binary (pip install psycopg2-binary).") from exc

    conn = psycopg2.connect(postgres_url())
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, tuple(params or ()))
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    finally:
        conn.close()


def table_exists(table_name: str) -> bool:
    if not use_postgres():
        spark = get_spark()
        try:
            spark.table(table_name)
            return True
        except Exception:
            return False

    schema, name = table_name.split(".", 1) if "." in table_name else ("public", table_name)
    rows = postgres_query(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = %s AND table_name = %s
        LIMIT 1
        """,
        [schema, name],
    )
    return bool(rows)


def query_rows(sql: str, params: Iterable[Any] | None = None) -> list[dict]:
    if use_postgres():
        return postgres_query(sql, params)

    spark = get_spark()
    df = spark.sql(sql)
    return [row.asDict() for row in df.collect()]


def get_spark():
    global _spark
    if _spark is None:
        _spark = (
            SparkSession.builder.appName("wildchat-api")
            .config("spark.driver.memory", "1g")
            .enableHiveSupport()
            .getOrCreate()
        )
    return _spark


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat(), "backend": "postgres" if use_postgres() else "spark"})


@app.route("/", methods=["GET"])
def home():
    return send_from_directory(os.path.dirname(__file__), "index.html")


@app.route("/api/v1/map", methods=["GET"])
def map_view():
    """Get country/day metrics for map visualization.
    
    Query params:
      - start_date: YYYY-MM-DD
      - end_date: YYYY-MM-DD
      - country: optional filter
    """
    start_date = request.args.get("start_date", "2023-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    country = request.args.get("country")
    try:
        if use_postgres():
            query = """
                SELECT
                  event_date, country_clean, state, language, model,
                  conversation_count, avg_turn_depth, adoption_rate
                FROM wildchat.country_daily_metrics
                WHERE event_date >= %s AND event_date <= %s
            """
            params: list[Any] = [start_date, end_date]
            if country:
                query += " AND country_clean = %s"
                params.append(country)
            query += " ORDER BY event_date DESC LIMIT 10000"
            data = query_rows(query, params)
        else:
            spark = get_spark()
            query = f"""
            SELECT 
              event_date, country_clean, state, language, model,
              conversation_count, avg_turn_depth, adoption_rate
            FROM wildchat.country_daily_metrics
            WHERE event_date >= '{start_date}' AND event_date <= '{end_date}'
            """
            if country:
                query += f" AND country_clean = '{country}'"
            query += " ORDER BY event_date DESC LIMIT 10000"
            df = spark.sql(query)
            data = [row.asDict() for row in df.collect()]
        return jsonify({"success": True, "count": len(data), "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/v1/models/comparison", methods=["GET"])
def model_comparison():
    """Compare GPT-3.5 vs GPT-4 metrics by date.
    
    Query params:
      - country: filter by country (optional)
      - language: filter by language (optional)
    """
    country_filter = request.args.get("country")
    language_filter = request.args.get("language")
    try:
        if use_postgres():
            query = """
                SELECT
                  event_date,
                  SUM(CASE WHEN model ILIKE '%%gpt-3.5%%' THEN conversation_count ELSE 0 END) AS gpt35_conversations,
                  SUM(CASE WHEN model ILIKE '%%gpt-4%%' THEN conversation_count ELSE 0 END) AS gpt4_conversations,
                  AVG(CASE WHEN model ILIKE '%%gpt-3.5%%' THEN avg_turn_depth ELSE NULL END) AS gpt35_avg_turns,
                  AVG(CASE WHEN model ILIKE '%%gpt-4%%' THEN avg_turn_depth ELSE NULL END) AS gpt4_avg_turns,
                  AVG(adoption_rate) AS adoption_rate
                FROM wildchat.country_daily_metrics
                WHERE event_date >= CURRENT_DATE - INTERVAL '365 days'
            """
            params: list[Any] = []
            if country_filter:
                query += " AND country_clean = %s"
                params.append(country_filter)
            if language_filter:
                query += " AND language = %s"
                params.append(language_filter)
            query += " GROUP BY event_date ORDER BY event_date DESC"
            data = query_rows(query, params)
        else:
            spark = get_spark()
            where_clauses = ["event_date >= DATE_SUB(CURRENT_DATE, 365)"]
            if country_filter:
                where_clauses.append(f"country_clean = '{country_filter}'")
            if language_filter:
                where_clauses.append(f"language = '{language_filter}'")
            where_sql = " AND ".join(where_clauses)
            query = f"""
            SELECT 
              event_date, 
              SUM(CASE WHEN model LIKE '%gpt-3.5%' THEN conversation_count ELSE 0 END) as gpt35_conversations,
              SUM(CASE WHEN model LIKE '%gpt-4%' THEN conversation_count ELSE 0 END) as gpt4_conversations,
              AVG(CASE WHEN model LIKE '%gpt-3.5%' THEN avg_turn_depth ELSE NULL END) as gpt35_avg_turns,
              AVG(CASE WHEN model LIKE '%gpt-4%' THEN avg_turn_depth ELSE NULL END) as gpt4_avg_turns,
              AVG(adoption_rate) as adoption_rate
            FROM wildchat.country_daily_metrics
            WHERE {where_sql}
            GROUP BY event_date
            ORDER BY event_date DESC
            """
            df = spark.sql(query)
            data = [row.asDict() for row in df.collect()]
        return jsonify({"success": True, "count": len(data), "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/v1/conversations/search", methods=["GET"])
def search_conversations():
    """Search conversations by text or hash.
    
    Query params:
      - q: search query (conversation hash or text substring)
      - country: filter by country
      - language: filter by language
      - model: filter by model
      - limit: max results (default 100)
    """
    q = request.args.get("q", "")
    country = request.args.get("country")
    language = request.args.get("language")
    model = request.args.get("model")
    limit = int(request.args.get("limit", 100))
    try:
        if use_postgres():
            translated_exists = table_exists("wildchat.cleaned_wildchat_translated")
            where_clauses = []
            params: list[Any] = []
            if q:
                where_clauses.append("(t.hash_map_id ILIKE %s OR t.conversation_text ILIKE %s)")
                like = f"%{q}%"
                params.extend([like, like])
            if country:
                where_clauses.append("t.country_clean = %s")
                params.append(country)
            if language:
                where_clauses.append("t.language = %s")
                params.append(language)
            if model:
                where_clauses.append("t.model = %s")
                params.append(model)
            where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"
            if translated_exists:
                query = f"""
                SELECT
                  t.hash_map_id, t.event_date, t.country_clean, t.language, t.model,
                  t.turns, t.conversation_type, t.toxicity_factor,
                  COALESCE(tt.conversation_text_translated, LEFT(t.conversation_text, 200)) AS preview,
                  tt.translated_language
                FROM wildchat.cleaned_wildchat t
                LEFT JOIN wildchat.cleaned_wildchat_translated tt
                  ON t.hash_map_id = tt.hash_map_id
                WHERE {where_sql}
                ORDER BY t.event_date DESC
                LIMIT {limit}
                """
            else:
                query = f"""
                SELECT
                  t.hash_map_id, t.event_date, t.country_clean, t.language, t.model,
                  t.turns, t.conversation_type, t.toxicity_factor,
                  LEFT(t.conversation_text, 200) AS preview
                FROM wildchat.cleaned_wildchat t
                WHERE {where_sql}
                ORDER BY t.event_date DESC
                LIMIT {limit}
                """
            data = query_rows(query, params)
        else:
            spark = get_spark()
            where_clauses = []
            if q:
                where_clauses.append(f"(hash_map_id LIKE '%{q}%' OR conversation_text LIKE '%{q}%')")
            if country:
                where_clauses.append(f"country_clean = '{country}'")
            if language:
                where_clauses.append(f"language = '{language}'")
            if model:
                where_clauses.append(f"model = '{model}'")
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

            try:
                spark.sql("USE wildchat")
                has_translated = table_exists("wildchat.cleaned_wildchat_translated")

                if has_translated:
                    query = f"""
                    SELECT 
                      t.hash_map_id, t.event_date, t.country_clean, t.language, t.model,
                      t.turns, t.conversation_type, t.toxicity_factor,
                      COALESCE(tt.conversation_text_translated, SUBSTRING(t.conversation_text,1,200)) as preview,
                      tt.translated_language
                    FROM wildchat.cleaned_wildchat t
                    LEFT JOIN wildchat.cleaned_wildchat_translated tt
                      ON t.hash_map_id = tt.hash_map_id
                    WHERE {where_sql}
                    ORDER BY t.event_date DESC
                    LIMIT {limit}
                    """
                else:
                    query = f"""
                    SELECT 
                      hash_map_id, event_date, country_clean, language, model,
                      turns, conversation_type, toxicity_factor,
                      SUBSTRING(conversation_text, 1, 200) as preview
                    FROM wildchat.cleaned_wildchat
                    WHERE {where_sql}
                    ORDER BY event_date DESC
                    LIMIT {limit}
                    """

                df = spark.sql(query)
                data = [row.asDict() for row in df.collect()]
            except Exception as inner:
                raise inner
        return jsonify({"success": True, "count": len(data), "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/v1/filter-presets", methods=["GET"])
def filter_presets():
    """Return predefined filter presets."""
    presets = [
        {
            "id": "research",
            "name": "Research Questions",
            "description": "Conversations marked as research or academic",
            "filters": {"conversation_type": "research"}
        },
        {
            "id": "educational",
            "name": "Educational",
            "description": "Conversations focused on learning and education",
            "filters": {"conversation_type": "education"}
        },
        {
            "id": "high_engagement",
            "name": "High Engagement (Deep Turns)",
            "description": "Conversations with 10+ turns",
            "filters": {"min_turns": 10}
        },
        {
            "id": "gpt4_adoption",
            "name": "GPT-4 Adoption Hotspots",
            "description": "Regions with >50% GPT-4 usage",
            "filters": {"adoption_rate_min": 0.5}
        },
        {
            "id": "toxic_content",
            "name": "Moderation Flags",
            "description": "Conversations with toxicity/moderation flags",
            "filters": {"moderation_flag": True}
        },
        {
            "id": "last_30_days",
            "name": "Last 30 Days",
            "description": "Recent conversations",
            "filters": {"days_ago": 30}
        },
        {
            "id": "non_english",
            "name": "Non-English Conversations",
            "description": "Conversations not in English",
            "filters": {"language_not": "en"}
        },
    ]
    return jsonify({"success": True, "presets": presets})


def _run_store_path() -> str:
    return "/tmp/wildchat_translation_runs.json"


def _save_run(record: dict) -> None:
    import json
    path = _run_store_path()
    runs = {}
    if os.path.exists(path):
        try:
            with open(path, "r") as fh:
                runs = json.load(fh)
        except Exception:
            runs = {}
    runs[record["run_id"]] = record
    with open(path, "w") as fh:
        json.dump(runs, fh)


def _load_run(run_id: str) -> dict | None:
    import json
    path = _run_store_path()
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as fh:
            runs = json.load(fh)
    except Exception:
        return None
    return runs.get(run_id)


@app.route("/api/v1/translate/run", methods=["POST"])
def translate_run():
    """Start a background translation job.

    JSON body: {"target": "en", "provider": "googletrans", "apply": true}
    Returns a `run_id` which can be polled at `/api/v1/translate/status`.
    """
    payload = request.get_json(silent=True) or {}
    target = payload.get("target", "en")
    provider = payload.get("provider", "googletrans")
    apply_flag = payload.get("apply", True)

    run_id = f"run_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}"

    # launch translator as background subprocess
    cmd = [
        "/bin/bash",
        "-lc",
        f'source .venv/bin/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null; python translate_conversations.py --input-table wildchat.cleaned_wildchat --target {target} --provider {provider} '
    ]
    if apply_flag:
        cmd[-1] += " --apply"

    proc = subprocess.Popen(cmd, cwd=os.getcwd())

    record = {
        "run_id": run_id,
        "pid": proc.pid,
        "target": target,
        "provider": provider,
        "apply": apply_flag,
        "started_at": datetime.utcnow().isoformat(),
        "status": "running",
    }
    _save_run(record)

    return jsonify({"success": True, "run_id": run_id, "pid": proc.pid})


@app.route("/api/v1/translate/status", methods=["GET"])
def translate_status():
    """Check translation run status. Query param: run_id=<id>"""
    run_id = request.args.get("run_id")
    if not run_id:
        return jsonify({"success": False, "error": "run_id required"}), 400
    rec = _load_run(run_id)
    if not rec:
        return jsonify({"success": False, "error": "run_id not found"}), 404

    # check process
    pid = rec.get("pid")
    running = False
    try:
        os.kill(pid, 0)
        running = True
    except Exception:
        running = False

    # check if translated table exists
    spark = get_spark()
    has_translated = True
    try:
        spark.table("wildchat.cleaned_wildchat_translated")
    except Exception:
        has_translated = False

    rec["status"] = "running" if running else ("finished" if has_translated else "stopped")
    _save_run(rec)
    return jsonify({"success": True, "run": rec, "has_translated_table": has_translated})


@app.route("/api/v1/tables/schema", methods=["GET"])
def table_schema():
    """Get schema info for all tables."""
    from schemas import schema_names, get_schema
    
    schemas = {}
    for name in schema_names():
        s = get_schema(name)
        schemas[name] = {
            "fields": [{"name": f.name, "type": str(f.dataType)} for f in s.fields]
        }
    
    return jsonify({"success": True, "schemas": schemas})


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
