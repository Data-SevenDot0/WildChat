import { useState } from "react";
import { ComposableMap, Geographies, Geography, Sphere } from "react-simple-maps";
import type { GeoDrilldownItem } from "../types";
import { useTheme } from "../context/ThemeContext";

const US_GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FIPS_TO_STATE: Record<string, string> = {
  "01": "Alabama",        "02": "Alaska",         "04": "Arizona",
  "05": "Arkansas",       "06": "California",     "08": "Colorado",
  "09": "Connecticut",    "10": "Delaware",        "11": "District of Columbia",
  "12": "Florida",        "13": "Georgia",         "15": "Hawaii",
  "16": "Idaho",          "17": "Illinois",        "18": "Indiana",
  "19": "Iowa",           "20": "Kansas",          "21": "Kentucky",
  "22": "Louisiana",      "23": "Maine",           "24": "Maryland",
  "25": "Massachusetts",  "26": "Michigan",        "27": "Minnesota",
  "28": "Mississippi",    "29": "Missouri",        "30": "Montana",
  "31": "Nebraska",       "32": "Nevada",          "33": "New Hampshire",
  "34": "New Jersey",     "35": "New Mexico",      "36": "New York",
  "37": "North Carolina", "38": "North Dakota",    "39": "Ohio",
  "40": "Oklahoma",       "41": "Oregon",          "42": "Pennsylvania",
  "44": "Rhode Island",   "45": "South Carolina",  "46": "South Dakota",
  "47": "Tennessee",      "48": "Texas",           "49": "Utah",
  "50": "Vermont",        "51": "Virginia",        "53": "Washington",
  "54": "West Virginia",  "55": "Wisconsin",       "56": "Wyoming",
};

interface CountryGeoConfig {
  url: string;
  nameProperty: string;
  projection: string;
  scale: number;
  center: [number, number];
}

// Per-country TopoJSON via jsDelivr CDN (deldersveld/topojson).
// nameProperty is the geo.properties key that holds the English region name.
const COUNTRY_GEO_CONFIG: Record<string, CountryGeoConfig> = {
  "Canada": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/canada/canada-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 300,
    center: [-97, 62],
  },
  "China": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/china/china-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 500,
    center: [104, 35],
  },
  "India": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/india/india-states.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 700,
    center: [80, 23],
  },
  "Brazil": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/brazil/brazil-states.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 550,
    center: [-53, -14],
  },
  "Australia": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/australia/australia-states.json",
    nameProperty: "STATE_NAME",
    projection: "geoMercator",
    scale: 450,
    center: [133, -27],
  },
  "Germany": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/germany/germany-states.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 2500,
    center: [10, 51],
  },
  "France": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/france/fr-departments.json",
    nameProperty: "NAME_2",
    projection: "geoMercator",
    scale: 2200,
    center: [2, 47],
  },
  "United Kingdom": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/united-kingdom/uk-counties.json",
    nameProperty: "NAME_2",
    projection: "geoMercator",
    scale: 2200,
    center: [-2, 54],
  },
  "Japan": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/japan/japan-prefectures.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 1200,
    center: [138, 37],
  },
  "Russia": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/russia/russia-federal-subjects.json",
    nameProperty: "NAME_1",
    projection: "geoNaturalEarth1",
    scale: 340,
    center: [97, 65],
  },
  "Mexico": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/mexico/mexico-states.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 850,
    center: [-102, 24],
  },
  "Argentina": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/argentina/argentina-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 600,
    center: [-65, -35],
  },
  "Spain": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/spain/spain-communities.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 2500,
    center: [-4, 40],
  },
  "Italy": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/italy/italy-regions.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 2200,
    center: [12, 42],
  },
  "Poland": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/poland/poland-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 2500,
    center: [19, 52],
  },
  "Turkey": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/turkey/turkey-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 1800,
    center: [35, 39],
  },
  "South Korea": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/south-korea/south-korea-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 3500,
    center: [128, 36],
  },
  "Indonesia": {
    url: "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/indonesia/indonesia-provinces.json",
    nameProperty: "NAME_1",
    projection: "geoMercator",
    scale: 700,
    center: [118, -2],
  },
};

interface Props {
  country: string;
  items: GeoDrilldownItem[];
  selectedState?: string | null;
  onStateClick?: (state: string) => void;
}

