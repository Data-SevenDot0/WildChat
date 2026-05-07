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

type View = "overview" | "explorer" | "geographic" | "language" | "model";

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
  const [serverReady, setServerReady] = useState(false);
  const [selectedConv, setSelectedConv] = useState<ConversationRow | null>(null);

  const [filters, setFilters] = useState<Filters>({
    model: "",
    language: "",
    country: "",
    redactedOnly: false,
    search: "",
  });

  function handleFilterChange(key: string, value: string | boolean) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  // Load all static data on mount
  useEffect(() => {
    setLoadingOverview(true);
    setLoadingTopics(true);

    fetchOverview()
      .then((d) => { setOverview(d); setServerReady(true); })
      .catch(() => {})
      .finally(() => setLoadingOverview(false));

    fetchTopics()
      .then(setTopics)
      .catch(() => {})
      .finally(() => setLoadingTopics(false));

    fetchLanguages(30).then(setLanguages).catch(() => {});
    fetchModels().then(setModels).catch(() => {});
    fetchCountries(50).then(setCountries).catch(() => {});
    fetchSummary().then(setSummaryStats).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {loadingOverview && <LoadingBanner />}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeView={view} onSelect={(v) => setView(v)} />

        {/* Main */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top bar */}
          <TopBar
            overview={overview}
            models={models}
            languages={languages}
            countries={countries}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

            {/* ── Overview ───────────────────────────────────────────── */}
            {view === "overview" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 320px" }}>
                  <WorldMap countries={countries} />
                  <TopicClustering topics={topics} loading={loadingTopics} />
                </div>
                <ConversationList
                  filters={filters}
                  onSelect={setSelectedConv}
                  selectedHash={selectedConv?.full_hash ?? null}
                />
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <EtlLog overview={overview} />
                  <SummaryStatsPanel stats={summaryStats} loading={loadingOverview} />
                </div>
              </>
            )}

            {/* ── Conversation Explorer ───────────────────────────────── */}
            {view === "explorer" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <ConversationList
                  filters={filters}
                  onSelect={setSelectedConv}
                  selectedHash={selectedConv?.full_hash ?? null}
                />
              </>
            )}

            {/* ── Geographic Breakdown ────────────────────────────────── */}
            {view === "geographic" && (
              <>
                <StatCards overview={overview} loading={loadingOverview} />
                <GeographicView countries={countries} />
              </>
            )}

            {/* ── Language Analysis ───────────────────────────────────── */}
            {view === "language" && (
              <LanguageView languages={languages} stats={summaryStats} />
            )}

            {/* ── Model Comparison ────────────────────────────────────── */}
            {view === "model" && (
              <ModelView models={models} />
            )}

          </main>
        </div>

        {/* Right panel */}
        <RightPanel selected={selectedConv} />
      </div>
    </div>
  );
}
