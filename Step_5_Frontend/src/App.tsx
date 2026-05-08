import { useEffect, useState } from "react";
import type {
  Overview,
  TopicItem,
  LanguageItem,
  ModelItem,
  CountryItem,
  SummaryStats,
  ConversationRow,
  Filters,
  FilterPreset,
  ActivityEntry,
} from "./types";
import {
  fetchOverview,
  fetchTopics,
  fetchLanguages,
  fetchModels,
  fetchCountries,
  fetchSummary,
} from "./api";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import StatCards from "./components/StatCards";
import TopicClustering from "./components/TopicClustering";
import WorldMap from "./components/WorldMap";
import ConversationList from "./components/ConversationList";
import EtlLog from "./components/EtlLog";
import SummaryStatsPanel from "./components/SummaryStats";
import RightPanel from "./components/RightPanel";
import GeographicView from "./components/GeographicView";
import LanguageView from "./components/LanguageView";
import ModelView from "./components/ModelView";
import TurnDepthCompare from "./components/TurnDepthCompare";

type View = "overview" | "explorer" | "geographic" | "language" | "model" | "etl" | "turns";

const DEFAULT_FILTERS: Filters = {
  model: "", language: "", country: "", redactedOnly: false, search: "",
  dateFrom: "", dateTo: "", topicFilter: "", turnMin: 0, turnMax: 0,
};

function filtersFromURL(): Partial<Filters> {
  const p = new URLSearchParams(window.location.search);
  const partial: Partial<Filters> = {};
  if (p.get("model")) partial.model = p.get("model")!;
  if (p.get("language")) partial.language = p.get("language")!;
  if (p.get("country")) partial.country = p.get("country")!;
  if (p.get("redactedOnly") === "true") partial.redactedOnly = true;
  if (p.get("search")) partial.search = p.get("search")!;
  if (p.get("dateFrom")) partial.dateFrom = p.get("dateFrom")!;
  if (p.get("dateTo")) partial.dateTo = p.get("dateTo")!;
  if (p.get("topicFilter")) partial.topicFilter = p.get("topicFilter")!;
  if (p.get("turnMin")) partial.turnMin = Number(p.get("turnMin"));
  if (p.get("turnMax")) partial.turnMax = Number(p.get("turnMax"));
  return partial;
}

