import type { CountryItem, Filters } from "../types";
import WorldMap from "./WorldMap";

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

interface Props {
  countries: CountryItem[];
  filters: Filters;
  onFilterChange: (k: string, v: string | boolean | number) => void;
  onCountryClick?: (country: string) => void;
  activeCountry?: string;
}

export default function GeographicView({ countries, filters, onFilterChange, onCountryClick, activeCountry }: Props) {
  const max = countries[0]?.pct ?? 1;

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
      <WorldMap countries={countries} onCountryClick={onCountryClick} activeCountry={activeCountry} />

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
              onClick={() => onCountryClick && onCountryClick(country)}
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
    </div>
  );
}
