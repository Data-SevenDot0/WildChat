import type { SummaryStats } from "../types";

interface Props {
  stats: SummaryStats | null;
  loading: boolean;
}

export default function SummaryStatsPanel({ stats, loading }: Props) {
  const items = stats
    ? [
        { label: "avg turns GPT-3.5", value: stats.gpt35_avg_turns.toFixed(1) },
        { label: "avg turns GPT-4", value: stats.gpt4_avg_turns.toFixed(1) },
        { label: "English share", value: stats.english_share_pct + "%" },
        { label: "US share", value: stats.us_share_pct + "%" },
      ]
    : [];

  return (
    <div className="card p-4 flex flex-col gap-3 flex-1">
      <div className="label">Summary Statistics</div>
      {loading || !stats ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse text-center p-3 rounded" style={{ background: "#0e1a28" }}>
              <div className="h-6 bg-bg-hover rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-bg-hover rounded w-20 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map(({ label, value }) => (
            <div
              key={label}
              className="text-center p-3 rounded"
              style={{ background: "#0e1a28", border: "1px solid #162438" }}
            >
              <div className="text-lg font-semibold text-text-primary">{value}</div>
              <div className="text-xs text-text-secondary mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
