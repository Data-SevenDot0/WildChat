import { useEffect, useState } from "react";
import type { TopicItem, TagFrequencyItem } from "../types";
import { fetchTagFrequency } from "../api";
import { useTheme } from "../context/ThemeContext";

interface Props {
  topics: TopicItem[];
  loading: boolean;
  onTopicFilter?: (category: string) => void;
  activeTopicFilter?: string;
}

const CATEGORY_INDICES: Record<string, number> = {
  "Research / info": 0,
  "Coding / tech":   1,
  "Writing":         2,
  "Math / science":  3,
  "Translation":     4,
  "Other":           5, // chartMuted
};

export default function TopicClustering({ topics, loading, onTopicFilter, activeTopicFilter }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, TagFrequencyItem[]>>({});

  useEffect(() => {
    fetchTagFrequency().then((tags) => {
      const map: Record<string, TagFrequencyItem[]> = {};
      for (const t of tags) {
        if (!map[t.category]) map[t.category] = [];
        map[t.category].push(t);
      }
      setTagsByCategory(map);
    }).catch(() => {});
  }, []);

  function categoryColor(category: string): string {
    const idx = CATEGORY_INDICES[category];
    if (idx === undefined) return colors.chartMuted;
    if (idx === 5) return colors.chartMuted;
    return colors.chart[idx] ?? colors.chartMuted;
  }

  function toggleExpanded(cat: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  // Determine if activeTopicFilter is a category name or an individual tag
  const activeCategoryNames = new Set(topics.map((t) => t.category));
  const activeIsCategory = !!activeTopicFilter && activeCategoryNames.has(activeTopicFilter);
  // Find which category the active tag belongs to (if it's a tag filter)
  let activeTagCategory: string | null = null;
  if (activeTopicFilter && !activeIsCategory) {
    for (const [cat, catTags] of Object.entries(tagsByCategory)) {
      if (catTags.some((t) => t.tag === activeTopicFilter)) {
        activeTagCategory = cat;
        break;
      }
    }
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="label">Topic Clustering</div>
        {activeTopicFilter && onTopicFilter && (
          <button
            className="text-xs text-text-secondary hover:text-accent-green"
            onClick={() => onTopicFilter("")}
          >
            ✕ Clear filter
          </button>
        )}
      </div>
      {loading || topics.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[80, 55, 40, 30, 20, 15].map((w, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-3 bg-bg-hover rounded" style={{ width: w + "%" }} />
                <div className="h-3 w-8 bg-bg-hover rounded" />
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: "0%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {topics.map(({ category, pct }) => {
            const isCatActive = activeTopicFilter === category;
            const isTagParent = activeTagCategory === category;
            const color = categoryColor(category);
            const isExpanded = expanded.has(category);
            const tags = tagsByCategory[category] ?? [];
            const maxTagCount = tags[0]?.count ?? 1;

            return (
              <div key={category}>
                {/* Category row */}
                <div
                  className="rounded transition-colors"
                  style={{
                    borderLeft: (isCatActive || isTagParent) ? `3px solid ${color}` : "3px solid transparent",
                    background: isCatActive ? `${color}14` : isTagParent ? `${color}0a` : undefined,
                  }}
                >
                  <div className="flex items-center gap-1 px-1 pt-1">
                    {/* Expand toggle */}
                    <button
                      className="text-text-secondary hover:text-text-primary flex-shrink-0"
                      style={{ fontSize: 10, width: 14, textAlign: "center" }}
                      onClick={() => toggleExpanded(category)}
                      title={isExpanded ? "Collapse" : "Expand tags"}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>

                    {/* Category label + bar — draggable, click to filter */}
                    <div
                      className="flex-1 cursor-grab"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", category);
                        e.dataTransfer.setData("application/x-wc-topic", category);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onTopicFilter && onTopicFilter(isCatActive ? "" : category)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-text-primary text-xs flex items-center gap-1">
                          <span className="text-text-secondary select-none" style={{ fontSize: 10, letterSpacing: "-1px" }}>⠿</span>
                          {category}
                        </span>
                        <span className="text-xs font-mono font-medium" style={{ color }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${color}88, ${color})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tag drill-down */}
                  {isExpanded && (
                    <div className="flex flex-col gap-0.5 mt-1 mb-1 ml-5 mr-1">
                      {tags.length === 0 ? (
                        <div className="text-xs text-text-secondary px-1 py-1">Loading…</div>
                      ) : (
                        tags.map((t) => {
                          const isTagActive = activeTopicFilter === t.tag;
                          return (
                            <div
                              key={t.tag}
                              className="rounded cursor-pointer hover:bg-bg-hover px-1 py-0.5"
                              style={{
                                background: isTagActive ? `${color}20` : undefined,
                                borderLeft: isTagActive ? `2px solid ${color}` : "2px solid transparent",
                              }}
                              onClick={() => onTopicFilter && onTopicFilter(isTagActive ? "" : t.tag)}
                            >
                              <div className="flex justify-between items-center mb-0.5">
                                <span
                                  className="text-xs truncate flex-1"
                                  style={{ color: isTagActive ? color : colors.textSecondary, maxWidth: "75%" }}
                                >
                                  {t.tag}
                                </span>
                                <span className="text-xs font-mono ml-1" style={{ color: isTagActive ? color : colors.textMuted, fontSize: 10 }}>
                                  {t.count.toLocaleString()}
                                </span>
                              </div>
                              <div className="bar-track" style={{ height: 2 }}>
                                <div
                                  style={{
                                    height: 2,
                                    width: `${(t.count / maxTagCount) * 100}%`,
                                    background: isTagActive ? color : `${color}66`,
                                    borderRadius: 1,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
