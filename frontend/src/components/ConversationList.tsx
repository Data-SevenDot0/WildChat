import { useState, useEffect, useCallback, useRef } from "react";
import type { ConversationRow, ConversationsResponse, Filters } from "../types";
import { fetchConversations } from "../api";
import { useTheme } from "../context/ThemeContext";
// Fix 5 — read tag assignments to show pills and support tag filtering
import { useTagContext } from "../context/TagContext";

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
  // Fix 5 — tag context for pills and filtering
  const { tags, getConvTags } = useTagContext();

  const [data, setData] = useState<ConversationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState(filters.search || "");
  const [topicOpen, setTopicOpen] = useState(false);
  // Fix 5 — tag filter dropdown state
  const [tagOpen, setTagOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
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
        // tagFilter is client-side only — not sent to server
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) setTopicOpen(false);
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setTagOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInputChange(val: string) {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (onFilterChange) onFilterChange("search", val);
    }, 300);
  }

  // Fix 5 — client-side tag filter applied on top of server results for the current page
  const activeTag = filters.tagFilter
    ? tags.find(t => t.id === filters.tagFilter)
    : null;

  const displayRows = data?.data.filter(row =>
    activeTag ? (getConvTags(row.full_hash).some(t => t.id === activeTag.id)) : true
  ) ?? [];

  const hasChips = filters.model || filters.language || filters.country || filters.redactedOnly || filters.topicFilter || filters.dateFrom || filters.dateTo || filters.tagFilter;

  return (
    <div className="card flex flex-col" style={{ minHeight: 260 }}>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle flex-wrap">
        <span className="text-text-muted text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-text-primary text-xs outline-none placeholder-text-muted"
          placeholder="Search — keyword, hash, country, topic..."
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          style={{ minWidth: 140 }}
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
            onClick={() => { setTopicOpen(o => !o); setTagOpen(false); }}
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
              {filters.topicFilter && (
                <button
                  className="w-full text-left px-3 py-2 text-xs"
                  style={{ color: colors.accent, borderBottom: `1px solid ${colors.borderBase}` }}
                  onClick={() => { onFilterChange?.("topicFilter", ""); setTopicOpen(false); }}
                >
                  Clear topic filter ✕
                </button>
              )}
              {Object.entries(TOPIC_CATEGORIES).map(([cat, tagItems]) => {
                const isActive = filters.topicFilter === cat;
                return (
                  <div key={cat} style={{ borderBottom: `1px solid ${colors.borderBase}` }}>
                    <button
                      className="w-full text-left px-3 py-2"
                      style={{
                        background: isActive ? `${colors.accent}20` : "transparent",
                        color: isActive ? colors.accent : colors.textPrimary,
                        fontSize: "0.8rem", fontWeight: 600,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = colors.bgHover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? `${colors.accent}20` : "transparent"; }}
                      onClick={() => { onFilterChange?.("topicFilter", isActive ? "" : cat); setTopicOpen(false); }}
                    >
                      {cat}
                    </button>
                    <div className="px-3 pb-2 flex flex-wrap gap-1">
                      {tagItems.map(tag => (
                        <span key={tag} style={{ fontSize: "0.65rem", color: colors.textMuted, background: colors.bgHover, borderRadius: 3, padding: "1px 5px" }}>
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

        {/* Fix 5 — Tags filter dropdown */}
        {tags.length > 0 && (
          <div ref={tagRef} style={{ position: "relative" }}>
            <button
              className={`filter-btn text-xs ${filters.tagFilter ? "active" : ""}`}
              style={{ padding: "3px 10px", whiteSpace: "nowrap" }}
              onClick={() => { setTagOpen(o => !o); setTopicOpen(false); }}
            >
              {activeTag ? (
                <span style={{ color: activeTag.color }}>{activeTag.name}</span>
              ) : "Tags"} ▾
            </button>
            {tagOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
                background: colors.bgCard, border: `1px solid ${colors.borderBase}`,
                borderRadius: 6, boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
                minWidth: 180,
              }}>
                {filters.tagFilter && (
                  <button
                    className="w-full text-left px-3 py-2 text-xs"
                    style={{ color: colors.accent, borderBottom: `1px solid ${colors.borderBase}` }}
                    onClick={() => { onFilterChange?.("tagFilter", ""); setTagOpen(false); }}
                  >
                    Clear tag filter ✕
                  </button>
                )}
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    className="w-full text-left px-3 py-2 flex items-center gap-2"
                    style={{
                      background: filters.tagFilter === tag.id ? `${tag.color}20` : "transparent",
                      fontSize: "0.8rem",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = colors.bgHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = filters.tagFilter === tag.id ? `${tag.color}20` : "transparent"; }}
                    onClick={() => { onFilterChange?.("tagFilter", filters.tagFilter === tag.id ? "" : tag.id); setTagOpen(false); }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: tag.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ color: colors.textPrimary }}>{tag.name}</span>
                  </button>
                ))}
                <div className="px-3 py-1.5 text-xs border-t" style={{ color: colors.textMuted, borderColor: colors.borderBase }}>
                  Filters current page only
                </div>
              </div>
            )}
          </div>
        )}

        {data && (
          <span className="text-text-secondary text-xs whitespace-nowrap">
            {activeTag
              ? `${displayRows.length} / ${data.total.toLocaleString()} records`
              : `${data.total.toLocaleString()} records`}
          </span>
        )}
      </div>

      {/* Active filter chips */}
      {hasChips && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle flex-wrap">
          {filters.model && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("model", "")}>
              {filters.model} ✕
            </span>
          )}
          {filters.language && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("language", "")}>
              {filters.language} ✕
            </span>
          )}
          {filters.country && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("country", "")}>
              {filters.country} ✕
            </span>
          )}
          {filters.redactedOnly && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("redactedOnly", false)}>
              Redacted only ✕
            </span>
          )}
          {filters.topicFilter && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("topicFilter", "")}>
              Topic: {filters.topicFilter} ✕
            </span>
          )}
          {filters.dateFrom && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("dateFrom", "")}>
              From: {filters.dateFrom} ✕
            </span>
          )}
          {filters.dateTo && (
            <span className="tag-pill removable cursor-pointer" onClick={() => onFilterChange && onFilterChange("dateTo", "")}>
              To: {filters.dateTo} ✕
            </span>
          )}
          {/* Fix 5 — tag filter chip */}
          {activeTag && (
            <span
              className="tag-pill removable cursor-pointer"
              style={{ background: activeTag.color + "22", color: activeTag.color, border: `1px solid ${activeTag.color}55` }}
              onClick={() => onFilterChange && onFilterChange("tagFilter", "")}
            >
              Tag: {activeTag.name} ✕
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
        {/* Fix 5 — Tags column header */}
        <span className="label">Tags / Status</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
          </div>
        ) : displayRows.length === 0 ? (
          <div className="text-text-secondary text-center py-12 text-xs">
            {activeTag ? `No conversations on this page tagged "${activeTag.name}".` : "No conversations match the current filters."}
          </div>
        ) : (
          displayRows.map((row) => {
            // Fix 5 — look up user-defined tags assigned to this conversation
            const convTags = getConvTags(row.full_hash);
            return (
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
                {/* Fix 5 — show user tag pills if any, otherwise status */}
                <span className="flex items-center gap-1 flex-wrap min-w-0">
                  {convTags.length > 0 ? (
                    convTags.map(tag => (
                      <span
                        key={tag.id}
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          background: tag.color + "30",
                          color: tag.color,
                          border: `1px solid ${tag.color}55`,
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <StatusCell row={row} />
                  )}
                </span>
              </div>
            );
          })
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
