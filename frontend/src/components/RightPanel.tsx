import { useEffect, useRef, useState } from "react";
import type {
  ConversationRow, ConversationDetail, FilterPreset, ActivityEntry,
  Note, Filters, MyHistoryEntry, Message,
} from "../types";
import {
  fetchConversationDetail, fetchNotes, createNote, deleteNote,
  fetchTranslation, requestTranslation,
} from "../api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
// Fix 5 — tag assignment in conversation preview
import { useTagContext } from "../context/TagContext";

// ── Constants ─────────────────────────────────────────────────────────────────

// Fix 2 — My History is localStorage-based, not DB-backed
const MY_HISTORY_KEY = "wc_my_history";
const MY_HISTORY_MAX = 500;

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

function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Fix 2 — format a filter snapshot as a concise human-readable string
function formatFilterSnapshot(f: Filters): string {
  const parts: string[] = [];
  if (f.model) parts.push(`model: ${f.model}`);
  if (f.language) parts.push(`lang: ${f.language}`);
  if (f.country) parts.push(`country: ${f.country}`);
  if (f.redactedOnly) parts.push("redacted only");
  if (f.topicFilter) parts.push(`topic: ${f.topicFilter}`);
  if (f.dateFrom) parts.push(`from: ${f.dateFrom.slice(0, 7)}`);
  if (f.dateTo) parts.push(`to: ${f.dateTo.slice(0, 7)}`);
  if (f.turnMin > 0) parts.push(`turns ≥ ${f.turnMin}`);
  if (f.turnMax > 0) parts.push(`turns ≤ ${f.turnMax}`);
  return parts.length > 0 ? parts.join(" · ") : "all conversations";
}

// ── Thread modal ──────────────────────────────────────────────────────────────

interface ThreadModalProps {
  detail: ConversationDetail;
  onClose: () => void;
  translatedMessages: Message[] | null;
  translating: boolean;
  translateError: string;
  onTranslate: () => void;
  onShowOriginal: () => void;
}

