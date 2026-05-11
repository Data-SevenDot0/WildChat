import type { TopicItem } from "../types";
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

  function categoryColor(category: string): string {
    const idx = CATEGORY_INDICES[category];
    if (idx === undefined) return colors.chartMuted;
    if (idx === 5) return colors.chartMuted;
    return colors.chart[idx] ?? colors.chartMuted;
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
        <div className="flex flex-col gap-3">
          {topics.map(({ category, pct }) => {
            const isActive = activeTopicFilter === category;
            const color = categoryColor(category);
            return (
              <div
                key={category}
                className="cursor-grab rounded px-1 transition-colors"
                style={{
                  borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent",
                  background: isActive ? `${color}14` : undefined,
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", category);
                  e.dataTransfer.setData("application/x-wc-topic", category);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onTopicFilter && onTopicFilter(isActive ? "" : category)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
