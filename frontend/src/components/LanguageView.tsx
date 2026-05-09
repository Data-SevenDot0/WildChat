import type { LanguageItem, SummaryStats } from "../types";

interface Props {
  languages: LanguageItem[];
  stats: SummaryStats | null;
}

export default function LanguageView({ languages, stats }: Props) {
  const max = languages[0]?.pct ?? 1;

  return (
    <div className="flex flex-col gap-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="label mb-2">English Share</div>
            <div className="text-2xl font-semibold text-text-primary">{stats.english_share_pct}%</div>
            <div className="text-xs text-text-secondary mt-1">of all conversations</div>
          </div>
          <div className="card p-4">
            <div className="label mb-2">Top Language</div>
            <div className="text-2xl font-semibold text-text-primary">{languages[0]?.language ?? "—"}</div>
            <div className="text-xs text-text-secondary mt-1">{languages[0]?.pct ?? 0}% of dataset</div>
          </div>
        </div>
      )}

      <div className="card p-4 flex flex-col gap-1">
        <div className="label mb-3">Language Breakdown</div>
        <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary mb-2 px-1">
          <span>Language</span>
          <span className="text-right">Conversations</span>
          <span className="text-right">Share</span>
        </div>
        <div className="flex flex-col gap-2">
          {languages.map(({ language, count, pct }) => (
            <div key={language}>
              <div className="grid grid-cols-3 gap-2 text-xs mb-1 px-1">
                <span className="text-text-primary font-medium">{language}</span>
                <span className="text-right text-text-secondary">{count.toLocaleString()}</span>
                <span className="text-right text-accent-green font-mono">{pct}%</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(pct / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
