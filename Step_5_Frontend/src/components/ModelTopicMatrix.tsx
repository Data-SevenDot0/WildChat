import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { ModelTopicMatrixItem } from "../types";

const TOPICS = [
  "Coding / tech",
  "Writing",
  "Research / info",
  "Math / science",
  "Translation",
  "Other",
];

const SHORT_TOPIC: Record<string, string> = {
  "Coding / tech": "Coding",
  "Writing": "Writing",
  "Research / info": "Research",
  "Math / science": "Math / Sci",
  "Translation": "Translation",
  "Other": "Other",
};

function shortModel(m: string): string {
  if (m.startsWith("gpt-4o-mini")) return "GPT-4o mini";
  if (m.startsWith("gpt-4o"))     return "GPT-4o";
  if (m.startsWith("gpt-4"))      return "GPT-4";
  if (m.startsWith("gpt-3.5"))    return "GPT-3.5";
  return m.length > 16 ? m.slice(0, 14) + "…" : m;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

interface TooltipState { x: number; y: number; content: string; }

interface Props {
  data: ModelTopicMatrixItem[];
  loading: boolean;
}

export default function ModelTopicMatrix({ data, loading }: Props) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<"row_pct" | "count">("row_pct");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const models = [...new Set(data.map(d => d.model))];
  const lookup = new Map(data.map(d => [`${d.model}||${d.topic}`, d]));
  const maxVal = mode === "row_pct"
    ? Math.max(...data.map(d => d.row_pct), 1)
    : Math.max(...data.map(d => d.count), 1);

  const [r, g, b] = hexToRgb(colors.accent);

  function cellBg(item: ModelTopicMatrixItem | undefined): string {
    if (!item) return "transparent";
    const val = mode === "row_pct" ? item.row_pct : item.count;
    const intensity = Math.pow(val / maxVal, 0.6);
    return `rgba(${r},${g},${b},${(0.08 + intensity * 0.82).toFixed(2)})`;
  }

  function cellLabel(item: ModelTopicMatrixItem | undefined): string {
    if (!item || item.count === 0) return "";
    return mode === "row_pct" ? `${item.row_pct}%` : item.count.toLocaleString();
  }

  if (loading) return (
    <div className="card p-4 flex items-center justify-center" style={{ minHeight: 200 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="card p-4 flex flex-col gap-3" style={{ position: "relative" }}>
      <div className="flex items-center justify-between">
        <div className="label">Model × Topic Matrix</div>
        <div className="flex gap-1">
          {(["row_pct", "count"] as const).map(m => (
            <button
              key={m}
              className={`filter-btn text-xs ${mode === m ? "active" : ""}`}
              style={{ padding: "2px 8px", fontSize: "0.7rem" }}
              onClick={() => setMode(m)}
            >
              {m === "row_pct" ? "% of model" : "count"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 110 }} />
            {TOPICS.map(t => <col key={t} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: "0.65rem", color: colors.textMuted, paddingBottom: 6, fontWeight: 500 }}>
                Model
              </th>
              {TOPICS.map(t => (
                <th key={t} style={{ fontSize: "0.65rem", color: colors.textMuted, paddingBottom: 6, fontWeight: 500, textAlign: "center" }}>
                  {SHORT_TOPIC[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model}>
                <td style={{ fontSize: "0.7rem", color: colors.textSecondary, paddingRight: 8, paddingTop: 3, paddingBottom: 3, whiteSpace: "nowrap" }}>
                  {shortModel(model)}
                </td>
                {TOPICS.map(topic => {
                  const item = lookup.get(`${model}||${topic}`);
                  return (
                    <td
                      key={topic}
                      style={{
                        background: cellBg(item),
                        textAlign: "center",
                        fontSize: "0.65rem",
                        color: colors.textPrimary,
                        padding: "4px 2px",
                        borderRadius: 3,
                        cursor: item && item.count > 0 ? "default" : "default",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => {
                        if (item) setTooltip({
                          x: e.clientX + 12,
                          y: e.clientY - 28,
                          content: `${shortModel(model)} — ${topic}: ${item.count.toLocaleString()} convs (${item.row_pct}% of model)`,
                        });
                      }}
                      onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX + 12, y: e.clientY - 28 } : null)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {cellLabel(item)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: "0.65rem", color: colors.textMuted }}>low</span>
        <div style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(90deg, rgba(${r},${g},${b},0.08), rgba(${r},${g},${b},0.9))`,
        }} />
        <span style={{ fontSize: "0.65rem", color: colors.textMuted }}>high</span>
      </div>

      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x, top: tooltip.y, zIndex: 9999,
          background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`,
          borderRadius: 4, padding: "4px 8px", fontSize: "0.7rem",
          color: colors.tooltipText, pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
