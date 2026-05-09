import { useEffect, useState } from "react";
import { fetchEtlRuns } from "../api";
import type { EtlRunItem } from "../types";

interface Props {
  fullView?: boolean;
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function statusColor(status: string) {
  if (status === "success") return "#22c55e";
  if (status === "partial") return "#f59e0b";
  return "#ef4444";
}

export default function EtlLog({ fullView }: Props) {
  const [runs, setRuns] = useState<EtlRunItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEtlRuns(fullView ? 20 : 4)
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [fullView]);

  const displayed = runs;

  const successCount = runs.filter(r => r.status === "success").length;
  const errorCount = runs.filter(r => r.status === "error").length;

  if (fullView) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text-primary font-semibold text-sm">ETL Run Log</div>
            <div className="text-text-secondary text-xs mt-0.5">
              {errorCount} errors · {successCount} successful
            </div>
          </div>
          <button
            className="filter-btn text-xs opacity-50 cursor-not-allowed"
            disabled
            title="Re-runs are triggered by server restart"
          >
            ▶ Run new ETL job
          </button>
        </div>
        <div className="card">
          <div
            className="grid text-xs text-text-secondary px-4 py-2 border-b border-border-base"
            style={{ gridTemplateColumns: "1fr 130px 80px 60px 90px" }}
          >
            <span className="label">Timestamp (UTC)</span>
            <span className="label text-right">Rows Processed</span>
            <span className="label text-right">Status</span>
            <span className="label text-right">Errors</span>
            <span className="label text-right">Duration</span>
          </div>
          {loading && (
            <div className="px-4 py-4 text-xs text-text-secondary">Loading…</div>
          )}
          {!loading && displayed.length === 0 && (
            <div className="px-4 py-4 text-xs text-text-secondary">No runs recorded yet. Start the server to generate a run entry.</div>
          )}
          {displayed.map(r => (
            <div
              key={r.id}
              className="grid items-center px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-bg-hover"
              style={{ gridTemplateColumns: "1fr 130px 80px 60px 90px" }}
            >
              <span className="font-mono text-xs text-text-secondary">{formatTs(r.ran_at)}</span>
              <span className="text-xs text-text-primary text-right">{r.rows_processed.toLocaleString()}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="status-dot" style={{ background: statusColor(r.status) }} />
                <span className="text-xs font-medium" style={{ color: statusColor(r.status) }}>
                  {r.status}
                </span>
              </div>
              <span className="text-xs text-right" style={{ color: r.errors > 0 ? "#ef4444" : "#888888" }}>
                {r.errors}
              </span>
              <span className="font-mono text-xs text-text-secondary text-right">{formatDuration(r.duration_seconds)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-3 flex-1">
      <div className="label">ETL Run Log</div>
      {loading && <div className="text-xs text-text-secondary">Loading…</div>}
      {!loading && displayed.length === 0 && (
        <div className="text-xs text-text-secondary">No runs yet.</div>
      )}
      <div className="flex flex-col gap-1">
        {displayed.map(r => (
          <div
            key={r.id}
            className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0"
          >
            <span className="font-mono text-xs text-text-secondary">{formatTs(r.ran_at)}</span>
            <span className="text-xs text-text-primary">{r.rows_processed.toLocaleString()} rows</span>
            <div className="flex items-center gap-1">
              <span className="status-dot" style={{ background: statusColor(r.status) }} />
              <span className="text-xs font-medium" style={{ color: statusColor(r.status) }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

