import { useState, useEffect, useCallback, useRef } from "react";
import type { ConversationRow, ConversationsResponse, Filters } from "../types";
import { fetchConversations } from "../api";
import { useTheme } from "../context/ThemeContext";

const TOPIC_CATEGORIES: Record<string, string[]> = {
  "Coding / tech": ["python code", "javascript frontend", "sql database", "cybersecurity", "data science ml ai", "cloud devops", "api rest integration", "software architecture", "chatgpt jailbreak", "+ more"],
  "Writing": ["fiction short stories", "essay academic writing", "marketing seo copywriting", "email business writing", "grammar proofreading", "resume cv job application", "dialogue scripts screenplays", "+ more"],
  "Research / info": ["history civilizations", "health medical", "finance investing crypto", "philosophy ethics", "travel tourism geography", "politics current events", "psychology behavior", "+ more"],
  "Math / science": ["math algebra calculus", "science biology physics chemistry"],
  "Translation": ["translation multilingual", "language learning", "language simplification"],
  "Other": ["greeting casual chat", "ai model identity questions", "productivity self improvement", "+ more"],
};

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
  const { colors } = useTheme();
  const [data, setData] = useState<ConversationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState(filters.search || "");
  const [topicOpen, setTopicOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);
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

  // Close topic dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setTopicOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
        {/* Topic dropdown */}
        <div ref={topicRef} style={{ position: "relative" }}>
          <button
            className={`filter-btn text-xs ${filters.topicFilter ? "active" : ""}`}
            style={{ padding: "3px 10px", whiteSpace: "nowrap" }}
            onClick={() => setTopicOpen(o => !o)}
          >
            {filters.topicFilter ? filters.topicFilter : "Topic"} ▾
          </button>

          {topicOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
              background: colors.bgCard, border: `1px solid ${colors.borderBase}`,
              borderRadius: 6, boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
              width: 280, maxHeight: 420, overflowY: "auto",
            }}>
              {/* Clear option */}
              {filters.topicFilter && (
                <button
                  className="w-full text-left px-3 py-2 text-xs"
                  style={{ color: colors.accent, borderBottom: `1px solid ${colors.borderBase}` }}
                  onClick={() => { onFilterChange?.("topicFilter", ""); setTopicOpen(false); }}
                >
                  Clear topic filter ✕
                </button>
              )}
              {Object.entries(TOPIC_CATEGORIES).map(([cat, tags]) => {
                const isActive = filters.topicFilter === cat;
                return (
                  <div key={cat} style={{ borderBottom: `1px solid ${colors.borderBase}` }}>
                    <button
                      className="w-full text-left px-3 py-2"
                      style={{
                        background: isActive ? `${colors.accent}20` : "transparent",
                        color: isActive ? colors.accent : colors.textPrimary,
                        fontSize: "0.8rem", fontWeight: 600,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = colors.bgHover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? `${colors.accent}20` : "transparent"; }}
                      onClick={() => { onFilterChange?.("topicFilter", isActive ? "" : cat); setTopicOpen(false); }}
                    >
                      {cat}
                    </button>
                    <div className="px-3 pb-2 flex flex-wrap gap-1">
                      {tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: "0.65rem", color: colors.textMuted,
                          background: colors.bgHover, borderRadius: 3,
                          padding: "1px 5px",
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
