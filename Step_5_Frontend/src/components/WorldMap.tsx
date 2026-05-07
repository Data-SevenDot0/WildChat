import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import type { CountryItem } from "../types";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Map from country name to ISO-3166-1 numeric code used by world-atlas
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

function getColor(pct: number): string {
  if (pct > 15) return "#1ea882";
  if (pct > 8) return "#27a87a";
  if (pct > 4) return "#2ba870";
  if (pct > 2) return "#1e7a5e";
  if (pct > 0.5) return "#165c46";
  if (pct > 0) return "#0f3d2e";
  return "#111e2e";
}

interface Props {
  countries: CountryItem[];
}

export default function WorldMap({ countries }: Props) {
  const pctMap: Record<number, number> = {};
  countries.forEach(({ country, pct }) => {
    const num = COUNTRY_TO_NUM[country];
    if (num) pctMap[num] = pct;
  });

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="label">Interactive Map</div>
      <div style={{ marginTop: -8, marginBottom: -8 }}>
        <ComposableMap
          projection="geoNaturalEarth1"
          style={{ width: "100%", height: "auto" }}
          projectionConfig={{ scale: 140 }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numId = Number(geo.id);
                const pct = pctMap[numId] ?? 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(pct)}
                    stroke="#0c1520"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#2ecc9e", outline: "none" },
                      pressed: { outline: "none" },
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
            background:
              "linear-gradient(90deg, #0f3d2e, #165c46, #1e7a5e, #2ba870, #1ea882)",
          }}
        />
        <span className="text-text-secondary text-xs">high</span>
      </div>
    </div>
  );
}
