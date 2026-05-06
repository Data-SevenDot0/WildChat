"""Minimal Flask API for WildChat metrics and exploration.

Serves endpoints for:
- Map view: country metrics by date
- Model comparison: GPT-3.5 vs GPT-4 adoption and turn depth
- Conversation search and preview
- Filter presets
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from flask import Flask, jsonify, request
from pyspark.sql import SparkSession

app = Flask(__name__)

# global spark session (initialize on first request)
_spark = None


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
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@app.route("/api/v1/map", methods=["GET"])
def map_view():
    """Get country/day metrics for map visualization.
    
    Query params:
      - start_date: YYYY-MM-DD
      - end_date: YYYY-MM-DD
      - country: optional filter
    """
    spark = get_spark()
    
    start_date = request.args.get("start_date", "2023-01-01")
    end_date = request.args.get("end_date", "2024-12-31")
    country = request.args.get("country")
    
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
    
    try:
        df = spark.sql(query)
        rows = df.collect()
        data = [row.asDict() for row in rows]
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
    spark = get_spark()
    
    country_filter = request.args.get("country")
    language_filter = request.args.get("language")
    
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
    
    try:
        df = spark.sql(query)
        rows = df.collect()
        data = [row.asDict() for row in rows]
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
    spark = get_spark()
    
    q = request.args.get("q", "")
    country = request.args.get("country")
    language = request.args.get("language")
    model = request.args.get("model")
    limit = int(request.args.get("limit", 100))
    
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
    
    try:
        df = spark.sql(query)
        rows = df.collect()
        data = [row.asDict() for row in rows]
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
