import { useState, useEffect, useCallback } from "react";
import type { ConversationRow, ConversationsResponse, Filters } from "../types";
import { fetchConversations } from "../api";

interface Props {
  filters: Filters;
  onSelect: (row: ConversationRow) => void;
  selectedHash: string | null;
}

function ModelBadge({ model }: { model: string }) {
  const isGpt4 = model.startsWith("gpt-4");
  const short = model.replace("gpt-3.5-turbo-", "3.5-").replace("gpt-4-", "4-").replace("-preview","");
  return (
    <span className={`model-badge ${isGpt4 ? "gpt4" : ""}`}>{short}</span>
  );
}

function StatusCell({ row }: { row: ConversationRow }) {
  if (row.redacted)
    return <span className="flex items-center gap-1"><span className="status-dot redacted" /> redacted</span>;
  return <span className="flex items-center gap-1"><span className="status-dot ok" /> ok</span>;
}

export default function ConversationList({ filters, onSelect, selectedHash }: Props) {
  const [data, setData] = useState<ConversationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inputVal, setInputVal] = useState("");

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const res = await fetchConversations({
        page: p,
        per_page: 20,
        model: filters.model || undefined,
        language: filters.language || undefined,
        country: filters.country || undefined,
        redacted_only: filters.redactedOnly || undefined,
        search: s || undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setPage(1);
    load(1, search);
  }, [filters, search]);

  useEffect(() => {
    load(page, search);
  }, [page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputVal);
    setPage(1);
  }

  return (
    <div className="card flex flex-col" style={{ minHeight: 260 }}>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
          <span className="text-text-muted text-sm">🔍</span>
          <input
            className="flex-1 bg-transparent text-text-primary text-xs outline-none placeholder-text-muted"
            placeholder="Search refinement — keyword, hash, country, topic..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
          {inputVal && (
            <button
              type="button"
              className="text-text-secondary hover:text-accent-green text-xs"
              onClick={() => { setInputVal(""); setSearch(""); }}
            >
              ✕
            </button>
          )}
        </form>
        {data && (
          <span className="text-text-secondary text-xs whitespace-nowrap">
            {data.total.toLocaleString()} records
          </span>
        )}
        <button className="filter-btn text-xs">⊞ Save preset</button>
      </div>

      {/* Active filter chips */}
      {(filters.model || filters.language || filters.country || filters.redactedOnly) && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle flex-wrap">
          {filters.model && <span className="tag-pill">{filters.model} ✕</span>}
          {filters.language && <span className="tag-pill">{filters.language} ✕</span>}
          {filters.country && <span className="tag-pill">{filters.country} ✕</span>}
          {filters.redactedOnly && <span className="tag-pill">Redacted only ✕</span>}
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
