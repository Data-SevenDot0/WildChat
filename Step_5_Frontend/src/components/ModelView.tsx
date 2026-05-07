import type { ModelItem } from "../types";

interface Props {
  models: ModelItem[];
}

export default function ModelView({ models }: Props) {
  const max = models[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="label mb-2">Total Models</div>
          <div className="text-2xl font-semibold text-text-primary">{models.length}</div>
          <div className="text-xs text-text-secondary mt-1">distinct models in dataset</div>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Most Used</div>
          <div className="text-lg font-semibold text-accent-green font-mono truncate">{models[0]?.model ?? "—"}</div>
          <div className="text-xs text-text-secondary mt-1">{models[0]?.pct ?? 0}% of conversations</div>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Highest Avg Turns</div>
          <div className="text-2xl font-semibold text-text-primary">
            {Math.max(...models.map(m => m.avg_turns)).toFixed(1)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {models.find(m => m.avg_turns === Math.max(...models.map(x => x.avg_turns)))?.model ?? "—"}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="label mb-3">Model Usage Comparison</div>
        <div className="grid grid-cols-5 gap-2 mb-2 px-1">
          <span className="label col-span-2">Model</span>
          <span className="label text-right">Conversations</span>
          <span className="label text-right">Share</span>
          <span className="label text-right">Avg Turns</span>
        </div>
        <div className="flex flex-col gap-1">
          {models.map(({ model, count, pct, avg_turns }) => (
            <div key={model}>
              <div className="grid grid-cols-5 gap-2 items-center py-1.5 px-1 rounded hover:bg-bg-hover">
                <span className="font-mono text-xs text-accent-green col-span-2 truncate">{model}</span>
                <span className="text-xs text-text-primary text-right">{count.toLocaleString()}</span>
                <span className="text-xs text-text-secondary text-right">{pct}%</span>
                <span className="text-xs text-text-secondary text-right">{avg_turns.toFixed(1)}</span>
              </div>
              <div className="bar-track mx-1">
                <div className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
