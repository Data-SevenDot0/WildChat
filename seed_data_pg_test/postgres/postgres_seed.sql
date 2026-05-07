-- PostgreSQL seed schema for WildChat
CREATE SCHEMA IF NOT EXISTS wildchat;

CREATE TABLE IF NOT EXISTS wildchat.cleaned_wildchat (
  event_timestamp TIMESTAMP,
  event_date DATE,
  country_clean TEXT,
  state TEXT,
  hash_map_id TEXT PRIMARY KEY,
  moderation_flag BOOLEAN,
  turns INTEGER,
  conversation_type TEXT,
  toxicity_factor DOUBLE PRECISION,
  model TEXT,
  language TEXT,
  redacted BOOLEAN,
  hashed_ip TEXT,
  conversation_text TEXT,
  has_missing_values BOOLEAN,
  valid_timestamp BOOLEAN,
  valid_country BOOLEAN,
  long_conversation BOOLEAN,
  short_conversation BOOLEAN,
  excessive_turns BOOLEAN,
  moderation_present BOOLEAN
);

CREATE TABLE IF NOT EXISTS wildchat.country_daily_metrics (
  event_date DATE,
  country_clean TEXT,
  state TEXT,
  language TEXT,
  model TEXT,
  conversation_count BIGINT,
  turn_count BIGINT,
  avg_turn_depth DOUBLE PRECISION,
  gpt35_count BIGINT,
  gpt4_count BIGINT,
  redacted_count BIGINT,
  toxic_count BIGINT,
  adoption_rate DOUBLE PRECISION,
  source_run_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wildchat.conversation_annotation (
  annotation_id TEXT PRIMARY KEY,
  conversation_id TEXT,
  turn_id INTEGER,
  annotation_type TEXT,
  annotation_label TEXT,
  annotation_value DOUBLE PRECISION,
  confidence DOUBLE PRECISION,
  notes TEXT,
  taxonomy_version TEXT,
  created_at TIMESTAMP,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS wildchat.topic_cluster (
  cluster_id INTEGER PRIMARY KEY,
  cluster_label TEXT,
  cluster_description TEXT,
  keywords TEXT,
  language TEXT,
  country_clean TEXT,
  model_version TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- New tables for part-1 and part-2 data forms
CREATE TABLE IF NOT EXISTS wildchat.part_1 (
  conversation_id TEXT PRIMARY KEY,
  model TEXT,
  timestamp TIMESTAMP,
  turn INTEGER,
  language TEXT,
  toxicity_flag BOOLEAN,
  redacted BOOLEAN,
  state TEXT,
  country TEXT,
  hashed_ip TEXT,
  conversation_text TEXT,
  first_role TEXT
);

CREATE TABLE IF NOT EXISTS wildchat.part_2 (
  conversation_id TEXT PRIMARY KEY,
  model TEXT,
  timestamp TIMESTAMP,
  turn INTEGER,
  language TEXT,
  toxicity_flag BOOLEAN,
  redacted BOOLEAN,
  state TEXT,
  country TEXT,
  hashed_ip TEXT,
  conversation_text TEXT,
  first_role TEXT
);
