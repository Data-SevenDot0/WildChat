import { useState, useEffect, useCallback, useRef } from "react";
import type { ConversationRow, ConversationsResponse, Filters } from "../types";
import { fetchConversations } from "../api";

interface Props {
  filters: Filters;
  onSelect: (row: ConversationRow) => void;
  selectedHash: string | null;
  onFilterChange?: (key: string, value: string | boolean | number) => void;
}

function ModelBadge({ model }: { model: string }) {
  const isGpt4 = model.startsWith("gpt-4");
  const short = model.replace("gpt-3.5-turbo-", "3.5-").replace("gpt-4-", "4-").replace("-preview", "");
  return <span className={`model-badge ${isGpt4 ? "gpt4" : ""}`}>{short}</span>;
}

function StatusCell({ row }: { row: ConversationRow }) {
  if (row.redacted)
    return <span className="flex items-center gap-1"><span className="status-dot redacted" /> redacted</span>;
  return <span className="flex items-center gap-1"><span className="status-dot ok" /> ok</span>;
}

export default function ConversationList({ filters, onSelect, selectedHash, onFilterChange }: Props) {
  const [data, setData] = useState<ConversationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState(filters.search || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, f: Filters) => {
    setLoading(true);
    try {
      const res = await fetchConversations({
        page: p,
        per_page: 20,
        model: f.model || undefined,
        language: f.language || undefined,
        country: f.country || undefined,
        redacted_only: f.redactedOnly || undefined,
        search: f.search || undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
        topic_filter: f.topicFilter || undefined,
        turn_min: f.turnMin > 0 ? f.turnMin : undefined,
        turn_max: f.turnMax > 0 ? f.turnMax : undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when filters (except search, handled by debounce) or page changes
  useEffect(() => {
    setPage(1);
    load(1, filters);
  }, [
    filters.model, filters.language, filters.country, filters.redactedOnly,
    filters.search, filters.dateFrom, filters.dateTo, filters.topicFilter,
    filters.turnMin, filters.turnMax,
  ]);

  useEffect(() => {
    load(page, filters);
  }, [page]);

  // Debounced search
  function handleInputChange(val: string) {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (onFilterChange) onFilterChange("search", val);
    }, 300);
  }

  const hasChips = filters.model || filters.language || filters.country || filters.redactedOnly || filters.topicFilter || filters.dateFrom || filters.dateTo;

  return (
    <div className="card flex flex-col" style={{ minHeight: 260 }}>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
        <span className="text-text-muted text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-text-primary text-xs outline-none placeholder-text-muted"
          placeholder="Search — keyword, hash, country, topic..."
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
        />
        {inputVal && (
          <button
            type="button"
            className="text-text-secondary hover:text-accent-green text-xs"
            onClick={() => { setInputVal(""); if (onFilterChange) onFilterChange("search", ""); }}
          >
            ✕
          </button>
        )}
        {data && (
          <span className="text-text-secondary text-xs whitespace-nowrap">
            {data.total.toLocaleString()} records
          </span>
        )}
      </div>

      {/* Active filter chips */}
      {hasChips && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle flex-wrap">
          {filters.model && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("model", "")}
            >
              {filters.model} ✕
            </span>
          )}
          {filters.language && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("language", "")}
            >
              {filters.language} ✕
            </span>
          )}
          {filters.country && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("country", "")}
            >
              {filters.country} ✕
            </span>
          )}
          {filters.redactedOnly && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("redactedOnly", false)}
            >
              Redacted only ✕
            </span>
          )}
          {filters.topicFilter && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("topicFilter", "")}
            >
              Topic: {filters.topicFilter} ✕
            </span>
          )}
          {filters.dateFrom && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("dateFrom", "")}
            >
              From: {filters.dateFrom} ✕
            </span>
          )}
          {filters.dateTo && (
            <span
              className="tag-pill removable cursor-pointer"
              onClick={() => onFilterChange && onFilterChange("dateTo", "")}
            >
              To: {filters.dateTo} ✕
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div
        className="conv-row text-text-secondary border-b border-border-base"
        style={{ background: "#181818", cursor: "default" }}
      >
        <span className="label">Hash</span>
        <span className="label">Model</span>
        <span className="label">Language</span>
        <span className="label">Turns</span>
        <span className="label">Country</span>
        <span className="label">Status</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-text-secondary text-center py-12 text-xs">No conversations match the current filters.</div>
        ) : (
          data?.data.map((row) => (
            <div
              key={row.full_hash}
              className={`conv-row ${selectedHash === row.full_hash ? "selected" : ""}`}
              onClick={() => onSelect(row)}
            >
              <span className="font-mono text-xs text-accent-green">{row.conversation_hash}</span>
              <ModelBadge model={row.model} />
              <span className="text-text-primary text-xs">{row.language}</span>
              <span className="text-text-primary text-xs">{row.turns}</span>
              <span className="text-text-primary text-xs truncate">{row.country}</span>
              <StatusCell row={row} />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle">
          <button
            className="filter-btn text-xs disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="text-text-secondary text-xs">
            Page {page} / {data.total_pages.toLocaleString()}
          </span>
          <button
            className="filter-btn text-xs disabled:opacity-40"
            disabled={page >= data.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
