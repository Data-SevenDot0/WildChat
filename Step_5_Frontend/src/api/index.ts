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

export async function fetchCountries(limit = 50): Promise<CountryItem[]> {
  const { data } = await api.get(`/data/countries?limit=${limit}`);
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
}): Promise<ConversationsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.model) query.set("model", params.model);
  if (params.language) query.set("language", params.language);
  if (params.country) query.set("country", params.country);
  if (params.redacted_only) query.set("redacted_only", "true");
  if (params.search) query.set("search", params.search);
  const { data } = await api.get(`/data/conversations?${query}`);
  return data;
}

export async function fetchConversationDetail(
  hash: string
): Promise<ConversationDetail> {
  const { data } = await api.get(`/data/conversations/${hash}`);
  return data;
}
