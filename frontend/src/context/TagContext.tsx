import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { UserTag } from "../types";
import { useAuth } from "./AuthContext";
import {
  fetchUserTags,
  createUserTag,
  updateUserTag as apiUpdateTag,
  deleteUserTag as apiDeleteTag,
  fetchTagHashes,
} from "../api";
import type { TagPayload } from "../api";

export const TAG_PALETTE = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
];

interface TagContextValue {
  tags: UserTag[];
  loading: boolean;
  saving: boolean;
  createTag: (name: string, color: string, keywords: string[]) => Promise<UserTag>;
  updateTag: (id: string, payload: Partial<TagPayload>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  loadTagHashes: (tagId: string) => Promise<void>;
  getConvTags: (convHash: string) => UserTag[];
  getTagById: (id: string) => UserTag | undefined;
  isHashInTag: (convHash: string, tagId: string) => boolean;
  refreshTags: () => Promise<void>;
}

const TagContext = createContext<TagContextValue | null>(null);

export function TagProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tags, setTags] = useState<UserTag[]>([]);
  const [tagHashes, setTagHashes] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedTagIds = useRef<Set<string>>(new Set());

  async function loadTags(token: string) {
    setLoading(true);
    try {
      const fetched = await fetchUserTags(token);
      setTags(fetched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.token) {
      loadedTagIds.current.clear();
      setTagHashes({});
      loadTags(user.token);
    } else {
      setTags([]);
      setTagHashes({});
      loadedTagIds.current.clear();
    }
  }, [user?.token]);

  async function loadTagHashes(tagId: string) {
    if (!user?.token || loadedTagIds.current.has(tagId)) return;
    loadedTagIds.current.add(tagId); // mark before await to prevent duplicate fetches
    const hashes = await fetchTagHashes(tagId, user.token);
    setTagHashes(prev => ({ ...prev, [tagId]: new Set(hashes) }));
  }

  async function refreshTags() {
    if (user?.token) await loadTags(user.token);
  }

  async function createTag(name: string, color: string, keywords: string[]): Promise<UserTag> {
    if (!user?.token) throw new Error("Not authenticated");
    setSaving(true);
    try {
      const tag = await createUserTag({ name, color, keywords }, user.token);
      setTags(prev => [...prev, tag]);
      // Eagerly load hashes for the new tag so the filter works immediately
      const hashes = await fetchTagHashes(tag.id, user.token);
      loadedTagIds.current.add(tag.id);
      setTagHashes(prev => ({ ...prev, [tag.id]: new Set(hashes) }));
      return tag;
    } finally {
      setSaving(false);
    }
  }

  async function updateTag(id: string, payload: Partial<TagPayload>): Promise<void> {
    if (!user?.token) throw new Error("Not authenticated");
    setSaving(true);
    try {
      const updated = await apiUpdateTag(id, payload, user.token);
      setTags(prev => prev.map(t => t.id === id ? updated : t));
      if (payload.keywords !== undefined) {
        // Keywords changed — reload hashes so the filter stays accurate
        loadedTagIds.current.delete(id);
        await loadTagHashes(id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteTag(id: string): Promise<void> {
    if (!user?.token) throw new Error("Not authenticated");
    setSaving(true);
    try {
      await apiDeleteTag(id, user.token);
      setTags(prev => prev.filter(t => t.id !== id));
      loadedTagIds.current.delete(id);
      setTagHashes(prev => { const next = { ...prev }; delete next[id]; return next; });
    } finally {
      setSaving(false);
    }
  }

  function getConvTags(convHash: string): UserTag[] {
    return tags.filter(t => tagHashes[t.id]?.has(convHash));
  }

  function getTagById(id: string): UserTag | undefined {
    return tags.find(t => t.id === id);
  }

  function isHashInTag(convHash: string, tagId: string): boolean {
    return tagHashes[tagId]?.has(convHash) ?? false;
  }

  return (
    <TagContext.Provider value={{
      tags, loading, saving,
      createTag, updateTag, deleteTag, loadTagHashes,
      getConvTags, getTagById, isHashInTag, refreshTags,
    }}>
      {children}
    </TagContext.Provider>
  );
}

export function useTagContext(): TagContextValue {
  const ctx = useContext(TagContext);
  if (!ctx) throw new Error("useTagContext must be inside TagProvider");
  return ctx;
}
