import { useEffect, useState } from "react";
import type { ConversationRow, ConversationDetail, FilterPreset, ActivityEntry, Filters, Annotation, HistoryItem } from "../types";
import { fetchConversationDetail, fetchAnnotations, createAnnotation, deleteAnnotation, fetchHistory, addHistory, deleteHistory, clearHistory } from "../api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface Props {
  selected: ConversationRow | null;
  presets?: FilterPreset[];
  activityLog?: ActivityEntry[];
  onApplyPreset?: (preset: FilterPreset) => void;
  onDeletePreset?: (id: string) => void;
  onRestoreActivity?: (entry: ActivityEntry) => void;
}



function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function activityIcon(type: ActivityEntry["type"]): string {
  switch (type) {
    case "search": return "🔍";
    case "filter": return "⊞";
    case "conversation": return "💬";
    case "country": return "🌍";
    case "preset": return "📌";
    default: return "↳";
  }
}

function ThreadModal({ detail, onClose }: { detail: ConversationDetail; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="card flex flex-col"
        style={{ width: 680, maxHeight: "85vh", minHeight: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-base flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs" style={{ color: colors.accent }}>{detail.conversation_hash.slice(0, 8)}…</span>
            <span className="text-text-secondary text-xs">{detail.turns} turns · {detail.language} · {detail.country}</span>
            {detail.redacted && <span className="status-dot redacted" />}
            {detail.toxic && <span className="status-dot toxic" />}
          </div>
          <button className="text-text-secondary hover:text-text-primary text-lg leading-none" onClick={onClose}>×</button>
        </div>

        {detail.tags.length > 0 && (
          <div className="px-5 py-2 border-b border-border-subtle flex flex-wrap gap-1 flex-shrink-0">
            {detail.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {detail.messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === "assistant" ? "pl-4 border-l-2 border-border-base" : ""}`}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: msg.role === "user" ? colors.accent : colors.textPrimary }}>
                {msg.role === "user" ? "User" : "Assistant"}
              </div>
              <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="px-5 py-2 border-t border-border-base flex-shrink-0 text-xs text-text-muted">
          {detail.timestamp ? new Date(detail.timestamp).toLocaleString() : ""} · {detail.model}
        </div>
      </div>
    </div>
  );
}

function ConversationFlow({ detail }: { detail: ConversationDetail }) {
  const { colors } = useTheme();
  const turnColors = [...colors.chart, colors.textSecondary];
  const turns = Math.min(detail.turns, 8);
  return (
    <div>
      <div className="label mb-2">Conversation Flow</div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: turns }).map((_, i) => {
          const c = turnColors[i % turnColors.length];
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="status-dot flex-shrink-0" style={{ background: c }} />
              <div className="flex-1 h-1.5 rounded" style={{ background: c + "40" }} />
              <span className="text-text-secondary text-xs">Turn {i + 1}</span>
            </div>
          );
        })}
      </div>
      {detail.tags.length > 0 && (
        <div className="mt-2 text-xs text-text-secondary">Topic shift detected at turn 2</div>
      )}
    </div>
  );
}

export default function RightPanel({ selected, presets = [], activityLog = [], onApplyPreset, onDeletePreset, onRestoreActivity }: Props) {
  const { colors } = useTheme();
  const { user, } = useAuth();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [annotationError, setAnnotationError] = useState("");

  // DB-backed history (per-user, persisted)
  const [dbHistory, setDbHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!user) { setDbHistory([]); return; }
    fetchHistory(user.token).then(data => setDbHistory(Array.isArray(data) ? data : [])).catch(() => setDbHistory([]));
  }, [user?.user_id]);

  // Sync new activity entries to DB when user is logged in
  useEffect(() => {
    if (!user?.token || activityLog.length === 0) return;
    const latest = activityLog[0];
    if (!["conversation", "country", "preset"].includes(latest.type)) return;
    addHistory(latest.label, user.token)
      .then((item) => setDbHistory((prev) => [item, ...prev]))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog[0]?.id, user?.token]);

  async function removeHistoryItem(historyId: number) {
    if (!user) return;
    try {
      await deleteHistory(historyId, user.token);
      setDbHistory((prev) => prev.filter((h) => h.history_id !== historyId));
    } catch {}
  }

  async function handleClearHistory() {
    if (!user) return;
    try {
      await clearHistory(user.token);
      setDbHistory([]);
    } catch {}
  }

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetail(null);
    setLoading(true);
    fetchConversationDetail(selected.full_hash)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [selected?.full_hash]);

  useEffect(() => {
    setShowThread(false);
    setNoteInput("");
    setAnnotationError("");
    setAnnotations([]);
    if (selected && user) {
      fetchAnnotations(selected.full_hash, user.token)
        .then(setAnnotations)
        .catch(() => setAnnotations([]));
    }
  }, [selected?.full_hash, user?.user_id]);

  async function addNote() {
    if (!noteInput.trim() || !selected || !user) return;
    setAnnotationError("");
    try {
      const created = await createAnnotation(selected.full_hash, noteInput.trim(), user.token);
      setAnnotations(prev => [...prev, created]);
      setNoteInput("");
    } catch {
      setAnnotationError("Failed to save note.");
    }
  }

  async function removeNote(id: number) {
    if (!user) return;
    try {
      await deleteAnnotation(id, user.token);
      setAnnotations(prev => prev.filter(a => a.id !== id));
    } catch {
      setAnnotationError("Failed to delete note.");
    }
  }
  const recentActivity = activityLog.slice(0, 10);
  const trackingHistory = activityLog.filter(e => ["conversation", "country", "search"].includes(e.type)).slice(0, 15);

  return (
    <>
      {showThread && detail && <ThreadModal detail={detail} onClose={() => setShowThread(false)} />}

      <aside
        style={{ width: 260, minWidth: 260 }}
        className="flex flex-col h-full border-l border-border-base bg-bg-panel overflow-y-auto flex-shrink-0 gap-0"
      >
        {/* Conversation Preview */}
        <div className="p-4 border-b border-border-base">
          <div className="label mb-2">Conversation Preview</div>
          {!selected ? (
            <div className="text-text-muted text-xs">Select a conversation to preview</div>
          ) : loading ? (
            <div className="flex items-center gap-2">
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
              <span className="text-text-secondary text-xs">Loading…</span>
            </div>
          ) : detail ? (
            <>
              <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs" style={{ color: colors.accent }}>{detail.conversation_hash.slice(0, 8)}…</span>
                <span className="text-text-secondary text-xs">{detail.turns} turns</span>
                <span className="text-text-secondary text-xs">· {detail.language}</span>
              </div>
              {detail.messages.slice(0, 3).map((msg, i) => (
                <div key={i} className="mb-2">
                  <div className="text-xs font-medium mb-0.5" style={{ color: msg.role === "user" ? colors.accent : colors.textPrimary }}>
                    {msg.role === "user" ? "User" : "Assistant"}:
                  </div>
                  <div className="text-xs text-text-primary leading-relaxed" style={{ maxHeight: 80, overflow: "hidden" }}>
                    {msg.content.slice(0, 220)}{msg.content.length > 220 ? "…" : ""}
                  </div>
                </div>
              ))}
              <button className="text-xs text-accent-green hover:underline mt-1" onClick={() => setShowThread(true)}>
                View full thread ({detail.messages.length} messages) →
              </button>
            </>
          ) : (
            <div className="text-text-muted text-xs">Could not load conversation.</div>
          )}
        </div>

        {/* Conversation Flow */}
        {detail && (
          <div className="p-4 border-b border-border-base">
            <ConversationFlow detail={detail} />
          </div>
        )}

        {/* Annotation Tool */}
        <div className="p-4 border-b border-border-base">
          <div className="label mb-2">Annotation Tool</div>
          {!user ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-text-muted">Log in to save personal annotations to conversations.</div>
              <button
                className="filter-btn active text-xs"
                style={{ justifyContent: "center", padding: "6px" }}
                onClick={() => document.dispatchEvent(new CustomEvent("wc:open-login"))}
              >
                Log in
              </button>
            </div>
          ) : !detail ? (
            <div className="text-xs text-text-muted">Select a conversation to annotate.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {detail.tags.slice(0, 3).map((tag) => (
                <div key={tag} className="flex items-center gap-2">
                  <span className="status-dot ok" />
                  <span className="text-xs text-text-primary capitalize">{tag}</span>
                </div>
              ))}
              {detail.redacted && (
                <div className="flex items-center gap-2">
                  <span className="status-dot redacted" />
                  <span className="text-xs text-text-primary">Redacted content</span>
                </div>
              )}
              {annotations.map((note) => (
                <div key={note.id} className="flex flex-col gap-0.5 mt-1 p-2 rounded group" style={{ background: colors.bgHover, border: `1px solid ${colors.borderBase}` }}>
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs text-text-primary flex-1">{note.text}</span>
                    <button
                      className="text-text-muted hover:text-text-primary text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={() => removeNote(note.id)}
                      title="Delete note"
                    >✕</button>
                  </div>
                  <span className="text-xs text-text-muted">{timeAgo(note.created_at)}</span>
                </div>
              ))}
              {annotationError && (
                <div className="text-xs" style={{ color: "#ef4444" }}>{annotationError}</div>
              )}
              <div className="flex gap-1 mt-1">
                <input
                  className="flex-1 bg-transparent text-text-primary text-xs outline-none border-b border-border-subtle placeholder-text-muted"
                  placeholder="Add note…"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                />
                {noteInput && (
                  <button className="text-xs hover:underline" style={{ color: colors.accent }} onClick={addNote}>Save</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Saved Presets */}
        <div className="p-4 border-b border-border-base">
          <div className="label mb-2">Saved Presets</div>
          {presets.length === 0 ? (
            <div className="text-text-muted text-xs">No saved presets. Use Presets ▾ in the top bar to save.</div>
          ) : (
            presets.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 hover:bg-bg-hover rounded px-1 group">
                <div
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={() => onApplyPreset && onApplyPreset(p)}
                >
                  <span className="status-dot" style={{ background: colors.accent, opacity: 0.6 }} />
                  <span className="text-xs text-text-primary group-hover:text-accent-green">{p.name}</span>
                </div>
                <button
                  className="text-text-muted hover:text-text-primary text-xs opacity-0 group-hover:opacity-100"
                  onClick={() => onDeletePreset && onDeletePreset(p.id)}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Session History */}
        <div className="p-4 border-b border-border-base">
          <div className="flex items-center justify-between mb-2">
            <div className="label">Session History</div>
            {recentActivity.length > 0 && (
              <span className="text-xs text-text-muted">{recentActivity.length} actions</span>
            )}
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-text-muted text-xs">No activity yet.</div>
          ) : (
            recentActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 py-1.5 cursor-pointer hover:bg-bg-hover rounded px-1 group"
                onClick={() => onRestoreActivity && onRestoreActivity(entry)}
                title="Click to restore this filter state"
              >
                <span className="text-xs flex-shrink-0">{activityIcon(entry.type)}</span>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs text-text-secondary group-hover:text-text-primary truncate">{entry.label}</span>
                  <span className="text-xs text-text-muted">{timeAgo(entry.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* User History — DB-backed, user-scoped */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="label">My History</div>
            {user && dbHistory.length > 0 && (
              <button
                className="text-xs text-text-muted hover:text-text-primary"
                onClick={handleClearHistory}
                title="Clear all history"
              >
                Clear all
              </button>
            )}
          </div>
          {!user ? (
            <div className="text-text-muted text-xs">Log in to save your history across sessions.</div>
          ) : dbHistory.length === 0 ? (
            <div className="text-text-muted text-xs">No history saved yet.</div>
          ) : (
            dbHistory.slice(0, 20).map((item) => (
              <div key={item.history_id} className="flex items-start gap-2 py-1.5 group hover:bg-bg-hover rounded px-1">
                <span className="text-xs flex-shrink-0">🕑</span>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs text-text-secondary truncate">{item.search_query}</span>
                  <span className="text-xs text-text-muted">{timeAgo(item.timestamp)}</span>
                </div>
                <button
                  className="text-text-muted hover:text-text-primary text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={() => removeHistoryItem(item.history_id)}
                  title="Remove"
                >✕</button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}