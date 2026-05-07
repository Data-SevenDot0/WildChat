import type { CountryItem } from "../types";
import WorldMap from "./WorldMap";

interface Props {
  countries: CountryItem[];
  onCountryClick?: (country: string) => void;
  activeCountry?: string;
}

export default function GeographicView({ countries, onCountryClick, activeCountry }: Props) {
  const max = countries[0]?.pct ?? 1;

  return (
    <div className="flex flex-col gap-4">
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