function ThreadModal({ detail, onClose, translatedMessages, translating, translateError, onTranslate, onShowOriginal }: ThreadModalProps) {
  const { colors } = useTheme();
  const messages = translatedMessages ?? detail.messages;
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
          <div className="flex items-center gap-3">
            {detail.language !== "English" && (
              translatedMessages ? (
                <div className="flex items-center gap-1.5">
                  <span className="status-dot ok" />
                  <span className="text-xs text-text-muted">Translated</span>
                  <button className="text-xs text-text-muted hover:underline" onClick={onShowOriginal}>Show original</button>
                </div>
              ) : (
                <button
                  className="filter-btn text-xs"
                  style={{ padding: "3px 8px" }}
                  onClick={onTranslate}
                  disabled={translating}
                >
                  {translating ? "Translating…" : "Translate to English"}
                </button>
              )
            )}
            <button className="text-text-secondary hover:text-text-primary text-lg leading-none" onClick={onClose}>×</button>
          </div>
        </div>

        {translateError && (
          <div className="px-5 py-1.5 border-b border-border-subtle flex-shrink-0 text-xs" style={{ color: "#ef4444" }}>{translateError}</div>
        )}

        {detail.tags.length > 0 && (
          <div className="px-5 py-2 border-b border-border-subtle flex flex-wrap gap-1 flex-shrink-0">
            {detail.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {messages.map((msg, i) => (
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

// ── Conversation flow mini-viz ────────────────────────────────────────────────

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
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function RightPanel({ selected, presets = [], activityLog = [], onApplyPreset, onDeletePreset, onRestoreActivity }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  // Fix 5 — tag context for conversation tag selector
  const { tags, getConvTags, assignTag, unassignTag } = useTagContext();

  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [noteError, setNoteError] = useState("");
  const [linkToConversation, setLinkToConversation] = useState(true);
  const [translatedMessages, setTranslatedMessages] = useState<Message[] | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  // ── Fix 2: My History — localStorage-backed persistent log ──────────────────
  const [myHistory, setMyHistory] = useState<MyHistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(MY_HISTORY_KEY) || "[]"); }
    catch { return []; }
  });
  // Ref prevents StrictMode double-fire from adding the same activityLog entry twice
  const lastMyHistoryId = useRef<string | null>(null);

  function addMyHistoryEntry(type: MyHistoryEntry["type"], label: string) {
    const entry: MyHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type, label,
      timestamp: new Date().toISOString(),
    };
    setMyHistory(prev => {
      const next = [entry, ...prev].slice(0, MY_HISTORY_MAX);
      localStorage.setItem(MY_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearMyHistory() {
    setMyHistory([]);
    localStorage.removeItem(MY_HISTORY_KEY);
  }

  // Sync new activityLog entries → My History (all types except raw "filter" which are too noisy)
  useEffect(() => {
    if (activityLog.length === 0) return;
    const latest = activityLog[0];
    if (latest.id === lastMyHistoryId.current) return; // Fix 1 guard against StrictMode double-fire
    lastMyHistoryId.current = latest.id;
    // Log all meaningful event types; raw "filter" changes are covered by Session History
    addMyHistoryEntry(latest.type as MyHistoryEntry["type"], latest.label);
  }, [activityLog[0]?.id]);
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetail(null);
    setTranslatedMessages(null);
    setTranslateError("");
    setLoading(true);
    fetchConversationDetail(selected.full_hash)
      .then(async (d) => {
        setDetail(d);
        if (d.language !== "English") {
          const cached = await fetchTranslation(d.conversation_hash).catch(() => null);
          if (cached) setTranslatedMessages(JSON.parse(cached.translated_content));
        }
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [selected?.full_hash]);

  async function handleTranslate() {
    if (!detail) return;
    setTranslating(true);
    setTranslateError("");
    try {
      const result = await requestTranslation(detail.conversation_hash, detail.messages, detail.language);
      setTranslatedMessages(JSON.parse(result.translated_content));
    } catch {
      setTranslateError("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  }

  useEffect(() => {
    setShowThread(false);
    setNoteInput("");
    setNoteError("");
    setNotes([]);
    setLinkToConversation(Boolean(selected));
    if (!user) return;
    fetchNotes(user.token, selected?.full_hash)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [selected?.full_hash, user?.user_id]);

  async function addNote() {
    if (!noteInput.trim() || !user) return;
    setNoteError("");
    try {
      const created = await createNote(
        noteInput.trim(),
        user.token,
        selected && linkToConversation ? selected.full_hash : undefined,
      );
      setNotes((prev) => [created, ...prev]);
      setNoteInput("");
      window.dispatchEvent(new CustomEvent("wc:note-created", { detail: created }));
      addMyHistoryEntry("annotation", detail?.conversation_hash ? `Note on ${detail.conversation_hash.slice(0, 8)}…` : "General note");
    } catch {
      setNoteError("Failed to save note.");
    }
  }

  async function removeNote(id: number) {
    if (!user) return;
    try {
      await deleteNote(id, user.token);
      setNotes((prev) => prev.filter((note) => note.note_id !== id));
    } catch {
      setNoteError("Failed to delete note.");
    }
  }

  // Fix 5 — handle tag toggling for the selected conversation
  function handleToggleTag(tagId: string) {
    if (!detail) return;
    const hash = detail.full_hash;
    const assigned = getConvTags(hash).some(t => t.id === tagId);
    if (assigned) {
      unassignTag(hash, tagId);
    } else {
      // Pass selected so TagContext can store the conversation row for cross-page tag filtering
      assignTag(hash, tagId, selected ?? undefined);
      const tagName = tags.find(t => t.id === tagId)?.name ?? tagId;
      addMyHistoryEntry("tag", `Tagged "${detail.conversation_hash.slice(0, 8)}…" as ${tagName}`);
    }
  }

  // ── Fix 2: Session History — filter entries only (max 10) ──────────────────
  // Shows only entries where the user changed a filter combination.
  const sessionHistory = activityLog
    .filter(e => e.type === "filter" || e.type === "country")
    .slice(0, 10);
  // ─────────────────────────────────────────────────────────────────────────────

  const myHistoryIcon: Record<MyHistoryEntry["type"], string> = {
    conversation: "💬", annotation: "📝", search: "🔍",
    country: "🌍", filter: "⊞", tag: "🏷", graph: "📊", preset: "📌",
  };

  return (
    <>
      {showThread && detail && (
        <ThreadModal
          detail={detail}
          onClose={() => setShowThread(false)}
          translatedMessages={translatedMessages}
          translating={translating}
          translateError={translateError}
          onTranslate={handleTranslate}
          onShowOriginal={() => setTranslatedMessages(null)}
        />
      )}

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

              {/* Topic tags — max 3 in preview, rest visible in full thread */}
              {detail.tags.filter(t => t !== "untagged").length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1 items-center">
                  {detail.tags.filter(t => t !== "untagged").slice(0, 3).map(tag => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                  {detail.tags.filter(t => t !== "untagged").length > 3 && (
                    <button
                      className="text-xs hover:underline"
                      style={{ color: colors.textMuted }}
                      onClick={() => setShowThread(true)}
                    >
                      +{detail.tags.filter(t => t !== "untagged").length - 3} more
                    </button>
                  )}
                </div>
              )}

              {(translatedMessages ?? detail.messages).slice(0, 3).map((msg: Message, i: number) => (
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

              {/* Translation controls */}
              {detail.language !== "English" && (
                <div className="mt-2 flex flex-col gap-1">
                  {translatedMessages ? (
                    <div className="flex items-center gap-1.5">
                      <span className="status-dot ok" />
                      <span className="text-xs text-text-muted">Translated from {detail.language}</span>
                      <button className="text-xs text-text-muted hover:underline ml-1" onClick={() => setTranslatedMessages(null)}>Show original</button>
                    </div>
                  ) : (
                    <button
                      className="filter-btn text-xs"
                      style={{ justifyContent: "center", padding: "4px 8px" }}
                      onClick={handleTranslate}
                      disabled={translating}
                    >
                      {translating ? "Translating…" : "Translate to English"}
                    </button>
                  )}
                  {translateError && <div className="text-xs" style={{ color: "#ef4444" }}>{translateError}</div>}
                </div>
              )}

              {/* Fix 5 — Tag selector for this conversation */}
              {tags.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-text-muted mb-1.5">Your tags</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => {
                      const isAssigned = getConvTags(detail.full_hash).some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          className="text-xs px-2 py-0.5 rounded-full transition-opacity"
                          style={{
                            background: isAssigned ? tag.color + "33" : colors.bgHover,
                            color: isAssigned ? tag.color : colors.textMuted,
                            border: `1px solid ${isAssigned ? tag.color + "66" : colors.borderBase}`,
                            fontWeight: isAssigned ? 600 : 400,
                            cursor: "pointer",
                          }}
                          title={isAssigned ? `Remove tag "${tag.name}"` : `Apply tag "${tag.name}"`}
                        >
                          {isAssigned ? "✓ " : ""}{tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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

        {/* Notes */}
        <div className="p-4 border-b border-border-base">
          <div className="label mb-2">Notes</div>
          {!user ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-text-muted">Log in to save personal notes.</div>
              <button
                className="filter-btn active text-xs"
                style={{ justifyContent: "center", padding: "6px" }}
                onClick={() => document.dispatchEvent(new CustomEvent("wc:open-login"))}
              >
                Log in
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selected ? (
                <label className="flex items-center gap-2 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={linkToConversation}
                    onChange={(e) => setLinkToConversation(e.target.checked)}
                  />
                  Link this note to the selected conversation
                </label>
              ) : (
                <div className="text-xs text-text-muted">No conversation is selected, so this will be a general note.</div>
              )}
              <textarea
                className="w-full bg-transparent text-text-primary text-xs outline-none border border-border-subtle rounded p-2 placeholder-text-muted min-h-[72px]"
                placeholder="Add note…"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <button className="text-xs hover:underline" style={{ color: colors.accent }} onClick={addNote} disabled={!noteInput.trim()}>
                  Save note
                </button>
                <span className="text-xs text-text-muted">
                  {selected && linkToConversation ? "Conversation note" : "General note"}
                </span>
              </div>
              {noteError && <div className="text-xs" style={{ color: "#ef4444" }}>{noteError}</div>}
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Recent notes</span>
                  <span className="text-xs text-text-muted">{notes.length}</span>
                </div>
                {notes.length === 0 ? (
                  <div className="text-xs text-text-muted">No notes found yet.</div>
                ) : (
                  notes.slice(0, 4).map((note) => (
                    <div key={note.note_id} className="flex flex-col gap-0.5 mt-1 p-2 rounded group" style={{ background: colors.bgHover, border: `1px solid ${colors.borderBase}` }}>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs text-text-primary flex-1 whitespace-pre-wrap">{note.content}</span>
                        <button
                          className="text-text-muted hover:text-text-primary text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
                          onClick={() => removeNote(note.note_id)}
                          title="Delete note"
                        >✕</button>
                      </div>
                      <span className="text-xs text-text-muted">
                        {timeAgo(note.created_at)}{note.conversation_hash ? ` · ${note.conversation_hash.slice(0, 8)}…` : " · general"}
                      </span>
                    </div>
                  ))
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

        {/* ── Fix 2: Session History — filter combinations only ──────────────── */}
        <div className="p-4 border-b border-border-base">
          <div className="flex items-center justify-between mb-2">
            <div className="label">Session History</div>
            <span className="text-xs text-text-muted">{sessionHistory.length} filters</span>
          </div>
          <div className="text-xs text-text-muted mb-2" style={{ fontSize: "0.65rem" }}>
            Filter combinations this session. Click to restore.
          </div>
          {sessionHistory.length === 0 ? (
            <div className="text-text-muted text-xs">No filter changes yet.</div>
          ) : (
            sessionHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-0.5 py-1.5 px-1 rounded cursor-pointer hover:bg-bg-hover group"
                onClick={() => onRestoreActivity && onRestoreActivity(entry)}
                title="Click to restore this filter state"
              >
                <span className="text-xs text-text-secondary group-hover:text-text-primary leading-snug">
                  {formatFilterSnapshot(entry.filterSnapshot)}
                </span>
                <span className="text-xs" style={{ color: colors.textMuted, fontSize: "0.65rem" }}>
                  {timeAgo(entry.timestamp)}
                  {entry.type === "country" && " · via map"}
                </span>
              </div>
            ))
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* ── Fix 2: My History — localStorage, all action types, 500 entries ── */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="label">My History</div>
            {myHistory.length > 0 && (
              <button
                className="text-xs text-text-muted hover:text-text-primary"
                onClick={clearMyHistory}
                title="Clear all history"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="text-xs text-text-muted mb-2" style={{ fontSize: "0.65rem" }}>
            Persists across sessions · {myHistory.length}/{MY_HISTORY_MAX} entries
          </div>
          {myHistory.length === 0 ? (
            <div className="text-text-muted text-xs">No history yet.</div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto" }} className="flex flex-col gap-0">
              {myHistory.map((item) => (
                <div key={item.id} className="flex items-start gap-2 py-1.5 px-1 rounded hover:bg-bg-hover">
                  <span className="text-xs flex-shrink-0" style={{ marginTop: 1 }}>
                    {myHistoryIcon[item.type] ?? "↳"}
                  </span>
                  <div className="flex flex-col gap-0 flex-1 min-w-0">
                    <span className="text-xs text-text-secondary truncate">{item.label}</span>
                    <span className="text-xs" style={{ color: colors.textMuted, fontSize: "0.65rem" }}>
                      {fullTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}
      </aside>
    </>
  );
}
