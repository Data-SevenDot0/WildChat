import { useEffect, useState } from "react";
import type { ConversationRow, ConversationDetail } from "../types";
import { fetchConversationDetail } from "../api";

interface Props {
  selected: ConversationRow | null;
}

const TURN_COLORS = ["#f59e0b", "#d97706", "#fbbf24", "#b45309", "#e0e0e0", "#888888"];

const SAVED_PRESETS = [
  "Russian · GPT-4 · 6+ turns",
  "US · English · 2023",
  "HK · Chinese · GPT-3.5",
];

const SESSION_HISTORY = [
  "Searched \"transformer\"",
  "Filter: Russia + GPT-4",
  "Opened a1b2c3d4...",
  "Drilled into Hong Kong",
  'Searched "coding"',
];

function ConversationFlow({ detail }: { detail: ConversationDetail }) {
  const turns = Math.min(detail.turns, 8);
  return (
    <div>
      <div className="label mb-2">Conversation Flow</div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: turns }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="status-dot flex-shrink-0"
              style={{ background: TURN_COLORS[i % TURN_COLORS.length] }}
            />
            <div className="flex-1 h-1.5 rounded" style={{ background: TURN_COLORS[i % TURN_COLORS.length] + "40" }} />
            <span className="text-text-secondary text-xs">Turn {i + 1}</span>
          </div>
        ))}
      </div>
      {detail.tags.length > 0 && (
        <div className="mt-2 text-xs text-text-secondary">
          Topic shift detected at turn 2
        </div>
      )}
    </div>
  );
}

export default function RightPanel({ selected }: Props) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetail(null);
    setLoading(true);
    fetchConversationDetail(selected.full_hash)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [selected?.full_hash]);

  const preview = detail?.messages.find((m) => m.role === "user")?.content ?? "";

  return (
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
              <span className="text-text-secondary text-xs">· {detail.country}</span>
            </div>
            {detail.messages.slice(0, 3).map((msg, i) => (
              <div key={i} className="mb-2">
                <div
                  className="text-xs font-medium mb-0.5"
                  style={{ color: msg.role === "user" ? "#f59e0b" : "#e0e0e0" }}
                >
                  {msg.role === "user" ? "User" : "Assistant"}:
                </div>
                <div className="text-xs text-text-primary leading-relaxed" style={{ maxHeight: 80, overflow: "hidden" }}>
                  {msg.content.slice(0, 220)}{msg.content.length > 220 ? "…" : ""}
                </div>
              </div>
            ))}
            <button className="text-xs text-accent-green hover:underline mt-1">
              View full thread →
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
            <button className="text-xs text-text-secondary hover:text-accent-green mt-1">
              + Add note…
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {[
              { color: "#22c55e", text: "Possible prompt injection — flag for review" },
              { color: "#f59e0b", text: "Topic shifts mid-conversation" },
              { color: "#f59e0b", text: "Long-form coding session" },
            ].map(({ color, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className="status-dot flex-shrink-0" style={{ background: color }} />
                <span className="text-xs text-text-primary">{text}</span>
              </div>
            ))}
            <button className="text-xs text-text-secondary hover:text-accent-green mt-1">
              + Add note…
            </button>
          </div>
        )}
      </div>

      {/* Saved Presets */}
      <div className="p-4 border-b border-border-base">
        <div className="label mb-2">Saved Presets</div>
        {SAVED_PRESETS.map((p) => (
          <div key={p} className="flex items-center justify-between py-1.5 cursor-pointer hover:text-accent-green group">
            <div className="flex items-center gap-2">
              <span className="status-dot" style={{ background: "#f59e0b", opacity: 0.5 }} />
              <span className="text-xs text-text-primary group-hover:text-accent-green">{p}</span>
            </div>
            <span className="text-text-muted text-xs">↺</span>
          </div>
        ))}
      </div>

      {/* User & Session History */}
      <div className="p-4">
        <div className="label mb-2">User & Session History</div>
        {SESSION_HISTORY.map((h) => (
          <div key={h} className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-accent-green group">
            <span className="text-text-muted text-xs">↳</span>
            <span className="text-xs text-text-secondary group-hover:text-accent-green">{h}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
