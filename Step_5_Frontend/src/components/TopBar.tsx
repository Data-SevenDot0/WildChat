import { useState } from "react";
import type { ModelItem, LanguageItem, CountryItem, Overview, Filters, FilterPreset } from "../types";

// Generate month options from Apr 2023 to Apr 2024
function generateMonthOptions() {
  const months = [];
  const start = new Date(2023, 3, 1); // April 2023
  const end = new Date(2024, 3, 1);   // April 2024
  let d = new Date(start);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 7); // "2023-04"
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    months.push({ value: iso + "-01", label });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return months;
}

const MONTH_OPTIONS = generateMonthOptions();

interface Props {
  overview: Overview | null;
  models: ModelItem[];
  languages: LanguageItem[];
  countries: CountryItem[];
  filters: Filters;
  onFilterChange: (k: string, v: string | boolean | number) => void;
  presets?: FilterPreset[];
  onSavePreset?: (name: string) => void;
  onApplyPreset?: (preset: FilterPreset) => void;
  onDeletePreset?: (id: string) => void;
}

function Dropdown({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
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
              className={`px-3 py-2 cursor-pointer text-xs hover:bg-bg-hover ${value === o ? "text-accent-green" : "text-text-primary"}`}
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

export default function TopBar({
  models, languages, countries, filters, onFilterChange,
  presets = [], onSavePreset, onApplyPreset, onDeletePreset,
}: Props) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const FONT_SIZES = [
    { label: "A",  title: "Normal",  size: "13px" },
    { label: "A+", title: "Large",   size: "15px" },
    { label: "A⁺⁺", title: "X-Large", size: "18px" },
  ];
  const [fontIdx, setFontIdx] = useState(0);

  function cycleFontSize() {
    const next = (fontIdx + 1) % FONT_SIZES.length;
    setFontIdx(next);
    document.body.style.fontSize = FONT_SIZES[next].size;
  }

  const activeCount = [
    filters.model, filters.language, filters.country,
    filters.dateFrom, filters.dateTo, filters.topicFilter,
    filters.redactedOnly ? "y" : "",
    filters.turnMin > 0 ? "y" : "",
    filters.turnMax > 0 ? "y" : "",
  ].filter(Boolean).length;

  function clearAll() {
    onFilterChange("model", "");
    onFilterChange("language", "");
    onFilterChange("country", "");
    onFilterChange("redactedOnly", false);
    onFilterChange("search", "");
    onFilterChange("dateFrom", "");
    onFilterChange("dateTo", "");
    onFilterChange("topicFilter", "");
    onFilterChange("turnMin", 0);
    onFilterChange("turnMax", 0);
  }

  function handleSavePreset() {
    const name = window.prompt("Preset name:");
    if (name && onSavePreset) onSavePreset(name.trim());
    setPresetsOpen(false);
  }

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

      {/* Date range */}
      <div className="flex items-center gap-1">
        <span className="text-text-secondary text-xs">From</span>
        <select
          className="filter-btn text-xs"
          value={filters.dateFrom}
          onChange={(e) => onFilterChange("dateFrom", e.target.value)}
          style={{ padding: "3px 6px" }}
        >
          <option value="">Any</option>
          {MONTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-text-secondary text-xs">To</span>
        <select
          className="filter-btn text-xs"
          value={filters.dateTo}
          onChange={(e) => onFilterChange("dateTo", e.target.value)}
          style={{ padding: "3px 6px" }}
        >
          <option value="">Any</option>
          {MONTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <button
        className={`filter-btn ${filters.redactedOnly ? "active" : ""}`}
        onClick={() => onFilterChange("redactedOnly", !filters.redactedOnly)}
      >
        Redacted only
      </button>

      {activeCount > 0 && (
        <button className="filter-btn text-xs" onClick={clearAll} style={{ color: "#ef4444" }}>
          ✕ Clear all ({activeCount})
        </button>
      )}

      <div className="ml-auto flex items-center gap-2 relative">
        <button
          className="filter-btn"
          title={`Font size: ${FONT_SIZES[fontIdx].title} — click to increase`}
          onClick={cycleFontSize}
          style={{ fontWeight: 600, minWidth: 40, letterSpacing: "0.02em" }}
        >
          {FONT_SIZES[fontIdx].label}
        </button>
        <button className="filter-btn" onClick={() => setPresetsOpen((o) => !o)}>
          ⊞ Presets{presets.length > 0 ? ` (${presets.length})` : ""} ▾
        </button>
        {presetsOpen && (
          <div
            className="absolute top-full right-0 mt-1 z-50 card overflow-auto"
            style={{ minWidth: 220, maxHeight: 300 }}
          >
            <div
              className="px-3 py-2 text-text-secondary hover:bg-bg-hover cursor-pointer text-xs border-b border-border-subtle"
              onClick={handleSavePreset}
            >
              + Save current as preset
            </div>
            {presets.length === 0 && (
              <div className="px-3 py-2 text-text-muted text-xs">No saved presets</div>
            )}
            {presets.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-bg-hover">
                <span
                  className="text-xs text-text-primary cursor-pointer hover:text-accent-green flex-1"
                  onClick={() => { if (onApplyPreset) onApplyPreset(p); setPresetsOpen(false); }}
                >
                  {p.name}
                </span>
                <button
                  className="text-text-muted hover:text-text-primary text-xs ml-2"
                  onClick={() => { if (onDeletePreset) onDeletePreset(p.id); }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
