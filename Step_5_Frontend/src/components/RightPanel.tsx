import { useEffect, useState } from "react";
import type { ConversationRow, ConversationDetail, FilterPreset, ActivityEntry, Filters } from "../types";
import { fetchConversationDetail } from "../api";

interface Props {
  selected: ConversationRow | null;
  presets?: FilterPreset[];
  activityLog?: ActivityEntry[];
  onApplyPreset?: (preset: FilterPreset) => void;
  onDeletePreset?: (id: string) => void;
  onRestoreActivity?: (entry: ActivityEntry) => void;
}

interface AnnotationNote {
  text: string;
  timestamp: string;
}

type AnnotationsMap = Record<string, AnnotationNote[]>;

const TURN_COLORS = ["#f59e0b", "#d97706", "#fbbf24", "#b45309", "#e0e0e0", "#6b7280"];

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
            <span className="font-mono text-xs text-accent-green">{detail.conversation_hash.slice(0, 8)}…</span>
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
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: msg.role === "user" ? "#f59e0b" : "#e0e0e0" }}>
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
  const turns = Math.min(detail.turns, 8);
  return (
    <div>
      <div className="label mb-2">Conversation Flow</div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: turns }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="status-dot flex-shrink-0" style={{ background: TURN_COLORS[i % TURN_COLORS.length] }} />
            <div className="flex-1 h-1.5 rounded" style={{ background: TURN_COLORS[i % TURN_COLORS.length] + "40" }} />
            <span className="text-text-secondary text-xs">Turn {i + 1}</span>
          </div>
        ))}
      </div>
      {detail.tags.length > 0 && (
        <div className="mt-2 text-xs text-text-secondary">Topic shift detected at turn 2</div>
      )}
    </div>
  );
}

export default function RightPanel({ selected, presets = [], activityLog = [], onApplyPreset, onDeletePreset, onRestoreActivity }: Props) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationsMap>({});
  const [noteInput, setNoteInput] = useState("");

  // Load annotations from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("wc_annotations") || "{}");
      setAnnotations(stored);
    } catch {
      setAnnotations({});
    }
  }, []);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetail(null);
    setLoading(true);
    fetchConversationDetail(selected.full_hash)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [selected?.full_hash]);

  useEffect(() => { setShowThread(false); setNoteInput(""); }, [selected?.full_hash]);

  function addNote() {
    if (!noteInput.trim() || !selected) return;
    const hash = selected.full_hash;
    const note: AnnotationNote = { text: noteInput.trim(), timestamp: new Date().toISOString() };
    setAnnotations((prev) => {
      const next = { ...prev, [hash]: [...(prev[hash] || []), note] };
      sessionStorage.setItem("wc_annotations", JSON.stringify(next));
      return next;
    });
    setNoteInput("");
  }

  const currentNotes = selected ? (annotations[selected.full_hash] || []) : [];
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
                <span className="font-mono text-xs text-accent-green">{detail.conversation_hash.slice(0, 8)}…</span>
                <span className="text-text-secondary text-xs">{detail.turns} turns</span>
                <span className="text-text-secondary text-xs">· {detail.language}</span>
              </div>
              {detail.messages.slice(0, 3).map((msg, i) => (
                <div key={i} className="mb-2">
                  <div className="text-xs font-medium mb-0.5" style={{ color: msg.role === "user" ? "#f59e0b" : "#e0e0e0" }}>
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
          {detail ? (
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
              {currentNotes.map((note, i) => (
                <div key={i} className="flex flex-col gap-0.5 mt-1 p-2 rounded" style={{ background: "#1a1a1a", border: "1px solid #303030" }}>
                  <span className="text-xs text-text-primary">{note.text}</span>
                  <span className="text-xs text-text-muted">{timeAgo(note.timestamp)}</span>
                </div>
              ))}
              <div className="flex gap-1 mt-1">
                <input
                  className="flex-1 bg-transparent text-text-primary text-xs outline-none border-b border-border-subtle placeholder-text-muted"
                  placeholder="Add note…"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                />
                {noteInput && (
                  <button className="text-xs text-accent-green hover:underline" onClick={addNote}>Save</button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[
                { color: "#f59e0b", text: "Possible prompt injection — flag" },
                { color: "#fbbf24", text: "Topic shifts mid-conversation" },
              ].map(({ color, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <span className="status-dot flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs text-text-primary">{text}</span>
                </div>
              ))}
              <div className="text-xs text-text-muted mt-1">Select a conversation to annotate</div>
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
                  <span className="status-dot" style={{ background: "#f59e0b", opacity: 0.6 }} />
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
          <div className="label mb-2">Session History</div>
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

        {/* User Tracking History */}
        <div className="p-4">
          <div className="label mb-2">User Tracking History</div>
          {trackingHistory.length === 0 ? (
            <div className="text-text-muted text-xs">No tracked actions yet.</div>
          ) : (
            trackingHistory.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 py-1.5">
                <span className="text-xs flex-shrink-0">{activityIcon(entry.type)}</span>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs text-text-secondary truncate">{entry.label}</span>
                  <span className="text-xs text-text-muted">{timeAgo(entry.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
