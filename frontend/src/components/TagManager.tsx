import { useState } from "react";
import { useTagContext, TAG_PALETTE } from "../context/TagContext";
import { useTheme } from "../context/ThemeContext";

export default function TagManager() {
  const { colors } = useTheme();
  const { tags, saving, createTag, updateTag, deleteTag } = useTagContext();

  // ── Create form state ────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_PALETTE[0]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [createError, setCreateError] = useState("");

  // ── Edit form state ──────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(TAG_PALETTE[0]);
  const [editKeywordInput, setEditKeywordInput] = useState("");
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editError, setEditError] = useState("");

  // ── Keyword chip helpers ─────────────────────────────────────────────────────
  function addKeyword(kw: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) {
    const trimmed = kw.trim().toLowerCase();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    setInput("");
  }

  function removeKeyword(kw: string, list: string[], setList: (v: string[]) => void) {
    setList(list.filter(k => k !== kw));
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setCreateError("Tag name is required."); return; }
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setCreateError("A tag with that name already exists."); return;
    }
    setCreateError("");
    try {
      await createTag(trimmed, color, keywords);
      setName("");
      setColor(TAG_PALETTE[0]);
      setKeywords([]);
      setKeywordInput("");
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create tag.");
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function startEdit(tag: (typeof tags)[0]) {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditKeywords([...tag.keywords]);
    setEditKeywordInput("");
    setEditError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editId) return;
    const trimmed = editName.trim();
    if (!trimmed) { setEditError("Tag name is required."); return; }
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase() && t.id !== editId)) {
      setEditError("A tag with that name already exists."); return;
    }
    setEditError("");
    try {
      await updateTag(editId, { name: trimmed, color: editColor, keywords: editKeywords });
      setEditId(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed to update tag.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTag(id);
      if (editId === id) setEditId(null);
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 560 }}>
      <div className="card p-3 flex items-start gap-2" style={{ background: "transparent", border: "1px solid var(--color-border-subtle)" }}>
        <span className="text-xs" style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }}>ℹ</span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          Create tags with keywords — the system auto-assigns them to matching conversations. Use the <strong style={{ color: "var(--color-text-secondary)" }}>Tags filter</strong> in the conversation list to browse tagged conversations.
        </span>
      </div>

      {/* ── Create form ───────────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="label mb-3">Create New Tag</div>
        <div className="flex items-center gap-3 mb-3">
          <input
            className="flex-1 bg-transparent text-text-primary text-sm outline-none border-b border-border-subtle placeholder-text-muted px-1 py-1"
            placeholder="Tag name…"
            value={name}
            onChange={e => { setName(e.target.value); setCreateError(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            maxLength={50}
          />
        </div>

        {/* Colour picker */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-text-secondary">Colour:</span>
          {TAG_PALETTE.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => setColor(c)}
              style={{
                width: 20, height: 20, borderRadius: "50%", background: c,
                border: color === c ? `2px solid ${colors.textPrimary}` : "2px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
          {name.trim() && (
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-2"
              style={{ background: color + "33", color, border: `1px solid ${color}60`, fontWeight: 500 }}
            >
              {name.trim()}
            </span>
          )}
        </div>

        {/* Keywords */}
        <div className="mb-3">
          <div className="text-xs text-text-secondary mb-1.5">Keywords (conversations with matching model, language, country, or topic get this tag):</div>
          <div className="flex items-center gap-2 mb-2">
            <input
              className="flex-1 bg-transparent text-text-primary text-xs outline-none border-b border-border-subtle placeholder-text-muted px-1 py-1"
              placeholder="Add keyword and press Enter…"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addKeyword(keywordInput, keywords, setKeywords, setKeywordInput); }}
            />
            <button
              className="filter-btn text-xs"
              style={{ padding: "3px 10px" }}
              onClick={() => addKeyword(keywordInput, keywords, setKeywords, setKeywordInput)}
            >
              Add
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {keywords.map(kw => (
                <span
                  key={kw}
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: color + "22", color, border: `1px solid ${color}44` }}
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw, keywords, setKeywords)}
                    style={{ color, opacity: 0.7, lineHeight: 1 }}
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {createError && <div className="text-xs mb-2" style={{ color: "#ef4444" }}>{createError}</div>}

        <button
          className="filter-btn active text-xs"
          style={{ padding: "6px 16px" }}
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? "Creating…" : "Create Tag"}
        </button>
      </div>

      {/* ── Existing tags ─────────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="label mb-3">Your Tags ({tags.length})</div>
        {tags.length === 0 ? (
          <div className="text-xs text-text-muted">No tags yet. Create one above.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="rounded p-3"
                style={{ background: colors.bgHover, border: `1px solid ${colors.borderBase}` }}
              >
                {editId === tag.id ? (
                  /* ── Edit mode ── */
                  <div className="flex flex-col gap-2">
                    <input
                      className="bg-transparent text-text-primary text-sm outline-none border-b border-border-subtle px-1 py-0.5"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setEditError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      maxLength={50}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">Colour:</span>
                      {TAG_PALETTE.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          style={{
                            width: 16, height: 16, borderRadius: "50%", background: c,
                            border: editColor === c ? `2px solid ${colors.textPrimary}` : "2px solid transparent",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary mb-1">Keywords:</div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          className="flex-1 bg-transparent text-text-primary text-xs outline-none border-b border-border-subtle px-1 py-0.5 placeholder-text-muted"
                          placeholder="Add keyword…"
                          value={editKeywordInput}
                          onChange={e => setEditKeywordInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addKeyword(editKeywordInput, editKeywords, setEditKeywords, setEditKeywordInput); }}
                        />
                        <button
                          className="filter-btn text-xs"
                          style={{ padding: "2px 8px" }}
                          onClick={() => addKeyword(editKeywordInput, editKeywords, setEditKeywords, setEditKeywordInput)}
                        >Add</button>
                      </div>
                      {editKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {editKeywords.map(kw => (
                            <span
                              key={kw}
                              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ background: editColor + "22", color: editColor, border: `1px solid ${editColor}44` }}
                            >
                              {kw}
                              <button
                                onClick={() => removeKeyword(kw, editKeywords, setEditKeywords)}
                                style={{ color: editColor, opacity: 0.7, lineHeight: 1 }}
                              >×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {editError && <div className="text-xs" style={{ color: "#ef4444" }}>{editError}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      <button className="filter-btn active text-xs" style={{ padding: "4px 12px" }} onClick={handleSaveEdit} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button className="filter-btn text-xs" style={{ padding: "4px 12px" }} onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: tag.color + "33", color: tag.color, border: `1px solid ${tag.color}60`, fontWeight: 500 }}
                        >
                          {tag.name}
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          {tag.matchCount.toLocaleString()} conversation{tag.matchCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs"
                          style={{ color: colors.textMuted }}
                          onClick={() => startEdit(tag)}
                        >Edit</button>
                        <button
                          className="text-xs"
                          style={{ color: "#ef4444" }}
                          onClick={() => handleDelete(tag.id)}
                          disabled={saving}
                        >Delete</button>
                      </div>
                    </div>
                    {tag.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tag.keywords.map(kw => (
                          <span
                            key={kw}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: colors.bgBase, color: colors.textMuted, border: `1px solid ${colors.borderBase}` }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
