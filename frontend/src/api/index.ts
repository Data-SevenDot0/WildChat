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
  EtlRunItem,
  ModelTopicMatrixItem,
  Annotation,
  AuthUser,
  HistoryItem,
  Translation,
  Message,
  GeoDrilldownResponse,
  GraphDataPoint,
} from "../types";

const api = axios.create({ baseURL: "" }); // proxied by Vite to localhost:8001

// Auto-clear stale stored auth when the backend rejects the token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const stored = localStorage.getItem("wc_auth");
      if (stored) {
        // Token is stale — clear it so the user gets prompted to log in again
        localStorage.removeItem("wc_auth");
        window.dispatchEvent(new Event("wc_auth_expired"));
      }
    }
    return Promise.reject(error);
  }
);

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

export async function fetchEtlRuns(limit = 20): Promise<EtlRunItem[]> {
  const { data } = await api.get(`/data/etl-runs?limit=${limit}`);
  return data;
}

export async function fetchModelTopicMatrix(): Promise<ModelTopicMatrixItem[]> {
  const { data } = await api.get("/data/model-topic-matrix");
  return data;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const { data } = await api.post("/users/login", { username, password });
  return { user_id: data.user_id, username: data.username, token: data.access_token };
}

export async function register(username: string, email: string, password: string): Promise<void> {
  await api.post("/users/", { username, email, password });
}

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function fetchHistory(token: string, limit = 100): Promise<HistoryItem[]> {
  const { data } = await api.get(`/history/?limit=${limit}`, authHeaders(token));
  return Array.isArray(data) ? data : [];
}

export async function addHistory(query: string, token: string): Promise<HistoryItem> {
  const { data } = await api.post("/history/", { search_query: query }, authHeaders(token));
  return data;
}

export async function deleteHistory(historyId: number, token: string): Promise<void> {
  await api.delete(`/history/${historyId}`, authHeaders(token));
}

export async function clearHistory(token: string): Promise<void> {
  await api.delete("/history/", authHeaders(token));
}

export async function fetchAnnotations(conversationHash: string, token: string): Promise<Annotation[]> {
  const { data } = await api.get(`/annotations/${conversationHash}`, authHeaders(token));
  return data;
}

export async function createAnnotation(conversationHash: string, text: string, token: string): Promise<Annotation> {
  const { data } = await api.post("/annotations/", { conversation_hash: conversationHash, text }, authHeaders(token));
  return data;
}

export async function deleteAnnotation(id: number, token: string): Promise<void> {
  await api.delete(`/annotations/${id}`, authHeaders(token));
}

export async function fetchTranslation(conversationHash: string): Promise<Translation | null> {
  try {
    const { data } = await api.get(`/translations/${conversationHash}`);
    return data as Translation;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function requestTranslation(
  conversationHash: string,
  messages: Message[],
  sourceLanguage: string
): Promise<Translation> {
  const { data } = await api.post(`/translations/${conversationHash}`, {
    messages,
    source_language: sourceLanguage,
  });
  return data as Translation;
}

// ── Fix 3: Geographic drill-down ─────────────────────────────────────────────
export async function fetchGeographicDrilldown(
  country: string,
  state?: string
): Promise<GeoDrilldownResponse> {
  const p = new URLSearchParams({ country });
  if (state) p.set("state", state);
  const { data } = await api.get(`/data/geographic-drilldown?${p}`);
  return data as GeoDrilldownResponse;
}

// ── Fix 4: Graph builder data ─────────────────────────────────────────────────
export async function fetchGraphBuilderData(params: {
  x_axis: string;
  y_axis: string;
  model?: string;
  language?: string;
  country?: string;
  date_from?: string;
  date_to?: string;
}): Promise<GraphDataPoint[]> {
  const p = new URLSearchParams({ x_axis: params.x_axis, y_axis: params.y_axis });
  if (params.model) p.set("model", params.model);
  if (params.language) p.set("language", params.language);
  if (params.country) p.set("country", params.country);
  if (params.date_from) p.set("date_from", params.date_from);
  if (params.date_to) p.set("date_to", params.date_to);
  const { data } = await api.get(`/data/graph-builder?${p}`);
  return data as GraphDataPoint[];
}