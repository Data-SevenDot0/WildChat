export interface Overview {
  total_conversations: number;
  total_languages: number;
  avg_turns: number;
  max_turns: number;
  redacted_count: number;
  redacted_pct: number;
  total_models: number;
  total_countries: number;
  date_from: string;
  date_to: string;
  top_language: string;
  top_language_pct: number;
}
export interface TopicItem { category: string; count: number; pct: number; }
export interface LanguageItem { language: string; count: number; pct: number; }
export interface ModelItem { model: string; count: number; pct: number; avg_turns: number; }
export interface CountryItem { country: string; count: number; pct: number; dominant_language?: string; dominant_model?: string; }
export interface SummaryStats {
  gpt35_avg_turns: number;
  gpt4_avg_turns: number;
  english_share_pct: number;
  us_share_pct: number;
}
export interface ConversationRow {
  conversation_hash: string;
  full_hash: string;
  model: string;
  language: string;
  turns: number;
  country: string;
  state: string;
  redacted: boolean;
  toxic: boolean;
  timestamp: string | null;
  tags: string[];
}
export interface ConversationsResponse {
  total: number; page: number; per_page: number; total_pages: number; data: ConversationRow[];
}
export interface Message { role: string; content: string; }
export interface ConversationDetail extends ConversationRow { messages: Message[]; }
export interface Filters {
  model: string;
  language: string;
  country: string;
  redactedOnly: boolean;
  search: string;
  dateFrom: string;
  dateTo: string;
  topicFilter: string;
  turnMin: number;
  turnMax: number;
  // Fix 5 — user tag filter (client-side only, never sent to server or synced to URL)
  tagFilter: string;
}
export interface ActivityEntry {
  id: string;
  type: "search" | "filter" | "conversation" | "country" | "preset";
  label: string;
  timestamp: string;
  filterSnapshot: Filters;
}
export interface FilterPreset {
  id: string;
  name: string;
  filters: Filters;
  createdAt: string;
}
export interface TurnDepthItem {
  dimension: string;
  avg_turns: number;
  count: number;
}

export interface AuthUser {
  user_id: number;
  username: string;
  token: string;
}

export interface Annotation {
  id: number;
  user_id: number;
  conversation_hash: string;
  text: string;
  created_at: string;
}

export interface Note {
  note_id: number;
  user_id: number;
  conversation_hash: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export interface ModelTopicMatrixItem {
  model: string;
  topic: string;
  count: number;
  row_pct: number;
}

export interface HistoryItem {
  history_id: number;
  user_id: number;
  search_query: string;
  timestamp: string;
}

export interface Translation {
  translation_id: number;
  conversation_hash: string;
  original_language: string;
  translated_content: string; // JSON string — parse to Message[]
}

export interface EtlRunItem {
  id: number;
  ran_at: string;
  rows_processed: number;
  status: "success" | "error";
  errors: number;
  duration_seconds: number;
  notes: string;
}

// ── Fix 2: My History entry type (localStorage-based persistent log) ────────
export interface MyHistoryEntry {
  id: string;
  type: "conversation" | "annotation" | "search" | "country" | "filter" | "tag" | "graph" | "preset";
  label: string;
  timestamp: string;
}

// ── Fix 3: Geographic drill-down types ──────────────────────────────────────
export interface GeoDrilldownItem {
  name: string;
  count: number;
  pct: number;
  avg_turns: number;
  dominant_model: string;
  dominant_language: string;
}

export interface GeoDrilldownResponse {
  level: "state" | "city";
  items: GeoDrilldownItem[];
  total_country?: number;
  message?: string;
}

// ── Fix 4: Saved graph type ──────────────────────────────────────────────────
export interface SavedGraph {
  id: string;
  name: string;
  xAxis: "model" | "language" | "country" | "turn_depth";
  yAxis: "conversation_count" | "avg_turn_depth";
  chartType: "bar" | "line" | "scatter";
  filters: { model: string; language: string; country: string; dateFrom: string; dateTo: string };
  createdAt: string;
}

// ── Fix 5: User tag types ────────────────────────────────────────────────────
export interface UserTag {
  id: string;          // tag_id as string
  name: string;
  color: string;
  keywords: string[];  // keywords used for auto-assignment
  matchCount: number;  // conversations currently assigned
  createdAt?: string;
}

export interface TagAssignments {
  [conversationHash: string]: string[]; // full_hash → array of UserTag IDs
}

// ── Fix 4: Graph builder data point ─────────────────────────────────────────
export interface GraphDataPoint {
  dimension: string;
  conversation_count: number;
  avg_turn_depth: number;
  pct: number;
}
