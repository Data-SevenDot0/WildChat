import type { Overview } from "../types";

interface Props {
  overview: Overview | null;
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

export default function EtlLog({ overview }: Props) {
  if (!overview) return null;

  const rows = [
    { ts: overview.date_to, rows: 837989, status: "success" as const },
    { ts: "2024-04-28T14:03:00Z", rows: 821004, status: "success" as const },
    { ts: "2024-04-27T09:45:00Z", rows: 756312, status: "partial" as const },
    { ts: "2024-04-26T18:22:00Z", rows: 638247, status: "success" as const },
  ];

  return (
    <div className="card p-4 flex flex-col gap-3 flex-1">
      <div className="label">ETL Run Log</div>
      <div className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0"
          >
            <span className="font-mono text-xs text-text-secondary">{formatTs(r.ts)}</span>
            <span className="text-xs text-text-primary">{r.rows.toLocaleString()} rows</span>
            <span
              className="text-xs font-medium"
              style={{
                color:
                  r.status === "success"
                    ? "#22c55e"
                    : r.status === "partial"
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
