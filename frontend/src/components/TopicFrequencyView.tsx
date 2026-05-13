import { useEffect, useState } from "react";
import type { TagFrequencyItem } from "../types";
import { fetchTagFrequency } from "../api";
import { useTheme } from "../context/ThemeContext";

const CATEGORY_COLORS: Record<string, number> = {
  "Research / info": 0,
  "Coding / tech":   1,
  "Writing":         2,
  "Math / science":  3,
  "Translation":     4,
  "Other":           5,
};

interface Props {
  onTopicFilter?: (tag: string) => void;
  activeTopicFilter?: string;
}

export default function TopicFrequencyView({ onTopicFilter, activeTopicFilter }: Props) {
  const { colors } = useTheme();
  const [tags, setTags] = useState<TagFrequencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTagFrequency()
      .then(setTags)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function catColor(cat: string): string {
    const idx = CATEGORY_COLORS[cat];
    if (idx === undefined || idx === 5) return colors.chartMuted;
    return colors.chart[idx] ?? colors.chartMuted;
  }

  function toggleCat(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const filtered = search
    ? tags.filter((t) => t.tag.toLowerCase().includes(search.toLowerCase()))
    : tags;

  // Group by category, preserving sort order within each group
  const grouped = new Map<string, TagFrequencyItem[]>();
  for (const item of filtered) {
    const arr = grouped.get(item.category) ?? [];
    arr.push(item);
    grouped.set(item.category, arr);
  }

  const topTag = tags[0];
  const totalAssignments = tags.reduce((s, t) => s + t.count, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="label mb-2">Unique Tags</div>
          <div className="text-2xl font-semibold text-text-primary">{tags.length}</div>
          <div className="text-xs text-text-secondary mt-1">individual topic tags</div>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Total Tag Assignments</div>
          <div className="text-2xl font-semibold text-text-primary">{totalAssignments.toLocaleString()}</div>
          <div className="text-xs text-text-secondary mt-1">across all conversations</div>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Most Common Tag</div>
          <div className="text-sm font-semibold text-accent-green truncate">{topTag?.tag ?? "—"}</div>
          <div className="text-xs text-text-secondary mt-1">{topTag?.pct ?? 0}% of assignments</div>
        </div>
      </div>

      {/* Search + table */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="label">Tag Frequency by Category</div>
            {activeTopicFilter && onTopicFilter && (
              <button
                className="text-xs text-text-secondary hover:text-accent-green"
                onClick={() => onTopicFilter("")}
              >
                ✕ Clear: <span className="text-accent-green">{activeTopicFilter}</span>
              </button>
            )}
          </div>
          <input
            className="input text-xs"
            style={{ width: 200 }}
            placeholder="Search tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse h-6 bg-bg-hover rounded" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...grouped.entries()].map(([cat, items]) => {
              const maxCount = items[0]?.count ?? 1;
              const isExpanded = expandedCats.has(cat) || !!search;
              const color = catColor(cat);
              const catTotal = items.reduce((s, t) => s + t.count, 0);
              const PREVIEW = 5;

              return (
                <div key={cat}>
                  {/* Category header */}
                  <button
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-bg-hover"
                    onClick={() => toggleCat(cat)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block rounded-full"
                        style={{ width: 8, height: 8, background: color }}
                      />
                      <span className="text-xs font-semibold text-text-primary">{cat}</span>
                      <span className="text-xs text-text-secondary">({items.length} tags)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono" style={{ color }}>
                        {catTotal.toLocaleString()} assignments
                      </span>
                      <span className="text-xs text-text-secondary">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Tag rows */}
                  {isExpanded && (
                    <div className="flex flex-col gap-0.5 mt-1 ml-4">
                      {(search ? items : items.slice(0, PREVIEW)).map((item) => {
                        const isActive = activeTopicFilter === item.tag;
                        return (
                          <div
                            key={item.tag}
                            className="group cursor-pointer rounded"
                            style={{
                              borderLeft: isActive ? `2px solid ${color}` : "2px solid transparent",
                              background: isActive ? `${color}14` : undefined,
                            }}
                            onClick={() => onTopicFilter && onTopicFilter(isActive ? "" : item.tag)}
                          >
                            <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-bg-hover">
                              <span
                                className="text-xs flex-1 truncate"
                                style={{ color: isActive ? color : colors.textPrimary }}
                              >
                                {item.tag}
                              </span>
                              <span className="text-xs font-mono text-text-secondary w-20 text-right">
                                {item.count.toLocaleString()}
                              </span>
                              <span className="text-xs font-mono w-12 text-right" style={{ color }}>
                                {item.pct}%
                              </span>
                            </div>
                            <div className="bar-track mx-1">
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${(item.count / maxCount) * 100}%`,
                                  background: isActive ? color : `linear-gradient(90deg, ${color}88, ${color})`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!search && items.length > PREVIEW && (
                        <button
                          className="text-xs text-text-secondary hover:text-accent-green text-left px-1 py-0.5 mt-0.5"
                          onClick={() => toggleCat(cat)}
                        >
                          {isExpanded ? "" : `+${items.length - PREVIEW} more`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Collapsed preview bars */}
                  {!isExpanded && !search && (
                    <div className="flex gap-1 mt-1 ml-4 px-1">
                      {items.slice(0, PREVIEW).map((item) => (
                        <div
                          key={item.tag}
                          title={`${item.tag}: ${item.count.toLocaleString()}`}
                          className="flex-1 rounded"
                          style={{
                            height: 4,
                            background: color,
                            opacity: 0.4 + 0.6 * (item.count / (items[0]?.count ?? 1)),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
