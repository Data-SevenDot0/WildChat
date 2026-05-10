// ── Fix 5: Manage Tags view ───────────────────────────────────────────────────
// Lets users create and delete their custom tags with a chosen colour.
// Accessible from the Sidebar → "Manage tags" nav item.

import { useState } from "react";
import { useTagContext, TAG_PALETTE } from "../context/TagContext";
import { useTheme } from "../context/ThemeContext";

export default function TagManager() {
  const { colors } = useTheme();
  const { tags, assignments, createTag, deleteTag } = useTagContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_PALETTE[0]);
  const [error, setError] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Tag name is required."); return; }
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("A tag with that name already exists."); return;
    }
    createTag(trimmed, color);
    setName("");
    setColor(TAG_PALETTE[0]);
    setError("");
  }

  // Count how many conversations each tag is assigned to
  function assignmentCount(tagId: string): number {
    return Object.values(assignments).filter(ids => ids.includes(tagId)).length;
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 560 }}>
      <div className="card p-4">
        <div className="label mb-3">Create New Tag</div>
        <div className="flex items-center gap-3 mb-3">
          <input
            className="flex-1 bg-transparent text-text-primary text-sm outline-none border-b border-border-subtle placeholder-text-muted px-1 py-1"
            placeholder="Tag name…"
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            maxLength={32}
          />
        </div>

        {/* Colour picker */}
        <div className="flex items-center gap-2 mb-4">
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
          {/* Preview */}
          {name.trim() && (
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-2"
              style={{ background: color + "33", color, border: `1px solid ${color}60`, fontWeight: 500 }}
            >
              {name.trim()}
            </span>
          )}
        </div>

        {error && <div className="text-xs mb-2" style={{ color: "#ef4444" }}>{error}</div>}

        <button
          className="filter-btn active text-xs"
          style={{ padding: "6px 16px" }}
          onClick={handleCreate}
        >
          Create Tag
        </button>
      </div>

      {/* Existing tags */}
      <div className="card p-4">
        <div className="label mb-3">Your Tags ({tags.length})</div>
        {tags.length === 0 ? (
          <div className="text-xs text-text-muted">No tags yet. Create one above.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between py-2 px-3 rounded group"
                style={{ background: colors.bgHover, border: `1px solid ${colors.borderBase}` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: tag.color + "33", color: tag.color, border: `1px solid ${tag.color}60`, fontWeight: 500 }}
                  >
                    {tag.name}
                  </span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {assignmentCount(tag.id)} conversation{assignmentCount(tag.id) !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    Created {new Date(tag.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="text-text-muted hover:text-text-primary text-xs opacity-0 group-hover:opacity-100"
                  onClick={() => deleteTag(tag.id)}
                  title="Delete tag (removes from all conversations)"
                >
                  ✕ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