function filtersToURL(f: Filters) {
  const p = new URLSearchParams();
  if (f.model) p.set("model", f.model);
  if (f.language) p.set("language", f.language);
  if (f.country) p.set("country", f.country);
  if (f.redactedOnly) p.set("redactedOnly", "true");
  if (f.search) p.set("search", f.search);
  if (f.dateFrom) p.set("dateFrom", f.dateFrom);
  if (f.dateTo) p.set("dateTo", f.dateTo);
  if (f.topicFilter) p.set("topicFilter", f.topicFilter);
  if (f.turnMin > 0) p.set("turnMin", String(f.turnMin));
  if (f.turnMax > 0) p.set("turnMax", String(f.turnMax));
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function LoadingBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border-base text-xs text-text-secondary"
         style={{ background: "#141414" }}>
      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
      Loading dataset… This may take 30–60 seconds on first load while the server indexes 838k rows.
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [selectedConv, setSelectedConv] = useState<ConversationRow | null>(null);

  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    ...filtersFromURL(),
  }));

  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("wc_presets") || "[]"); } catch { return []; }
  });

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("wc_activity") || "[]"); } catch { return []; }
  });

  function logActivity(type: ActivityEntry["type"], label: string, currentFilters: Filters) {
    const entry: ActivityEntry = {
      id: String(Date.now()),
      type, label,
      timestamp: new Date().toISOString(),
      filterSnapshot: currentFilters,
    };
    setActivityLog((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      sessionStorage.setItem("wc_activity", JSON.stringify(next));
      return next;
    });
  }

  function handleFilterChange(key: string, value: string | boolean | number) {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      filtersToURL(next);
      if (key !== "search") {
        logActivity("filter", `Filter: ${key} = ${value || "any"}`, next);
      }
      return next;
    });
  }

  function savePreset(name: string) {
    const preset: FilterPreset = { id: String(Date.now()), name, filters, createdAt: new Date().toISOString() };
    setPresets((prev) => {
      const next = [preset, ...prev];
      sessionStorage.setItem("wc_presets", JSON.stringify(next));
      return next;
    });
    logActivity("preset", `Saved preset "${name}"`, filters);
  }

  function applyPreset(preset: FilterPreset) {
    setFilters(preset.filters);
    filtersToURL(preset.filters);
    logActivity("preset", `Applied preset "${preset.name}"`, preset.filters);
  }

  function deletePreset(id: string) {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      sessionStorage.setItem("wc_presets", JSON.stringify(next));
      return next;
    });
  }

  function handleSelectConv(row: ConversationRow) {
    setSelectedConv(row);
    logActivity("conversation", `Opened conversation ${row.conversation_hash}`, filters);
  }

  function handleTopicFilter(cat: string) {
    handleFilterChange("topicFilter", cat);
    if (cat) logActivity("filter", `Topic filter: ${cat}`, { ...filters, topicFilter: cat });
  }

  function handleCountryFilter(country: string) {
    handleFilterChange("country", country);
    if (country) logActivity("country", `Country filter: ${country}`, { ...filters, country });
  }

  function handleRestoreActivity(entry: ActivityEntry) {
    setFilters(entry.filterSnapshot);
    filtersToURL(entry.filterSnapshot);
  }

  useEffect(() => {
    setLoadingOverview(true);
    setLoadingTopics(true);
    fetchOverview()
      .then((d) => { setOverview(d); })
      .catch(() => {})
      .finally(() => setLoadingOverview(false));
    fetchTopics().then(setTopics).catch(() => {}).finally(() => setLoadingTopics(false));
    fetchLanguages(30).then(setLanguages).catch(() => {});
    fetchModels().then(setModels).catch(() => {});
    fetchSummary().then(setSummaryStats).catch(() => {});
  }, []);

  // Re-fetch countries whenever date range changes
  useEffect(() => {
    fetchCountries(50, filters.dateFrom || undefined, filters.dateTo || undefined)
      .then(setCountries)
      .catch(() => {});
  }, [filters.dateFrom, filters.dateTo]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {loadingOverview && <LoadingBanner />}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={view} onSelect={(v) => setView(v as View)} />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar
            overview={overview}
            models={models}
            languages={languages}
            countries={countries}
            filters={filters}
            onFilterChange={handleFilterChange}
            presets={presets}
            onSavePreset={savePreset}
            onApplyPreset={applyPreset}
            onDeletePreset={deletePreset}
          />

          <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

            {/* Overview */}
            {view === "overview" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 320px" }}>
                  <WorldMap
                    countries={countries}
                    onCountryClick={handleCountryFilter}
                    activeCountry={filters.country}
                  />
                  <TopicClustering
                    topics={topics}
                    loading={loadingTopics}
                    onTopicFilter={handleTopicFilter}
                    activeTopicFilter={filters.topicFilter}
                  />
                </div>
                <ConversationList
                  filters={filters}
                  onSelect={handleSelectConv}
                  selectedHash={selectedConv?.full_hash ?? null}
                  onFilterChange={handleFilterChange}
                />
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <EtlLog />
                  <SummaryStatsPanel stats={summaryStats} loading={loadingOverview} />
                </div>
              </>
            )}

            {/* Explorer */}
            {view === "explorer" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <ConversationList
                  filters={filters}
                  onSelect={handleSelectConv}
                  selectedHash={selectedConv?.full_hash ?? null}
                  onFilterChange={handleFilterChange}
                />
              </>
            )}

            {/* Geographic */}
            {view === "geographic" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <GeographicView
                  countries={countries}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onCountryClick={handleCountryFilter}
                  activeCountry={filters.country}
                />
              </>
            )}

            {/* Language */}
            {view === "language" && (
              <LanguageView languages={languages} stats={summaryStats} />
            )}

            {/* Model */}
            {view === "model" && (
              <ModelView models={models} />
            )}

            {/* ETL Log */}
            {view === "etl" && (
              <EtlLog fullView />
            )}

            {/* Turn Depth */}
            {view === "turns" && (
              <TurnDepthCompare />
            )}

          </main>
        </div>

        <RightPanel
          selected={selectedConv}
          presets={presets}
          activityLog={activityLog}
          onApplyPreset={applyPreset}
          onDeletePreset={deletePreset}
          onRestoreActivity={handleRestoreActivity}
        />
      </div>
    </div>
  );
}
