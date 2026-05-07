import axios from "axios";
import type {
  Overview,
  TopicItem,
  LanguageItem,
  ModelItem,
  CountryItem,
  SummaryStats,
  ConversationsResponse,
  ConversationDetail,
  TurnDepthItem,
} from "../types";

const api = axios.create({ baseURL: "" }); // proxied by Vite to localhost:8000

export async function fetchOverview(): Promise<Overview> {
  const { data } = await api.get("/data/overview");
  return data;
}

export async function fetchTopics(): Promise<TopicItem[]> {
  const { data } = await api.get("/data/topics");
  return data;
}

export async function fetchLanguages(limit = 20): Promise<LanguageItem[]> {
  const { data } = await api.get(`/data/languages?limit=${limit}`);
  return data;
}

export async function fetchModels(): Promise<ModelItem[]> {
  const { data } = await api.get("/data/models");
  return data;
}

export async function fetchCountries(limit = 50, dateFrom?: string, dateTo?: string): Promise<CountryItem[]> {
  const p = new URLSearchParams({ limit: String(limit) });
  if (dateFrom) p.set("date_from", dateFrom);
  if (dateTo) p.set("date_to", dateTo);
  const { data } = await api.get(`/data/countries?${p.toString()}`);
  return data;
}

export async function fetchSummary(): Promise<SummaryStats> {
  const { data } = await api.get("/data/summary");
  return data;
}

export async function fetchConversations(params: {
  page?: number;
  per_page?: number;
  model?: string;
  language?: string;
  country?: string;
  redacted_only?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
  topic_filter?: string;
  turn_min?: number;
  turn_max?: number;
}): Promise<ConversationsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.model) query.set("model", params.model);
  if (params.language) query.set("language", params.language);
  if (params.country) query.set("country", params.country);
  if (params.redacted_only) query.set("redacted_only", "true");
  if (params.search) query.set("search", params.search);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.topic_filter) query.set("topic_filter", params.topic_filter);
  if (params.turn_min && params.turn_min > 0) query.set("turn_min", String(params.turn_min));
  if (params.turn_max && params.turn_max > 0) query.set("turn_max", String(params.turn_max));
  const { data } = await api.get(`/data/conversations?${query}`);
  return data;
}

export async function fetchConversationDetail(
  hash: string
): Promise<ConversationDetail> {
  const { data } = await api.get(`/data/conversations/${hash}`);
  return data;
}

export async function fetchTurnDepth(dimension: "model" | "language" | "country"): Promise<TurnDepthItem[]> {
  const { data } = await api.get(`/data/turn-depth?dimension=${dimension}`);
  return data;
}
