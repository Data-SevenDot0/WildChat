import { useRef, useState } from "react";
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
  "The Netherlands": 528,
  "Sweden": 752,
  "Türkiye": 792,
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
  "Czechia": 203,
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

const NUM_TO_COUNTRY: Record<number, string> = Object.fromEntries(
  Object.entries(COUNTRY_TO_NUM).map(([name, num]) => [num, name])
);

const CAT_PALETTE = [
  "#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa",
  "#fb923c", "#38bdf8", "#4ade80", "#facc15", "#f472b6",
  "#94a3b8", "#2dd4bf", "#c084fc", "#fb7185", "#818cf8",
  "#e879f9", "#22d3ee", "#86efac",
];
function catColor(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length];
}

const CATEGORY_COLOR_IDX: Record<string, number> = {
  "Research / info": 0,
  "Coding / tech":   1,
  "Writing":         2,
  "Math / science":  3,
  "Translation":     4,
  "Other":           5,
};

const KNOWN_CATEGORIES = new Set(Object.keys(CATEGORY_COLOR_IDX));

interface TooltipState {
  x: number;
  y: number;
  country: string;
  count: number;
  pct: number;
  dominant_language?: string;
  dominant_model?: string;
  topCategories?: { category: string; pct: number }[];
}

interface Props {
  countries: CountryItem[];
  onCountryClick?: (country: string) => void;
  activeCountry?: string;
  topicsByCountry?: Record<string, { category: string; pct: number }[]>;
  onTopicDrop?: (category: string) => void;
  activeTopicFilter?: string;
  /** Pre-fetched country percentages for the active topic/tag filter */
  topicCountryPct?: Record<string, number>;
  /** Parent category of the active filter (used for heatmap color) */
  topicFilterCategory?: string;
}

type ViewMode = "volume" | "language" | "model" | "topic";

