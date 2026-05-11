import { useEffect, useRef, useState } from "react";
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
  ModelTopicMatrixItem,
} from "./types";
import {
  fetchOverview,
  fetchTopics,
  fetchLanguages,
  fetchModels,
  fetchCountries,
  fetchSummary,
  fetchModelTopicMatrix,
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
import NotesView from "./components/NotesView";
import GeographicView from "./components/GeographicView";
import LanguageView from "./components/LanguageView";
import ModelView from "./components/ModelView";
import TurnDepthCompare from "./components/TurnDepthCompare";
import WildchatLogo from "./components/WildchatLogo";
import ModelTopicMatrix from "./components/ModelTopicMatrix";
import ContinentView from "./components/ContinentView";
import LoginModal from "./components/LoginModal";
import GraphBuilder from "./components/GraphBuilder";      // Fix 4
import TagManager from "./components/TagManager";          // Fix 5
import { useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { TagProvider } from "./context/TagContext";        // Fix 5

// Fix 4 + Fix 5 — expanded view type
type View = "overview" | "explorer" | "notes" | "geographic" | "language" | "model" | "etl" | "turns" | "matrix" | "continent" | "graph" | "tags";

const DEFAULT_FILTERS: Filters = {
  model: "", language: "", country: "", redactedOnly: false, search: "",
  dateFrom: "", dateTo: "", topicFilter: "", turnMin: 0, turnMax: 0,
  tagFilter: "", // Fix 5 — client-side only, not synced to URL or sent to server
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
  // tagFilter intentionally excluded — it is client-side only
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
  // tagFilter intentionally excluded — client-side only
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
  const { colors } = useTheme();
  const [view, setView] = useState<View>("overview");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [modelTopicMatrix, setModelTopicMatrix] = useState<ModelTopicMatrixItem[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
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
    try {
      const raw: ActivityEntry[] = JSON.parse(sessionStorage.getItem("wc_activity") || "[]");
      const seen = new Set<string>();
      return raw.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    } catch { return []; }
  });
  const activityCounter = useRef(0);

  function logActivity(type: ActivityEntry["type"], label: string, currentFilters: Filters) {
    // Never log when all filters are at their default values — this ensures that clearing
    // filters (via any path) never writes a spurious entry to Session History.
    const isAllDefault =
      !currentFilters.model && !currentFilters.language && !currentFilters.country &&
      !currentFilters.redactedOnly && !currentFilters.search && !currentFilters.dateFrom &&
      !currentFilters.dateTo && !currentFilters.topicFilter &&
      !currentFilters.turnMin && !currentFilters.turnMax;
    if (isAllDefault) return;

    const entry: ActivityEntry = {
      id: `${Date.now()}-${++activityCounter.current}`,
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
    // Compute next for logging before the state update. Using filters directly here is
    // safe because handleFilterChange is always called from a discrete user event, so
    // the filters closure is the current committed state at call time.
    const next = { ...filters, [key]: value };

    // Keep the functional updater so that rapid or batched calls (e.g. restoring a preset)
    // still chain correctly on the latest state rather than a stale closure.
    setFilters((f) => {
      const computed = { ...f, [key]: value };
      filtersToURL(computed);
      return computed;
    });

    // logActivity is called exactly once here, outside the functional updater.
    // StrictMode double-invokes the updater above but does not re-run this call.
    if (key !== "search" && key !== "country" && key !== "tagFilter") {
      logActivity("filter", `Filter: ${key} = ${value || "any"}`, next);
    }
    // Fix 2 — Log searches to activityLog so My History can pick them up
    if (key === "search" && value) {
      logActivity("search", `Search: "${value}"`, next);
    }
  }

  // Clears all filters in a single state update so no log entry is written.
  // TopBar's clearAll previously called onFilterChange ~10 times; each call would
  // have triggered a separate log entry. A dedicated handler avoids that entirely.
  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
    filtersToURL(DEFAULT_FILTERS);
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
    // Fix 1 — Previously this called logActivity a second time after handleFilterChange,
    // creating a duplicate entry. handleFilterChange already logs type="filter".
    handleFilterChange("topicFilter", cat);
  }

  // Fix 1 — handleCountryFilter no longer calls handleFilterChange to avoid a duplicate
  // "filter" entry alongside the intentional "country" entry. State is updated directly.
  function handleCountryFilter(country: string) {
    setFilters((f) => {
      const next = { ...f, country };
      filtersToURL(next);
      return next;
    });
    logActivity("country", country ? `Country: ${country}` : "Country filter cleared", { ...filters, country });
  }

  function handleRestoreActivity(entry: ActivityEntry) {
    setFilters(entry.filterSnapshot);
    filtersToURL(entry.filterSnapshot);
  }

  // Fix 4 — callback so GraphBuilder can log "graph saved" to activityLog
  // (RightPanel watches activityLog and syncs meaningful entries to My History)
  function handleGraphSaved(name: string) {
    logActivity("preset", `Graph saved: "${name}"`, filters);
  }

  useEffect(() => {
    const open = () => setShowLoginModal(true);
    document.addEventListener("wc:open-login", open);
    return () => document.removeEventListener("wc:open-login", open);
  }, []);

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
    fetchModelTopicMatrix().then(setModelTopicMatrix).catch(() => {}).finally(() => setLoadingMatrix(false));
  }, []);

  useEffect(() => {
    fetchCountries(250, filters.dateFrom || undefined, filters.dateTo || undefined)
      .then(setCountries)
      .catch(() => {});
  }, [filters.dateFrom, filters.dateTo]);

  return (
    <AuthProvider>
    <TagProvider>
    <div className="flex flex-col h-screen overflow-hidden">
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
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
            onClearAll={handleClearFilters}
            presets={presets}
            onSavePreset={savePreset}
            onApplyPreset={applyPreset}
            onDeletePreset={deletePreset}
          />

          <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

            {/* Overview */}
            {view === "overview" && (
              <>
                <div className="flex flex-col items-center gap-2 py-4">
                  <WildchatLogo size={80} wordmark={false} />
                  <span style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: "0.01em", color: colors.textPrimary }}>
                    Wild<span style={{ color: colors.logoAccent, fontWeight: 400 }}>chat</span> Lens
                  </span>
                  <span style={{ fontSize: 13, color: colors.textSecondary, letterSpacing: "0.04em" }}>
                    conversation analytics
                  </span>
                </div>
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

            {/* Notes */}
            {view === "notes" && <NotesView />}

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

            {/* Model × Topic Matrix */}
            {view === "matrix" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <ModelTopicMatrix data={modelTopicMatrix} loading={loadingMatrix} />
              </>
            )}

            {/* Continent Drill-Down */}
            {view === "continent" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <ContinentView
                  countries={countries}
                  onCountryFilter={handleCountryFilter}
                  activeCountry={filters.country}
                />
              </>
            )}

            {/* Fix 4 — Graph builder view */}
            {view === "graph" && (
              <GraphBuilder
                models={models}
                languages={languages}
                countries={countries}
                onGraphSaved={handleGraphSaved}
              />
            )}

            {/* Fix 5 — Tag manager view */}
            {view === "tags" && (
              <TagManager />
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
    </TagProvider>
    </AuthProvider>
  );
}
