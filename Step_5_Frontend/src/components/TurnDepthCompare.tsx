import { useEffect, useState } from "react";
import type { TurnDepthItem } from "../types";
import { fetchTurnDepth } from "../api";

type Dimension = "model" | "language" | "country";

export default function TurnDepthCompare() {
  const [dimension, setDimension] = useState<Dimension>("model");
  const [data, setData] = useState<TurnDepthItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTurnDepth(dimension)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [dimension]);

  const maxAvg = data[0]?.avg_turns ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="label">Turn Depth Comparison</div>
          <div className="flex gap-1">
            {(["model", "language", "country"] as Dimension[]).map((d) => (
              <button
                key={d}
                className={`filter-btn text-xs ${dimension === d ? "active" : ""}`}
                onClick={() => setDimension(d)}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.map((item) => (
              <div key={item.dimension}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-text-primary text-xs font-mono truncate" style={{ maxWidth: "55%" }}>
                    {item.dimension}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-text-secondary text-xs">{item.count.toLocaleString()} convs</span>
                    <span className="text-xs font-mono font-medium text-accent-green">
                      {item.avg_turns} turns avg
                    </span>
                  </div>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(item.avg_turns / maxAvg) * 100}%`,
                      background: "linear-gradient(90deg, #d97706aa, #f59e0b)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