export default function CountryMapView({ country, items, selectedState, onStateClick }: Props) {
  const { colors } = useTheme();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const maxCount = Math.max(...items.map(i => i.count), 1);
  const itemByName: Record<string, GeoDrilldownItem> = {};
  items.forEach(item => { itemByName[item.name] = item; });

  function getColor(name: string): string {
    const item = itemByName[name];
    if (!item) return colors.mapNoData;
    const ratio = item.count / maxCount;
    const s = colors.mapScale;
    if (ratio > 0.8) return s[5];
    if (ratio > 0.6) return s[4];
    if (ratio > 0.4) return s[3];
    if (ratio > 0.2) return s[2];
    if (ratio > 0.05) return s[1];
    return s[0];
  }

  const legend = (
    <div className="flex items-center gap-2 mt-1 mb-2">
      <span className="text-text-secondary text-xs">fewer</span>
      <div
        className="flex-1 h-2 rounded"
        style={{ background: `linear-gradient(90deg, ${colors.mapScale[0]}, ${colors.mapScale[2]}, ${colors.mapScale[5]})` }}
      />
      <span className="text-text-secondary text-xs">more</span>
    </div>
  );

  const tooltipEl = tooltip && (
    <div style={{
      position: "fixed", left: tooltip.x, top: tooltip.y,
      background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 4, padding: "4px 8px", fontSize: 11,
      color: colors.tooltipText, pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap",
    }}>
      {tooltip.content}
    </div>
  );

  // US: use Albers USA projection with FIPS lookup
  if (country === "United States") {
    return (
      <div style={{ position: "relative" }}>
        <ComposableMap projection="geoAlbersUsa" style={{ width: "100%", height: "auto" }}>
          <Geographies geography={US_GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const fips = String(geo.id).padStart(2, "0");
                const stateName = FIPS_TO_STATE[fips];
                const item = stateName ? itemByName[stateName] : undefined;
                const isSelected = stateName === selectedState;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? colors.mapHover : getColor(stateName)}
                    stroke={colors.mapBorder}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: colors.mapHover, outline: "none", cursor: item ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={evt => {
                      setTooltip({
                        x: evt.clientX + 12,
                        y: evt.clientY - 28,
                        content: item
                          ? `${stateName}: ${item.count.toLocaleString()} convs · ${item.dominant_language}`
                          : (stateName ?? ""),
                      });
                    }}
                    onMouseMove={evt =>
                      setTooltip(t => t ? { ...t, x: evt.clientX + 12, y: evt.clientY - 28 } : null)
                    }
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => { if (item && onStateClick) onStateClick(stateName); }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {legend}
        {tooltipEl}
      </div>
    );
  }

  // Configured countries: generic choropleth
  const geoConfig = COUNTRY_GEO_CONFIG[country];
  if (geoConfig) {
    return (
      <div style={{ position: "relative" }}>
        <ComposableMap
          projection={geoConfig.projection}
          projectionConfig={{ scale: geoConfig.scale, center: geoConfig.center }}
          style={{ width: "100%", height: "auto" }}
        >
          <Sphere id="sphere" fill={colors.mapOcean} stroke={colors.mapOcean} strokeWidth={0.5} />
          <Geographies geography={geoConfig.url}>
            {({ geographies }) =>
              geographies.map(geo => {
                const regionName = geo.properties[geoConfig.nameProperty] as string | undefined;
                const item = regionName ? itemByName[regionName] : undefined;
                const isSelected = regionName === selectedState;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? colors.mapHover : getColor(regionName ?? "")}
                    stroke={colors.mapBorder}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: colors.mapHover, outline: "none", cursor: item ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={evt => {
                      setTooltip({
                        x: evt.clientX + 12,
                        y: evt.clientY - 28,
                        content: item
                          ? `${regionName}: ${item.count.toLocaleString()} convs · ${item.dominant_language}`
                          : (regionName ?? ""),
                      });
                    }}
                    onMouseMove={evt =>
                      setTooltip(t => t ? { ...t, x: evt.clientX + 12, y: evt.clientY - 28 } : null)
                    }
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => { if (item && onStateClick && regionName) onStateClick(regionName); }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {legend}
        {tooltipEl}
      </div>
    );
  }

  // Fallback: proportional bubble grid for countries without a TopoJSON config
  if (items.length === 0) {
    return <div className="text-text-muted text-xs py-2">No regional breakdown available.</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 py-2 mb-3">
      {items.map(item => {
        const ratio = item.count / maxCount;
        const size = Math.max(52, Math.round(ratio * 156));
        const isSelected = item.name === selectedState;
        return (
          <button
            key={item.name}
            className="flex flex-col items-center justify-center rounded-xl"
            style={{
              width: size, height: size,
              background: isSelected ? colors.mapHover : getColor(item.name),
              border: `2px solid ${isSelected ? colors.accent : "transparent"}`,
              cursor: "pointer", flexShrink: 0,
            }}
            onClick={() => onStateClick && onStateClick(item.name)}
            title={`${item.name}: ${item.count.toLocaleString()} conversations`}
          >
            <span
              className="text-white font-medium text-center leading-tight px-1"
              style={{ fontSize: size < 80 ? 9 : 11 }}
            >
              {item.name.length > 14 && size < 110 ? item.name.slice(0, 12) + "…" : item.name}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>
              {item.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
