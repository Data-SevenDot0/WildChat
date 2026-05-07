import type { TopicItem } from "../types";

interface Props {
  topics: TopicItem[];
  loading: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Research / info": "#2ecc9e",
  "Coding / tech": "#3b82f6",
  "Writing": "#a78bfa",
  "Math / science": "#f59e0b",
  "Translation": "#06b6d4",
  "Other": "#6b8fa8",
};

export default function TopicClustering({ topics, loading }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="label">Topic Clustering</div>
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
          {topics.map(({ category, pct }) => (
            <div key={category}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-text-primary text-xs">{category}</span>
                <span
                  className="text-xs font-mono font-medium"
                  style={{ color: CATEGORY_COLORS[category] ?? "#6b8fa8" }}
                >
                  {pct}%
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${CATEGORY_COLORS[category] ?? "#2ecc9e"}88, ${CATEGORY_COLORS[category] ?? "#2ecc9e"})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
