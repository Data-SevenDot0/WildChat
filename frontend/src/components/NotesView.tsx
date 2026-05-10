import { useEffect, useState } from "react";
import { fetchNotes, createNote, deleteNote } from "../api";
import type { Note } from "../types";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotesView() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    setLoading(true);
    setError("");
    fetchNotes(user.token)
      .then(setNotes)
      .catch(() => setError("Could not load notes."))
      .finally(() => setLoading(false));
  }, [user?.user_id, user?.token]);

  useEffect(() => {
    const handler = (e: Event) => {
      const note = (e as CustomEvent<Note>).detail;
      setNotes((prev) => [note, ...prev]);
    };
    window.addEventListener("wc:note-created", handler);
    return () => window.removeEventListener("wc:note-created", handler);
  }, []);

  async function handleSave() {
    if (!draft.trim() || !user) return;
    setSaving(true);
    setSaveError("");
    try {
      const created = await createNote(draft.trim(), user.token);
      setNotes((prev) => [created, ...prev]);
      setDraft("");
      setComposing(false);
    } catch {
      setSaveError("Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(noteId: number) {
    if (!user) return;
    try {
      await deleteNote(noteId, user.token);
      setNotes((prev) => prev.filter((note) => note.note_id !== noteId));
    } catch {
      setError("Failed to delete note.");
    }
  }

  if (!user) {
    return (
      <div className="card p-5">
        <div className="label mb-2">Notes</div>
        <div className="text-text-muted text-sm">Log in to view and manage your notes.</div>
        <button
          className="filter-btn active text-xs mt-3"
          style={{ justifyContent: "center", padding: "6px 10px" }}
          onClick={() => document.dispatchEvent(new CustomEvent("wc:open-login"))}
        >
          Log in
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="label mb-1">Notes</div>
          <div className="text-xs text-text-muted">All notes saved to your account.</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{notes.length} total</span>
          {!composing && (
            <button
              className="filter-btn active text-xs"
              style={{ padding: "4px 10px" }}
              onClick={() => setComposing(true)}
            >
              + New note
            </button>
          )}
        </div>
      </div>

      {composing && (
        <div
          className="mb-5 rounded-xl border p-4 flex flex-col gap-3"
          style={{ borderColor: colors.accent + "66", background: colors.bgCard }}
        >
          <textarea
            autoFocus
            className="w-full bg-transparent text-text-primary text-sm outline-none placeholder-text-muted resize-none"
            style={{ minHeight: 100 }}
            placeholder="Write a note…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
              if (e.key === "Escape") { setComposing(false); setDraft(""); setSaveError(""); }
            }}
          />
          {saveError && <div className="text-xs" style={{ color: "#ef4444" }}>{saveError}</div>}
          <div className="flex items-center gap-3">
            <button
              className="filter-btn active text-xs"
              style={{ padding: "4px 10px" }}
              onClick={handleSave}
              disabled={!draft.trim() || saving}
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            <button
              className="text-xs text-text-muted hover:text-text-primary"
              onClick={() => { setComposing(false); setDraft(""); setSaveError(""); }}
            >
              Cancel
            </button>
            <span className="text-xs text-text-muted ml-auto">⌘↵ to save · Esc to cancel</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-text-muted text-sm">Loading notes…</div>
      ) : error ? (
        <div className="text-xs" style={{ color: "#ef4444" }}>{error}</div>
      ) : notes.length === 0 ? (
        <div className="text-text-muted text-sm">No notes yet. Click "+ New note" to get started.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.note_id}
              className="rounded-xl border p-4 flex flex-col gap-3"
              style={{ borderColor: colors.borderBase, background: colors.bgCard }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{note.content}</div>
                <button
                  className="text-text-muted hover:text-text-primary text-xs flex-shrink-0"
                  onClick={() => removeNote(note.note_id)}
                  title="Delete note"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span>{timeAgo(note.created_at)}</span>
                {note.conversation_hash ? (
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: colors.borderBase }}>
                    Conversation {note.conversation_hash.slice(0, 8)}…
                  </span>
                ) : (
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: colors.borderBase }}>
                    General note
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
