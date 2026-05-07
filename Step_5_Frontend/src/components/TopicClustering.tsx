import type { TopicItem } from "../types";

interface Props {
  topics: TopicItem[];
  loading: boolean;
  onTopicFilter?: (category: string) => void;
  activeTopicFilter?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Research / info": "#f59e0b",
  "Coding / tech":   "#d97706",
  "Writing":         "#fbbf24",
  "Math / science":  "#f59e0b",
  "Translation":     "#b45309",
  "Other":           "#888888",
};

export default function TopicClustering({ topics, loading, onTopicFilter, activeTopicFilter }: Props) {
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
            return (
              <div
                key={category}
                className="cursor-pointer rounded px-1 transition-colors"
                style={{
                  borderLeft: isActive ? `3px solid ${CATEGORY_COLORS[category] ?? "#f59e0b"}` : "3px solid transparent",
                  background: isActive ? "rgba(245,158,11,0.08)" : undefined,
                }}
                onClick={() => onTopicFilter && onTopicFilter(isActive ? "" : category)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-text-primary text-xs">{category}</span>
                  <span
                    className="text-xs font-mono font-medium"
                    style={{ color: CATEGORY_COLORS[category] ?? "#888888" }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${CATEGORY_COLORS[category] ?? "#f59e0b"}88, ${CATEGORY_COLORS[category] ?? "#f59e0b"})`,
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
