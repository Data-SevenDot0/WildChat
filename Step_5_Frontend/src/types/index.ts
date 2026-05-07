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
export interface CountryItem { country: string; count: number; pct: number; }
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
