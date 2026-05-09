import { useState } from "react";
import type { ModelItem, LanguageItem, CountryItem, Overview, Filters, FilterPreset } from "../types";
import { useTheme, THEMES } from "../context/ThemeContext";
import type { ThemeId } from "../context/ThemeContext";
import { WildchatIcon } from "./WildchatLogo";
import { useAuth } from "../context/AuthContext";

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
  const [visualOpen, setVisualOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const FONT_SIZES = [
    { label: "A",    title: "Normal",   size: "20px" },
    { label: "A+",   title: "Large",    size: "25px" },
    { label: "A⁺⁺",  title: "X-Large",  size: "31px" },
  ];
  const [fontIdx, setFontIdx] = useState(0);

  function cycleFontSize() {
    const next = (fontIdx + 1) % FONT_SIZES.length;
    setFontIdx(next);
    document.documentElement.style.fontSize = FONT_SIZES[next].size;
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
      <WildchatIcon size={18} />
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

        {/* Visual Alterations panel */}
        <div className="relative">
          <button
            className={`filter-btn ${visualOpen ? "active" : ""}`}
            onClick={() => { setVisualOpen(o => !o); setPresetsOpen(false); }}
            title="Visual alterations — change colour scheme"
          >
            ◑ Visual alterations
          </button>
          {visualOpen && (
            <div
              className="absolute top-full right-0 mt-1 z-50 card overflow-hidden"
              style={{ minWidth: 280 }}
            >
              <div className="px-3 py-2 border-b border-border-subtle">
                <div className="text-text-primary text-xs font-semibold">Colour scheme</div>
                <div className="text-text-muted text-xs mt-0.5">Preference is saved automatically</div>
              </div>

              {/* Standard themes */}
              <div className="px-3 py-2 border-b border-border-subtle">
                <div className="label mb-2">Standard</div>
                {THEMES.filter(t => !t.accessibility).map(t => (
                  <button
                    key={t.id}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-bg-hover text-left transition-colors"
                    onClick={() => setTheme(t.id as ThemeId)}
                  >
                    <span
                      className="flex-shrink-0 rounded"
                      style={{
                        width: 28, height: 18,
                        background: t.swatchBg,
                        border: `2px solid ${theme === t.id ? t.swatch : "transparent"}`,
                        outline: `1px solid #444`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.swatch, display: "block" }} />
                    </span>
                    <span className="flex-1">
                      <span className="text-xs font-medium" style={{ color: theme === t.id ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                        {t.name}
                      </span>
                      {theme === t.id && <span className="ml-2 text-xs opacity-60">✓ active</span>}
                      <div className="text-text-muted text-xs">{t.description}</div>
                    </span>
                  </button>
                ))}
              </div>

              {/* Accessibility themes */}
              <div className="px-3 py-2">
                <div className="label mb-2">Accessibility</div>
                {THEMES.filter(t => t.accessibility).map(t => (
                  <button
                    key={t.id}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-bg-hover text-left transition-colors"
                    onClick={() => setTheme(t.id as ThemeId)}
                  >
                    <span
                      className="flex-shrink-0 rounded"
                      style={{
                        width: 28, height: 18,
                        background: t.swatchBg,
                        border: `2px solid ${theme === t.id ? t.swatch : "transparent"}`,
                        outline: `1px solid #444`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.swatch, display: "block" }} />
                    </span>
                    <span className="flex-1">
                      <span className="text-xs font-medium" style={{ color: theme === t.id ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                        {t.name}
                      </span>
                      {theme === t.id && <span className="ml-2 text-xs opacity-60">✓ active</span>}
                      <div className="text-text-muted text-xs">{t.description}</div>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="filter-btn" onClick={() => { setPresetsOpen((o) => !o); setVisualOpen(false); }}>
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
      {/* Auth */}
      {user ? (
        <div className="flex items-center gap-2 ml-1">
          <span className="text-text-secondary text-xs">{user.username}</span>
          <button className="filter-btn text-xs" onClick={logout}>Log out</button>
        </div>
      ) : (
        <button
          className="filter-btn text-xs ml-1"
          onClick={() => document.dispatchEvent(new CustomEvent("wc:open-login"))}
        >
          Log in
        </button>
      )}
    </header>
  );
}
