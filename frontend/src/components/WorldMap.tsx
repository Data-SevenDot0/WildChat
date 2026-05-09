import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
} from "react-simple-maps";
import type { CountryItem } from "../types";
import { useTheme } from "../context/ThemeContext";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_TO_NUM: Record<string, number> = {
  "United States": 840,
  "Russia": 643,
  "China": 156,
  "Hong Kong": 344,
  "United Kingdom": 826,
  "Germany": 276,
  "France": 250,
  "Japan": 392,
  "India": 356,
  "Canada": 124,
  "Brazil": 76,
  "Australia": 36,
  "South Korea": 410,
  "Italy": 380,
  "Spain": 724,
  "Poland": 616,
  "Netherlands": 528,
  "Sweden": 752,
  "Turkey": 792,
  "Mexico": 484,
  "Indonesia": 360,
  "Saudi Arabia": 682,
  "United Arab Emirates": 784,
  "Argentina": 32,
  "Chile": 152,
  "Colombia": 170,
  "Vietnam": 704,
  "Thailand": 764,
  "Philippines": 608,
  "Egypt": 818,
  "Nigeria": 566,
  "South Africa": 710,
  "Pakistan": 586,
  "Bangladesh": 50,
  "Ukraine": 804,
  "Romania": 642,
  "Czech Republic": 203,
  "Hungary": 348,
  "Portugal": 620,
  "Greece": 300,
  "Belgium": 56,
  "Switzerland": 756,
  "Austria": 40,
  "Denmark": 208,
  "Norway": 578,
  "Finland": 246,
  "Israel": 376,
  "Iran": 364,
  "Iraq": 368,
  "Malaysia": 458,
  "Singapore": 702,
  "Taiwan": 158,
};

// reverse lookup: numericId -> country name
const NUM_TO_COUNTRY: Record<number, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_NUM).map(([name, num]) => [num, name])
);

interface TooltipState {
  x: number;
  y: number;
  content: string;
}

interface Props {
  countries: CountryItem[];
  onCountryClick?: (country: string) => void;
  activeCountry?: string;
}

type ViewMode = "volume" | "language" | "model";

export default function WorldMap({ countries, onCountryClick, activeCountry }: Props) {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("volume");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const pctMap: Record<number, number> = {};
  const nameToItem: Record<string, CountryItem> = {};
  countries.forEach((item) => {
    const num = COUNTRY_TO_NUM[item.country];
    if (num) pctMap[num] = item.pct;
    nameToItem[item.country] = item;
  });

  function getVolumeColor(pct: number): string {
    const s = colors.mapScale;
    if (pct > 15) return s[5];
    if (pct > 8)  return s[4];
    if (pct > 4)  return s[3];
    if (pct > 2)  return s[2];
    if (pct > 0.5) return s[1];
    return s[0];
  }

  function getColor(numId: number): string {
    const countryName = NUM_TO_COUNTRY[numId];
    if (activeCountry && countryName === activeCountry) return colors.mapHover;
    const pct = pctMap[numId];
    if (!pct) return colors.mapNoData;
    return getVolumeColor(pct);
  }

  return (
    <div className="card p-4 flex flex-col gap-2" style={{ position: "relative" }}>
      <div className="flex items-center justify-between">
        <div className="label">Interactive Map</div>
        <div className="flex gap-1">
          {(["volume", "language", "model"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={`filter-btn text-xs ${viewMode === mode ? "active" : ""}`}
              style={{ padding: "2px 8px", fontSize: 10 }}
              onClick={() => setViewMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: -8, marginBottom: -8, position: "relative" }}>
        <ComposableMap
          projection="geoNaturalEarth1"
          style={{ width: "100%", height: "auto" }}
          projectionConfig={{ scale: 140 }}
        >
          <Sphere id="ocean" fill={colors.mapOcean} stroke={colors.mapOcean} strokeWidth={0.5} />
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numId = Number(geo.id);
                const countryName = NUM_TO_COUNTRY[numId];
                const item = countryName ? nameToItem[countryName] : undefined;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(numId)}
                    stroke={colors.mapBorder}
                    strokeWidth={0.7}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: colors.mapHover, outline: "none", cursor: countryName ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(evt) => {
                      if (countryName && item) {
                        setTooltip({
                          x: evt.clientX + 12,
                          y: evt.clientY - 28,
                          content: `${countryName}: ${item.count.toLocaleString()} convs (${item.pct}%)`,
                        });
                      } else if (countryName) {
                        setTooltip({ x: evt.clientX + 12, y: evt.clientY - 28, content: countryName });
                      }
                    }}
                    onMouseMove={(evt) => {
                      if (tooltip) {
                        setTooltip((t) => t ? { ...t, x: evt.clientX + 12, y: evt.clientY - 28 } : null);
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (countryName && onCountryClick) {
                        onCountryClick(countryName);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-text-secondary text-xs">low</span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: `linear-gradient(90deg, ${colors.mapScale[0]}, ${colors.mapScale[2]}, ${colors.mapScale[5]})`,
          }}
        />
        <span className="text-text-secondary text-xs">high</span>
      </div>
      {activeCountry && onCountryClick && (
        <div className="text-xs text-text-secondary">
          Filtered: <span style={{ color: colors.accent }}>{activeCountry}</span>
          <button className="ml-2 hover:underline" style={{ color: colors.accent }} onClick={() => onCountryClick("")}>✕ clear</button>
        </div>
      )}
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 11,
            color: colors.tooltipText,
            pointerEvents: "none",
            zIndex: 9999,
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