export default function WorldMap({
  countries,
  onCountryClick,
  activeCountry,
  topicsByCountry,
  onTopicDrop,
  activeTopicFilter,
  topicCountryPct = {},
  topicFilterCategory = "",
}: Props) {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("volume");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const nameToItem: Record<string, CountryItem> = {};
  countries.forEach((item) => { nameToItem[item.country] = item; });

  function getCategoryColor(cat: string): string {
    const idx = CATEGORY_COLOR_IDX[cat];
    if (idx === undefined || idx === 5) return colors.chartMuted;
    return colors.chart[idx] ?? colors.chartMuted;
  }

  function getVolumeColor(pct: number): string {
    const s = colors.mapScale;
    if (pct > 15) return s[5];
    if (pct > 8)  return s[4];
    if (pct > 4)  return s[3];
    if (pct > 2)  return s[2];
    if (pct > 0.5) return s[1];
    return s[0];
  }

  function getTopicDominantColor(countryName: string): string {
    const cats = topicsByCountry?.[countryName];
    if (!cats || cats.length === 0) return colors.mapNoData;
    return getCategoryColor(cats[0].category);
  }

  function getColor(numId: number): string {
    const countryName = NUM_TO_COUNTRY[numId];
    if (activeCountry && countryName === activeCountry) return colors.mapHover;
    const item = countryName ? nameToItem[countryName] : undefined;
    if (!item) return colors.mapNoData;

    // Active topic filter overrides view mode — paint a heatmap for that topic/tag's share per country
    if (activeTopicFilter) {
      const pct = topicCountryPct[countryName];
      if (pct === undefined) return colors.mapNoData;
      const base = getCategoryColor(topicFilterCategory || activeTopicFilter);
      const alpha = Math.round((0.25 + Math.min(pct / 40, 1) * 0.75) * 255);
      return base + alpha.toString(16).padStart(2, "0");
    }

    if (viewMode === "language") return item.dominant_language ? catColor(item.dominant_language) : colors.mapNoData;
    if (viewMode === "model")    return item.dominant_model    ? catColor(item.dominant_model)    : colors.mapNoData;
    if (viewMode === "topic")    return getTopicDominantColor(countryName);
    return getVolumeColor(item.pct);
  }

  function getCatLegend(): { label: string; color: string }[] {
    if (viewMode === "topic") {
      return Object.entries(CATEGORY_COLOR_IDX)
        .filter(([cat]) => cat !== "Other")
        .map(([cat, idx]) => ({ label: cat, color: colors.chart[idx] ?? colors.chartMuted }))
        .concat([{ label: "Other", color: colors.chartMuted }]);
    }
    const seen = new Map<string, string>();
    for (const item of countries) {
      const val = viewMode === "language" ? item.dominant_language : item.dominant_model;
      if (val && !seen.has(val)) seen.set(val, catColor(val));
      if (seen.size >= 8) break;
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }

  const viewModes: { key: ViewMode; label: string }[] = [
    { key: "volume", label: "Volume" },
    { key: "language", label: "Language" },
    { key: "model", label: "Model" },
    { key: "topic", label: "Topic" },
  ];

  return (
    <div
      className="card p-4 flex flex-col gap-2"
      style={{ position: "relative" }}
      onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setIsDragOver(true); }}
      onDragLeave={() => { if (--dragCounter.current === 0) setIsDragOver(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragOver(false);
        // Trust the custom MIME type — only set by TopicClustering pill drags
        const cat = e.dataTransfer.getData("application/x-wc-topic");
        if (cat && onTopicDrop) onTopicDrop(cat);
      }}
    >
      {/* Drop zone overlay */}
      {isDragOver && (
        <div
          style={{
            position: "absolute", inset: 0, borderRadius: 8, zIndex: 10,
            background: `${colors.chart[0]}18`,
            border: `2px dashed ${colors.chart[0]}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ color: colors.chart[0], fontWeight: 600, fontSize: 13 }}>
            Drop to filter by topic
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="label">Interactive Map</div>
        <div className="flex gap-1">
          {viewModes.map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn text-xs ${viewMode === key ? "active" : ""}`}
              style={{ padding: "2px 8px", fontSize: 10 }}
              onClick={() => setViewMode(key)}
            >
              {label}
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
                          x: evt.clientX + 16,
                          y: evt.clientY - 20,
                          country: countryName,
                          count: item.count,
                          pct: item.pct,
                          dominant_language: item.dominant_language,
                          dominant_model: item.dominant_model,
                          topCategories: topicsByCountry?.[countryName],
                        });
                      } else if (countryName) {
                        setTooltip({ x: evt.clientX + 16, y: evt.clientY - 20, country: countryName, count: 0, pct: 0 });
                      }
                    }}
                    onMouseMove={(evt) => {
                      if (tooltip) {
                        setTooltip((t) => t ? { ...t, x: evt.clientX + 16, y: evt.clientY - 20 } : null);
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => { if (countryName && onCountryClick) onCountryClick(countryName); }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Legend */}
      {activeTopicFilter ? (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-text-secondary text-xs">less</span>
          <div
            className="flex-1 h-2 rounded"
            style={{
              background: `linear-gradient(90deg, ${getCategoryColor(activeTopicFilter)}40, ${getCategoryColor(activeTopicFilter)})`,
            }}
          />
          <span className="text-text-secondary text-xs">more</span>
          <span className="text-xs font-semibold ml-1" style={{ color: getCategoryColor(activeTopicFilter) }}>
            {activeTopicFilter}
          </span>
        </div>
      ) : viewMode === "volume" ? (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-text-secondary text-xs">low</span>
          <div
            className="flex-1 h-2 rounded"
            style={{ background: `linear-gradient(90deg, ${colors.mapScale[0]}, ${colors.mapScale[2]}, ${colors.mapScale[5]})` }}
          />
          <span className="text-text-secondary text-xs">high</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {getCatLegend().map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-text-secondary text-xs truncate" style={{ maxWidth: 120 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active filters */}
      <div className="flex flex-wrap gap-3">
        {activeCountry && onCountryClick && (
          <div className="text-xs text-text-secondary">
            Country: <span style={{ color: colors.accent }}>{activeCountry}</span>
            <button className="ml-1 hover:underline" style={{ color: colors.accent }} onClick={() => onCountryClick("")}>✕</button>
          </div>
        )}
        {activeTopicFilter && onTopicDrop && (
          <div className="text-xs text-text-secondary">
            Topic: <span style={{ color: getCategoryColor(activeTopicFilter) }}>{activeTopicFilter}</span>
            <button className="ml-1 hover:underline" style={{ color: getCategoryColor(activeTopicFilter) }} onClick={() => onTopicDrop("")}>✕</button>
          </div>
        )}
      </div>

      {/* Rich tooltip bubble */}
      {tooltip && tooltip.count > 0 && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {/* left-pointing arrow tail */}
          <div style={{
            position: "absolute", left: -6, top: 18,
            width: 0, height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderRight: `6px solid ${colors.tooltipBorder}`,
          }} />
          <div style={{
            background: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 6,
            padding: "10px 12px",
            minWidth: 200,
            maxWidth: 240,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: colors.tooltipText, marginBottom: 2 }}>
              {tooltip.country}
            </div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
              {tooltip.count.toLocaleString()} conversations · {tooltip.pct}%
            </div>

            {(tooltip.dominant_language || tooltip.dominant_model) && (
              <div style={{ borderTop: `1px solid ${colors.tooltipBorder}`, paddingTop: 7, marginBottom: 7 }}>
                {tooltip.dominant_language && (
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 3 }}>
                    Language: <span style={{ color: colors.tooltipText }}>{tooltip.dominant_language}</span>
                  </div>
                )}
                {tooltip.dominant_model && (
                  <div style={{ fontSize: 11, color: colors.textSecondary }}>
                    Model: <span style={{ color: colors.tooltipText, fontFamily: "monospace", fontSize: 10 }}>{tooltip.dominant_model}</span>
                  </div>
                )}
              </div>
            )}

            {tooltip.topCategories && tooltip.topCategories.length > 0 && (
              <div style={{ borderTop: `1px solid ${colors.tooltipBorder}`, paddingTop: 7 }}>
                <div style={{ fontSize: 9, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                  Top Topics
                </div>
                {tooltip.topCategories.map(({ category, pct }) => {
                  const c = getCategoryColor(category);
                  return (
                    <div key={category} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: colors.tooltipText, flex: 1 }}>{category}</span>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: c }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
