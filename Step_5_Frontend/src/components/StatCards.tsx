import type { Overview } from "../types";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

interface Props {
  overview: Overview | null;
  loading: boolean;
}

export default function StatCards({ overview, loading }: Props) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-3 w-24 bg-bg-hover rounded mb-3" />
            <div className="h-7 w-16 bg-bg-hover rounded mb-2" />
            <div className="h-3 w-20 bg-bg-hover rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Conversations",
      value: fmt(overview.total_conversations),
      sub: `${overview.total_models} models`,
    },
    {
      label: "Languages",
      value: overview.total_languages.toString(),
      sub: `${overview.top_language} leads ${overview.top_language_pct}%`,
    },
    {
      label: "Avg Turns",
      value: overview.avg_turns.toFixed(1),
      sub: `max ${overview.max_turns}`,
    },
    {
      label: "Redacted",
      value: fmt(overview.redacted_count),
      sub: `${overview.redacted_pct}%`,
      accent: true,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map(({ label, value, sub, accent }) => (
        <div key={label} className="card p-4">
          <div className="label mb-2">{label}</div>
          <div
            className="text-2xl font-semibold mb-1"
            style={{ color: accent ? "#ef4444" : "#cdd9e5" }}
          >
            {value}
          </div>
          <div className="text-xs text-text-secondary">{sub}</div>
        </div>
      ))}
    </div>
  );
}
