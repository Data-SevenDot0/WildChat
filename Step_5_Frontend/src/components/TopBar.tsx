import { useState } from "react";
import type { ModelItem, LanguageItem, CountryItem, Overview } from "../types";

interface Props {
  overview: Overview | null;
  models: ModelItem[];
  languages: LanguageItem[];
  countries: CountryItem[];
  filters: { model: string; language: string; country: string; redactedOnly: boolean };
  onFilterChange: (k: string, v: string | boolean) => void;
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className={`filter-btn ${value ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {value || label}
        <span className="text-text-secondary ml-1 text-xs">▾</span>
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 z-50 card overflow-auto"
          style={{ minWidth: 160, maxHeight: 260 }}
        >
          <div
            className="px-3 py-2 text-text-secondary hover:bg-bg-hover cursor-pointer text-xs"
            onClick={() => { onChange(""); setOpen(false); }}
          >
            All
          </div>
          {options.map((o) => (
            <div
              key={o}
              className={`px-3 py-2 cursor-pointer text-xs hover:bg-bg-hover ${
                value === o ? "text-accent-green" : "text-text-primary"
              }`}
              onClick={() => { onChange(o); setOpen(false); }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function TopBar({ overview, models, languages, countries, filters, onFilterChange }: Props) {
  return (
    <header className="flex items-center gap-2 px-4 py-2 border-b border-border-base bg-bg-panel flex-shrink-0 flex-wrap">
      <Dropdown
        label="Model"
        value={filters.model}
        options={models.map((m) => m.model)}
        onChange={(v) => onFilterChange("model", v)}
      />
      <Dropdown
        label="Language"
        value={filters.language}
        options={languages.map((l) => l.language)}
        onChange={(v) => onFilterChange("language", v)}
      />
      <Dropdown
        label="Country"
        value={filters.country}
        options={countries.map((c) => c.country)}
        onChange={(v) => onFilterChange("country", v)}
      />

      {overview && (
        <div className="filter-btn cursor-default">
          {formatDate(overview.date_from)} – {formatDate(overview.date_to)}
          <span className="text-text-secondary ml-1 text-xs">▾</span>
        </div>
      )}

      <button
        className={`filter-btn ${filters.redactedOnly ? "active" : ""}`}
        onClick={() => onFilterChange("redactedOnly", !filters.redactedOnly)}
      >
        Redacted only
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button className="filter-btn">⊞ Presets ▾</button>
        <button
          className="filter-btn"
          style={{ background: "#d97706", borderColor: "#f59e0b", color: "#fff" }}
        >
          ↗ Share
        </button>
      </div>
    </header>
  );
}
