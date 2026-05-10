// ── Fix 3: Country drill-down — state-level geographic breakdown ─────────────
// Renders beneath the interactive map when a country is selected.
// Shows per-state conversation stats with dominant model, language, and avg turns.
// Clicking a state shows a city-level panel (or a graceful "not available" message).

import { useEffect, useState } from "react";
import type { GeoDrilldownItem, GeoDrilldownResponse } from "../types";
import { fetchGeographicDrilldown } from "../api";
import { useTheme } from "../context/ThemeContext";
import CountryMapView from "./CountryMapView";

interface Props {
  country: string;
  onClose: () => void;
}

export default function GeographicDrilldown({ country, onClose }: Props) {
  const { colors } = useTheme();

  // Breadcrumb navigation state
  const [level, setLevel] = useState<"state" | "city">("state");
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const [stateData, setStateData] = useState<GeoDrilldownResponse | null>(null);
  const [cityData, setCityData] = useState<GeoDrilldownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch state-level data when country is selected
  useEffect(() => {
    setLevel("state");
    setSelectedState(null);
    setCityData(null);
    setError("");
    if (!country) return;

    setLoading(true);
    fetchGeographicDrilldown(country)
      .then(setStateData)
      .catch(() => setError("Failed to load geographic data."))
      .finally(() => setLoading(false));
  }, [country]);

  // Fetch city-level data when a state is clicked
  function handleStateClick(stateName: string) {
    setSelectedState(stateName);
    setLevel("city");
    setLoading(true);
    fetchGeographicDrilldown(country, stateName)
      .then(setCityData)
      .catch(() => setError("Failed to load state data."))
      .finally(() => setLoading(false));
  }

  function goBack() {
    setLevel("state");
    setSelectedState(null);
    setCityData(null);
  }

  const displayData = level === "state" ? stateData : cityData;
  const items: GeoDrilldownItem[] = displayData?.items ?? [];
  const message = displayData?.message;
  const maxCount = items[0]?.count ?? 1;

  return (
    <div className="card p-4" style={{ marginTop: 0 }}>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            className="hover:underline"
            style={{ color: level === "state" ? colors.accent : colors.textSecondary }}
            onClick={() => level === "city" && goBack()}
          >
            {country}
          </button>
          {selectedState && (
            <>
              <span style={{ color: colors.textMuted }}>›</span>
              <span style={{ color: colors.accent }}>{selectedState}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {level === "city" && (
            <button className="filter-btn text-xs" style={{ padding: "2px 8px" }} onClick={goBack}>
              ← Back
            </button>
          )}
          <button
            className="text-text-muted hover:text-text-primary text-xs"
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div className="label mb-3">
        {level === "state" ? "State / Region Breakdown" : `Cities in ${selectedState}`}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
          <span className="text-text-secondary text-xs">Loading…</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-xs py-4 text-center" style={{ color: "#ef4444" }}>{error}</div>
      )}

      {!loading && !error && message && items.length === 0 && (
        <div className="text-xs text-text-muted py-4 text-center">{message}</div>
      )}

      {!loading && !error && level === "state" && stateData && stateData.items.length > 0 && (
        <CountryMapView
          country={country}
          items={stateData.items}
          selectedState={selectedState}
          onStateClick={stateName => {
            handleStateClick(stateName);
          }}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {/* Column headers */}
          <div className="grid text-xs text-text-secondary mb-2 px-1" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}>
            <span>{level === "state" ? "State / Region" : "City"}</span>
            <span className="text-right">Conversations</span>
            <span className="text-right">Avg Turns</span>
            <span className="text-right truncate">Model</span>
            <span className="text-right truncate">Language</span>
          </div>

          <div className="flex flex-col gap-2" style={{ maxHeight: 320, overflowY: "auto" }}>
            {items.map((item) => (
              <div
                key={item.name}
                className="rounded px-1 py-1"
                style={{
                  cursor: level === "state" ? "pointer" : "default",
                  background: "transparent",
                }}
                onMouseEnter={e => { if (level === "state") (e.currentTarget as HTMLElement).style.background = colors.bgHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                onClick={() => level === "state" && handleStateClick(item.name)}
              >
                <div className="grid text-xs mb-1" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}>
                  <span style={{ color: colors.accent, fontWeight: 500 }}>{item.name}</span>
                  <span className="text-right text-text-secondary">{item.count.toLocaleString()}</span>
                  <span className="text-right text-text-secondary">{item.avg_turns}</span>
                  <span className="text-right text-text-muted truncate" title={item.dominant_model}>{item.dominant_model.replace("gpt-3.5-turbo-", "3.5-").replace("gpt-4-", "4-")}</span>
                  <span className="text-right text-text-muted truncate" title={item.dominant_language}>{item.dominant_language}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {level === "state" && (
            <div className="mt-2 text-xs text-text-muted">
              Click a state to drill down · {items.length} regions with data
            </div>
          )}
        </>
      )}
    </div>
  );
}
