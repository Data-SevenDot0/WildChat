// ── Fix 5: User-created custom tags ─────────────────────────────────────────
// Manages tag definitions and their assignments to conversations in localStorage.

import { createContext, useContext, useState } from "react";
import type { UserTag, TagAssignments } from "../types";

// Six preset colours users can pick from when creating a tag
export const TAG_PALETTE = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
];

const TAGS_KEY = "wc_user_tags";
const ASSIGN_KEY = "wc_tag_assignments";

interface TagContextValue {
  tags: UserTag[];
  assignments: TagAssignments;
  createTag: (name: string, color: string) => UserTag;
  deleteTag: (id: string) => void;
  assignTag: (convHash: string, tagId: string) => void;
  unassignTag: (convHash: string, tagId: string) => void;
  getConvTags: (convHash: string) => UserTag[];
  getTagById: (id: string) => UserTag | undefined;
}

const TagContext = createContext<TagContextValue | null>(null);

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<UserTag[]>(() => {
    try { return JSON.parse(localStorage.getItem(TAGS_KEY) || "[]"); }
    catch { return []; }
  });

  const [assignments, setAssignments] = useState<TagAssignments>(() => {
    try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || "{}"); }
    catch { return {}; }
  });

  function createTag(name: string, color: string): UserTag {
    const tag: UserTag = { id: `tag-${Date.now()}`, name, color, createdAt: new Date().toISOString() };
    setTags(prev => {
      const next = [...prev, tag];
      localStorage.setItem(TAGS_KEY, JSON.stringify(next));
      return next;
    });
    return tag;
  }

  function deleteTag(id: string) {
    setTags(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem(TAGS_KEY, JSON.stringify(next));
      return next;
    });
    // Remove this tag from all conversation assignments
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(hash => {
        next[hash] = next[hash].filter(tid => tid !== id);
      });
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(next));
      return next;
    });
  }

  function assignTag(convHash: string, tagId: string) {
    setAssignments(prev => {
      const current = prev[convHash] || [];
      if (current.includes(tagId)) return prev;
      const next = { ...prev, [convHash]: [...current, tagId] };
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(next));
      return next;
    });
  }

  function unassignTag(convHash: string, tagId: string) {
    setAssignments(prev => {
      const next = { ...prev, [convHash]: (prev[convHash] || []).filter(id => id !== tagId) };
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(next));
      return next;
    });
  }

  function getConvTags(convHash: string): UserTag[] {
    const ids = assignments[convHash] || [];
    return tags.filter(t => ids.includes(t.id));
  }

  function getTagById(id: string): UserTag | undefined {
    return tags.find(t => t.id === id);
  }

  return (
    <TagContext.Provider value={{ tags, assignments, createTag, deleteTag, assignTag, unassignTag, getConvTags, getTagById }}>
      {children}
    </TagContext.Provider>
  );
}

export function useTagContext(): TagContextValue {
  const ctx = useContext(TagContext);
  if (!ctx) throw new Error("useTagContext must be inside TagProvider");
  return ctx;
}
