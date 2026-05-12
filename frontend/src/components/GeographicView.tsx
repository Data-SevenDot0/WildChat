import { useMemo, useState } from "react";
import type { CountryItem, Filters } from "../types";
import WorldMap from "./WorldMap";
import GeographicDrilldown from "./GeographicDrilldown";
import { useTheme } from "../context/ThemeContext";

const MONTH_OPTIONS = (() => {
  const months: { value: string; label: string }[] = [];
  let d = new Date(2023, 3, 1);
  const end = new Date(2024, 3, 1);
  while (d <= end) {
    months.push({
      value: d.toISOString().slice(0, 7) + "-01",
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return months;
})();

const TOPIC_CATS = [
  "Coding / tech",
  "Research / info",
  "Writing",
  "Math / science",
  "Translation",
  "Other",
];

const CATEGORY_COLOR_IDX: Record<string, number> = {
  "Research / info": 0,
  "Coding / tech":   1,
  "Writing":         2,
  "Math / science":  3,
  "Translation":     4,
  "Other":           5,
};

interface Props {
  countries: CountryItem[];
  filters: Filters;
  onFilterChange: (k: string, v: string | boolean | number) => void;
  onCountryClick?: (country: string) => void;
  activeCountry?: string;
  topicsByCountry?: Record<string, { category: string; pct: number }[]>;
  topicCountryPct?: Record<string, number>;
  topicFilterCategory?: string;
  activeTagLabel?: string;
  heatmapColor?: string;
  onTagDrop?: (tagId: string) => void;
}

export default function GeographicView({
  countries,
  filters,
  onFilterChange,
  onCountryClick,
  activeCountry,
  topicsByCountry,
  topicCountryPct,
  topicFilterCategory,
  activeTagLabel,
  heatmapColor,
  onTagDrop,
}: Props) {
  const { colors } = useTheme();
  const max = countries[0]?.pct ?? 1;
  const [drilldownCountry, setDrilldownCountry] = useState<string | null>(null);
  const [topicTab, setTopicTab] = useState(TOPIC_CATS[0]);

  function handleCountryClick(country: string) {
    if (onCountryClick) onCountryClick(country);
    if (country) setDrilldownCountry(country);
    else setDrilldownCountry(null);
  }

  function getCategoryColor(cat: string): string {
    const idx = CATEGORY_COLOR_IDX[cat];
    if (idx === undefined || idx === 5) return colors.chartMuted;
    return colors.chart[idx] ?? colors.chartMuted;
  }

  const countriesForTopic = useMemo(() => {
    if (!topicsByCountry || Object.keys(topicsByCountry).length === 0) return [];
    return Object.entries(topicsByCountry)
      .map(([country, cats]) => {
        const match = cats.find((c) => c.category === topicTab);
        return match ? { country, pct: match.pct } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.pct - a!.pct)
      .slice(0, 20) as { country: string; pct: number }[];
  }, [topicsByCountry, topicTab]);

  const maxTopicPct = countriesForTopic[0]?.pct ?? 1;
  const tabColor = getCategoryColor(topicTab);

  return (
    <div className="flex flex-col gap-4">
      {/* Time / date slider */}
      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <span className="label" style={{ whiteSpace: "nowrap" }}>Time / Date Range</span>
        <div className="flex items-center gap-2">
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
        {(filters.dateFrom || filters.dateTo) && (
          <button
            className="filter-btn text-xs"
            style={{ color: "#ef4444" }}
            onClick={() => { onFilterChange("dateFrom", ""); onFilterChange("dateTo", ""); }}
          >
            ✕ Clear dates
          </button>
        )}
      </div>

      <WorldMap
        countries={countries}
        onCountryClick={handleCountryClick}
        activeCountry={activeCountry}
        topicsByCountry={topicsByCountry}
        onTopicDrop={(cat) => onFilterChange("topicFilter", cat)}
        activeTopicFilter={filters.topicFilter}
        topicCountryPct={topicCountryPct}
        topicFilterCategory={topicFilterCategory}
        activeTagLabel={activeTagLabel}
        heatmapColor={heatmapColor}
        onTagDrop={onTagDrop}
      />

      {drilldownCountry && (
        <GeographicDrilldown
          country={drilldownCountry}
          onClose={() => setDrilldownCountry(null)}
        />
      )}

      {/* Country breakdown + Topics by Country side by side */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Country breakdown */}
        <div className="card p-4">
          <div className="label mb-3">Country Breakdown</div>
          <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary mb-2 px-1">
            <span>Country</span>
            <span className="text-right">Conversations</span>
            <span className="text-right">Share</span>
          </div>
          <div className="flex flex-col gap-2" style={{ maxHeight: 400, overflowY: "auto" }}>
            {countries.map(({ country, count, pct }) => (
              <div
                key={country}
                className="cursor-pointer hover:bg-bg-hover rounded px-1"
                onClick={() => handleCountryClick(country)}
              >
                <div className="grid grid-cols-3 gap-2 text-xs mb-1 px-1">
                  <span className={`text-text-primary font-medium ${activeCountry === country ? "text-accent-green" : ""}`}>{country}</span>
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

        {/* Topics by Country */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="label">Topics by Country</div>
          <div className="text-xs text-text-secondary -mt-1">
            % of each country's conversations in this topic
          </div>

          {/* Topic tab selector */}
          <div className="flex flex-wrap gap-1">
            {TOPIC_CATS.map((cat) => {
              const c = getCategoryColor(cat);
              const isActive = topicTab === cat;
              return (
                <button
                  key={cat}
                  className="filter-btn text-xs"
                  style={{
                    padding: "2px 8px",
                    fontSize: 10,
                    borderColor: isActive ? c : undefined,
                    color: isActive ? c : undefined,
                    background: isActive ? `${c}18` : undefined,
                  }}
                  onClick={() => setTopicTab(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Ranked country list */}
          <div className="flex flex-col gap-1.5" style={{ maxHeight: 330, overflowY: "auto" }}>
            {countriesForTopic.length === 0 ? (
              <div className="text-xs text-text-secondary">Loading…</div>
            ) : (
              countriesForTopic.map(({ country, pct }) => (
                <div
                  key={country}
                  className="cursor-pointer hover:bg-bg-hover rounded px-1"
                  onClick={() => handleCountryClick(country)}
                >
                  <div className="flex justify-between text-xs mb-0.5 px-1">
                    <span className="text-text-primary">{country}</span>
                    <span className="font-mono" style={{ color: tabColor }}>{pct}%</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(pct / maxTopicPct) * 100}%`,
                        background: `linear-gradient(90deg, ${tabColor}88, ${tabColor})`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
