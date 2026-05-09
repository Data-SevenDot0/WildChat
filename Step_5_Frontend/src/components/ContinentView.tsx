import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { CountryItem } from "../types";

const CONTINENTS: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  "South America": ["Brazil", "Argentina", "Chile", "Colombia"],
  "Europe": [
    "United Kingdom", "Germany", "France", "Italy", "Spain", "Poland",
    "Netherlands", "Sweden", "Ukraine", "Romania", "Czech Republic",
    "Hungary", "Portugal", "Greece", "Belgium", "Switzerland", "Austria",
    "Denmark", "Norway", "Finland", "Russia",
  ],
  "Asia": [
    "China", "Hong Kong", "Japan", "India", "South Korea", "Indonesia",
    "Saudi Arabia", "United Arab Emirates", "Vietnam", "Thailand",
    "Philippines", "Pakistan", "Bangladesh", "Malaysia", "Singapore",
    "Taiwan", "Israel", "Iran", "Iraq", "Turkey",
  ],
  "Africa": ["Egypt", "Nigeria", "South Africa"],
  "Oceania": ["Australia"],
};

const CONTINENT_ORDER = [
  "North America", "South America", "Europe", "Asia", "Africa", "Oceania",
];

interface Props {
  countries: CountryItem[];
  onCountryFilter: (country: string) => void;
  activeCountry?: string;
}

export default function ContinentView({ countries, onCountryFilter, activeCountry }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);

  const countryMap = new Map(countries.map(c => [c.country, c]));
  const totalAll = countries.reduce((s, c) => s + c.count, 0) || 1;

  function continentStats(name: string) {
    const members = CONTINENTS[name] ?? [];
    const present = members.filter(c => countryMap.has(c));
    const total = present.reduce((s, c) => s + (countryMap.get(c)?.count ?? 0), 0);
    return { total, countryCount: present.length };
  }

  const drillCountries: CountryItem[] = selected
    ? (CONTINENTS[selected] ?? [])
        .map(name => countryMap.get(name))
        .filter((c): c is CountryItem => !!c)
        .sort((a, b) => b.count - a.count)
    : [];

  const drillMax = drillCountries[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Continent cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {CONTINENT_ORDER.map(name => {
          const { total, countryCount } = continentStats(name);
          const pct = ((total / totalAll) * 100).toFixed(1);
          const isActive = selected === name;
          return (
            <button
              key={name}
              onClick={() => setSelected(isActive ? null : name)}
              className="card p-3 text-left"
              style={{
                border: `1px solid ${isActive ? colors.accent : colors.borderBase}`,
                background: isActive ? `${colors.accent}14` : colors.bgCard,
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: isActive ? colors.accent : colors.textPrimary, marginBottom: 4 }}>
                {name}
              </div>
              <div style={{ fontSize: "0.75rem", color: colors.accent, fontWeight: 500 }}>
                {total.toLocaleString()} convs
              </div>
              <div style={{ fontSize: "0.65rem", color: colors.textMuted, marginTop: 2 }}>
                {pct}% · {countryCount} {countryCount === 1 ? "country" : "countries"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill-down */}
      {selected && (
        <div className="card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="label">{selected} — country breakdown</div>
            {activeCountry && (
              <button
                className="filter-btn text-xs"
                style={{ color: colors.accent, borderColor: colors.accent, padding: "2px 8px", fontSize: "0.7rem" }}
                onClick={() => onCountryFilter("")}
              >
                Clear filter: {activeCountry}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {drillCountries.map(item => {
              const barWidth = (item.count / drillMax) * 100;
              const isActive = item.country === activeCountry;
              return (
                <div
                  key={item.country}
                  className="flex items-center gap-2 cursor-pointer rounded px-2 py-1"
                  style={{
                    background: isActive ? `${colors.accent}20` : "transparent",
                    border: `1px solid ${isActive ? colors.accent : "transparent"}`,
                    transition: "background 0.1s",
                  }}
                  onClick={() => onCountryFilter(isActive ? "" : item.country)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${colors.accent}14`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? `${colors.accent}20` : "transparent"; }}
                >
                  <div style={{ width: 130, fontSize: "0.75rem", color: isActive ? colors.accent : colors.textPrimary, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.country}
                  </div>
                  <div className="bar-track" style={{ flex: 1 }}>
                    <div className="bar-fill" style={{ width: `${barWidth}%` }} />
                  </div>
                  <div style={{ width: 80, textAlign: "right", fontSize: "0.7rem", color: colors.textSecondary, flexShrink: 0 }}>
                    {item.count.toLocaleString()}
                  </div>
                  <div style={{ width: 44, textAlign: "right", fontSize: "0.7rem", color: colors.textMuted, flexShrink: 0 }}>
                    {item.pct}%
                  </div>
                </div>
              );
            })}
            {drillCountries.length === 0 && (
              <div style={{ fontSize: "0.8rem", color: colors.textMuted, padding: "8px 0" }}>
                No data for this continent in the current dataset.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
