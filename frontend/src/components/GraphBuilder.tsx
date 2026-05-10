// ── Fix 4: User-created custom graphs ────────────────────────────────────────
// Renders a graph builder UI using the existing Recharts library.
// Graphs can be named and saved to localStorage.

import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ModelItem, LanguageItem, CountryItem, SavedGraph, GraphDataPoint } from "../types";
import { fetchGraphBuilderData } from "../api";
import { useTheme } from "../context/ThemeContext";

const SAVED_KEY = "wc_saved_graphs";

const X_OPTIONS: { value: SavedGraph["xAxis"]; label: string }[] = [
  { value: "model",      label: "Model" },
  { value: "language",   label: "Language" },
  { value: "country",    label: "Country" },
  { value: "turn_depth", label: "Turn Depth (by model)" },
];

const Y_OPTIONS: { value: SavedGraph["yAxis"]; label: string }[] = [
  { value: "conversation_count", label: "Conversation Count" },
  { value: "avg_turn_depth",     label: "Avg Turn Depth" },
];

const CHART_TYPES: { value: SavedGraph["chartType"]; label: string }[] = [
  { value: "bar",     label: "Bar" },
  { value: "line",    label: "Line" },
  { value: "scatter", label: "Scatter" },
];

const MONTH_OPTIONS = (() => {
  const months: { value: string; label: string }[] = [];
  let d = new Date(2023, 3, 1);
  const end = new Date(2024, 3, 1);
  while (d <= end) {
    months.push({ value: d.toISOString().slice(0, 7) + "-01", label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return months;
})();

interface Props {
  models: ModelItem[];
  languages: LanguageItem[];
  countries: CountryItem[];
  onGraphSaved: (name: string) => void;
}

export default function GraphBuilder({ models, languages, countries, onGraphSaved }: Props) {
  const { colors } = useTheme();

  // Builder controls
  const [xAxis, setXAxis] = useState<SavedGraph["xAxis"]>("model");
  const [yAxis, setYAxis] = useState<SavedGraph["yAxis"]>("conversation_count");
  const [chartType, setChartType] = useState<SavedGraph["chartType"]>("bar");
  const [filterModel, setFilterModel] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Chart data
  const [chartData, setChartData] = useState<GraphDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  // Save controls
  const [graphName, setGraphName] = useState("");
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); }
    catch { return []; }
  });
  const [saveMsg, setSaveMsg] = useState("");

  async function handleGenerate(overrides?: {
    xAxis?: SavedGraph["xAxis"];
    yAxis?: SavedGraph["yAxis"];
    filterModel?: string;
    filterLanguage?: string;
    filterCountry?: string;
    filterDateFrom?: string;
    filterDateTo?: string;
  }) {
    const x = overrides?.xAxis ?? xAxis;
    const y = overrides?.yAxis ?? yAxis;
    const model = overrides?.filterModel ?? filterModel;
    const language = overrides?.filterLanguage ?? filterLanguage;
    const country = overrides?.filterCountry ?? filterCountry;
    const dateFrom = overrides?.filterDateFrom ?? filterDateFrom;
    const dateTo = overrides?.filterDateTo ?? filterDateTo;

    setLoading(true);
    setError("");
    setGenerated(false);
    try {
      const data = await fetchGraphBuilderData({
        x_axis: x === "turn_depth" ? "model" : x,
        y_axis: y,
        model: model || undefined,
        language: language || undefined,
        country: country || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setChartData(data);
      setGenerated(true);
    } catch {
      setError("Failed to fetch chart data. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!graphName.trim()) { setSaveMsg("Enter a graph name first."); return; }
    const graph: SavedGraph = {
      id: `graph-${Date.now()}`,
      name: graphName.trim(),
      xAxis,
      yAxis,
      chartType,
      filters: { model: filterModel, language: filterLanguage, country: filterCountry, dateFrom: filterDateFrom, dateTo: filterDateTo },
      createdAt: new Date().toISOString(),
    };
    setSavedGraphs(prev => {
      const next = [graph, ...prev];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
    onGraphSaved(graphName.trim());
    setSaveMsg(`Saved "${graphName.trim()}"`);
    setGraphName("");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  function handleDeleteSaved(id: string) {
    setSavedGraphs(prev => {
      const next = prev.filter(g => g.id !== id);
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleLoadSaved(g: SavedGraph) {
    setXAxis(g.xAxis);
    setYAxis(g.yAxis);
    setChartType(g.chartType);
    setFilterModel(g.filters.model);
    setFilterLanguage(g.filters.language);
    setFilterCountry(g.filters.country);
    setFilterDateFrom(g.filters.dateFrom);
    setFilterDateTo(g.filters.dateTo);
    // State updates are async — pass values directly so the fetch uses the correct params
    handleGenerate({
      xAxis: g.xAxis,
      yAxis: g.yAxis,
      filterModel: g.filters.model,
      filterLanguage: g.filters.language,
      filterCountry: g.filters.country,
      filterDateFrom: g.filters.dateFrom,
      filterDateTo: g.filters.dateTo,
    });
  }

  const dataKey = yAxis === "conversation_count" ? "conversation_count" : "avg_turn_depth";
  const yLabel = Y_OPTIONS.find(o => o.value === yAxis)?.label ?? "";

  // Limit displayed bars for readability
  const displayData = chartData.slice(0, 15);

  function renderChart() {
    const commonProps = {
      data: displayData,
      margin: { top: 8, right: 16, left: 0, bottom: 40 },
    };
    const xAxisProps = {
      dataKey: "dimension",
      tick: { fontSize: 9, fill: colors.textSecondary },
      angle: -35,
      textAnchor: "end" as const,
      interval: 0,
    };
    const yAxisProps = { tick: { fontSize: 9, fill: colors.textSecondary }, width: 50 };
    const tooltipStyle = {
      contentStyle: { background: colors.bgCard, border: `1px solid ${colors.borderBase}`, borderRadius: 4, fontSize: 11 },
      labelStyle: { color: colors.textPrimary },
      itemStyle: { color: colors.accent },
    };

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderBase} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toLocaleString(), yLabel]} />
          <Line type="monotone" dataKey={dataKey} stroke={colors.accent} strokeWidth={2} dot={{ fill: colors.accent, r: 3 }} />
        </LineChart>
      );
    }

    if (chartType === "scatter") {
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderBase} />
          <XAxis dataKey="conversation_count" name="Conversations" tick={{ fontSize: 9, fill: colors.textSecondary }} />
          <YAxis dataKey="avg_turn_depth" name="Avg Turns" {...yAxisProps} />
          <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload as GraphDataPoint;
            return (
              <div style={{ background: colors.bgCard, border: `1px solid ${colors.borderBase}`, padding: "6px 10px", borderRadius: 4, fontSize: 11 }}>
                <div style={{ color: colors.accent, fontWeight: 600 }}>{d.dimension}</div>
                <div style={{ color: colors.textSecondary }}>Conversations: {d.conversation_count.toLocaleString()}</div>
                <div style={{ color: colors.textSecondary }}>Avg Turns: {d.avg_turn_depth}</div>
              </div>
            );
          }} />
          <Scatter data={displayData} fill={colors.accent} />
        </ScatterChart>
      );
    }

    // Default: bar
    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.borderBase} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toLocaleString(), yLabel]} />
        <Bar dataKey={dataKey} fill={colors.accent} radius={[2, 2, 0, 0]} />
      </BarChart>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: "300px 1fr" }}>

        {/* Builder controls */}
        <div className="card p-4 flex flex-col gap-4">
          <div className="label">Graph Builder</div>

          {/* X Axis */}
          <div>
            <div className="text-xs text-text-secondary mb-1">X Axis</div>
            <div className="flex flex-col gap-1">
              {X_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`filter-btn text-xs text-left ${xAxis === o.value ? "active" : ""}`}
                  style={{ justifyContent: "flex-start", padding: "4px 10px" }}
                  onClick={() => { setXAxis(o.value); setGenerated(false); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Y Axis */}
          <div>
            <div className="text-xs text-text-secondary mb-1">Y Axis</div>
            <div className="flex flex-col gap-1">
              {Y_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`filter-btn text-xs text-left ${yAxis === o.value ? "active" : ""}`}
                  style={{ justifyContent: "flex-start", padding: "4px 10px" }}
                  onClick={() => { setYAxis(o.value); setGenerated(false); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart type */}
          <div>
            <div className="text-xs text-text-secondary mb-1">Chart Type</div>
            <div className="flex gap-1">
              {CHART_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`filter-btn text-xs flex-1 ${chartType === t.value ? "active" : ""}`}
                  style={{ justifyContent: "center", padding: "4px 6px" }}
                  onClick={() => setChartType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="text-xs text-text-secondary mb-1">Filter Data</div>
            <div className="flex flex-col gap-1.5">
              <select
                className="filter-btn text-xs"
                value={filterModel}
                onChange={e => { setFilterModel(e.target.value); setGenerated(false); }}
                style={{ padding: "3px 6px" }}
              >
                <option value="">All models</option>
                {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
              </select>
              <select
                className="filter-btn text-xs"
                value={filterLanguage}
                onChange={e => { setFilterLanguage(e.target.value); setGenerated(false); }}
                style={{ padding: "3px 6px" }}
              >
                <option value="">All languages</option>
                {languages.slice(0, 30).map(l => <option key={l.language} value={l.language}>{l.language}</option>)}
              </select>
              <select
                className="filter-btn text-xs"
                value={filterCountry}
                onChange={e => { setFilterCountry(e.target.value); setGenerated(false); }}
                style={{ padding: "3px 6px" }}
              >
                <option value="">All countries</option>
                {countries.slice(0, 50).map(c => <option key={c.country} value={c.country}>{c.country}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <select
                  className="filter-btn text-xs flex-1"
                  value={filterDateFrom}
                  onChange={e => { setFilterDateFrom(e.target.value); setGenerated(false); }}
                  style={{ padding: "3px 6px" }}
                >
                  <option value="">From any</option>
                  {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select
                  className="filter-btn text-xs flex-1"
                  value={filterDateTo}
                  onChange={e => { setFilterDateTo(e.target.value); setGenerated(false); }}
                  style={{ padding: "3px 6px" }}
                >
                  <option value="">To any</option>
                  {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            className="filter-btn active text-xs"
            style={{ justifyContent: "center", padding: "6px" }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          {error && <div className="text-xs" style={{ color: "#ef4444" }}>{error}</div>}
        </div>

        {/* Chart area */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="label">
              {generated
                ? `${X_OPTIONS.find(o => o.value === xAxis)?.label} × ${yLabel}`
                : "Configure and generate a chart"}
            </div>
            {generated && (
              <div className="flex items-center gap-2">
                <input
                  className="bg-transparent text-text-primary text-xs outline-none border-b border-border-subtle placeholder-text-muted px-1"
                  placeholder="Graph name…"
                  value={graphName}
                  onChange={e => setGraphName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                  style={{ width: 140 }}
                />
                <button
                  className="filter-btn text-xs"
                  style={{ padding: "3px 10px" }}
                  onClick={handleSave}
                >
                  Save Graph
                </button>
                {saveMsg && <span className="text-xs text-text-muted">{saveMsg}</span>}
              </div>
            )}
          </div>

          {!generated && !loading && (
            <div className="flex items-center justify-center flex-1 text-text-muted text-xs" style={{ minHeight: 300 }}>
              Select axes and click Generate to build a chart.
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center flex-1 gap-2" style={{ minHeight: 300 }}>
              <div className="spinner" />
              <span className="text-text-secondary text-xs">Fetching data…</span>
            </div>
          )}

          {generated && !loading && chartData.length > 0 && (
            <div style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          )}

          {generated && !loading && chartData.length === 0 && (
            <div className="text-xs text-text-muted text-center py-12">No data returned for these filters.</div>
          )}
        </div>
      </div>

      {/* Saved Graphs */}
      <div className="card p-4">
        <div className="label mb-3">Saved Graphs ({savedGraphs.length})</div>
        {savedGraphs.length === 0 ? (
          <div className="text-xs text-text-muted">No saved graphs. Generate a chart and save it above.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {savedGraphs.map(g => (
              <div
                key={g.id}
                className="flex items-center justify-between py-2 px-3 rounded group"
                style={{ background: colors.bgHover, border: `1px solid ${colors.borderBase}` }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: colors.textPrimary }}>{g.name}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>
                    {X_OPTIONS.find(o => o.value === g.xAxis)?.label} × {Y_OPTIONS.find(o => o.value === g.yAxis)?.label} · {g.chartType} · {new Date(g.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    className="filter-btn text-xs"
                    style={{ padding: "2px 8px" }}
                    onClick={() => handleLoadSaved(g)}
                  >
                    Load
                  </button>
                  <button
                    className="text-text-muted hover:text-text-primary text-xs"
                    onClick={() => handleDeleteSaved(g.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
