import { createContext, useContext, useState } from "react";
import type { UserTag, TagAssignments, ConversationRow } from "../types";

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
const STORE_KEY = "wc_tagged_convs";

interface TagContextValue {
  tags: UserTag[];
  assignments: TagAssignments;
  createTag: (name: string, color: string) => UserTag;
  deleteTag: (id: string) => void;
  assignTag: (convHash: string, tagId: string, row?: ConversationRow) => void;
  unassignTag: (convHash: string, tagId: string) => void;
  getConvTags: (convHash: string) => UserTag[];
  getTagById: (id: string) => UserTag | undefined;
  getTaggedConversations: (tagId: string) => ConversationRow[];
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

  // Stores conversation row metadata for all tagged conversations so the tag
  // filter can find them across pages without re-fetching from the server.
  const [conversationStore, setConversationStore] = useState<Record<string, ConversationRow>>(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
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
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(hash => {
        next[hash] = next[hash].filter(tid => tid !== id);
      });
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(next));
      // Clean up conversation store entries with no remaining tags
      setConversationStore(prevStore => {
        const nextStore = { ...prevStore };
        Object.keys(next).forEach(hash => {
          if (next[hash].length === 0) delete nextStore[hash];
        });
        localStorage.setItem(STORE_KEY, JSON.stringify(nextStore));
        return nextStore;
      });
      return next;
    });
  }

  function assignTag(convHash: string, tagId: string, row?: ConversationRow) {
    setAssignments(prev => {
      const current = prev[convHash] || [];
      if (current.includes(tagId)) return prev;
      const next = { ...prev, [convHash]: [...current, tagId] };
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(next));
      return next;
    });
    // Store conversation metadata so tag filter works across all pages
    if (row) {
      setConversationStore(prev => {
        if (prev[convHash]) return prev; // already stored
        const next = { ...prev, [convHash]: row };
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }

  function unassignTag(convHash: string, tagId: string) {
    setAssignments(prev => {
      const remaining = (prev[convHash] || []).filter(id => id !== tagId);
      const next = { ...prev, [convHash]: remaining };
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(next));
      // If no tags remain for this conversation, remove from store
      if (remaining.length === 0) {
        setConversationStore(prevStore => {
          const nextStore = { ...prevStore };
          delete nextStore[convHash];
          localStorage.setItem(STORE_KEY, JSON.stringify(nextStore));
          return nextStore;
        });
      }
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

  function getTaggedConversations(tagId: string): ConversationRow[] {
    return Object.entries(assignments)
      .filter(([, tagIds]) => tagIds.includes(tagId))
      .map(([hash]) => conversationStore[hash])
      .filter(Boolean) as ConversationRow[];
  }

  return (
    <TagContext.Provider value={{ tags, assignments, createTag, deleteTag, assignTag, unassignTag, getConvTags, getTagById, getTaggedConversations }}>
      {children}
    </TagContext.Provider>
  );
}

export function useTagContext(): TagContextValue {
  const ctx = useContext(TagContext);
  if (!ctx) throw new Error("useTagContext must be inside TagProvider");
  return ctx;
}
