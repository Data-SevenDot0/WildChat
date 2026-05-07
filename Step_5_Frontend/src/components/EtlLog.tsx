import type { Overview } from "../types";

interface Props {
  overview: Overview | null;
  fullView?: boolean;
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

const ALL_ROWS = [
  { ts: "2024-04-29T22:10:00Z", rows: 837989, status: "success" as const, errors: 0, duration: "4m 12s" },
  { ts: "2024-04-28T14:03:00Z", rows: 821004, status: "success" as const, errors: 0, duration: "3m 58s" },
  { ts: "2024-04-27T09:45:00Z", rows: 756312, status: "partial" as const, errors: 3, duration: "5m 01s" },
  { ts: "2024-04-26T18:22:00Z", rows: 638247, status: "success" as const, errors: 0, duration: "3m 44s" },
  { ts: "2024-04-25T11:00:00Z", rows: 602115, status: "success" as const, errors: 0, duration: "3m 31s" },
  { ts: "2024-04-24T08:15:00Z", rows: 589034, status: "error" as const, errors: 17, duration: "1m 12s" },
  { ts: "2024-04-23T20:05:00Z", rows: 571200, status: "success" as const, errors: 0, duration: "3m 20s" },
  { ts: "2024-04-22T15:40:00Z", rows: 548033, status: "partial" as const, errors: 2, duration: "4m 05s" },
  { ts: "2024-04-21T10:30:00Z", rows: 520184, status: "success" as const, errors: 0, duration: "3m 10s" },
  { ts: "2024-04-20T06:00:00Z", rows: 498761, status: "success" as const, errors: 0, duration: "3m 02s" },
];

function StatusColor(status: "success" | "partial" | "error") {
  if (status === "success") return "#22c55e";
  if (status === "partial") return "#f59e0b";
  return "#ef4444";
}

export default function EtlLog({ overview, fullView }: Props) {
  const rows = fullView ? ALL_ROWS : ALL_ROWS.slice(0, 4).map((r, i) =>
    i === 0 && overview ? { ...r, ts: overview.date_to } : r
  );

  if (fullView) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text-primary font-semibold text-sm">ETL Run Log</div>
            <div className="text-text-secondary text-xs mt-0.5">
              {ALL_ROWS.filter(r => r.status === "error").length} errors ·{" "}
              {ALL_ROWS.filter(r => r.status === "partial").length} partial runs ·{" "}
              {ALL_ROWS.filter(r => r.status === "success").length} successful
            </div>
          </div>
          <button
            className="filter-btn text-xs opacity-50 cursor-not-allowed"
            disabled
            title="Demo only — run disabled"
          >
            ▶ Run new ETL job
          </button>
        </div>
        <div className="card">
          <div
            className="grid text-xs text-text-secondary px-4 py-2 border-b border-border-base"
            style={{ gridTemplateColumns: "1fr 120px 80px 60px 80px" }}
          >
            <span className="label">Timestamp</span>
            <span className="label text-right">Rows Processed</span>
            <span className="label text-right">Status</span>
            <span className="label text-right">Errors</span>
            <span className="label text-right">Duration</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid items-center px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-bg-hover"
              style={{ gridTemplateColumns: "1fr 120px 80px 60px 80px" }}
            >
              <span className="font-mono text-xs text-text-secondary">{formatTs(r.ts)}</span>
              <span className="text-xs text-text-primary text-right">{r.rows.toLocaleString()}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="status-dot" style={{ background: StatusColor(r.status) }} />
                <span className="text-xs font-medium" style={{ color: StatusColor(r.status) }}>
                  {r.status}
                </span>
              </div>
              <span className="text-xs text-right" style={{ color: r.errors > 0 ? "#ef4444" : "#888888" }}>
                {r.errors}
              </span>
              <span className="font-mono text-xs text-text-secondary text-right">{r.duration}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-1">
              <span className="status-dot" style={{ background: StatusColor(r.status) }} />
              <span className="text-xs font-medium" style={{ color: StatusColor(r.status) }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
