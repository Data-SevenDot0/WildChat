import { useEffect, useState } from "react";
import type { ConversationPatternsData } from "../types";
import { fetchConversationPatterns } from "../api";
import { useTheme } from "../context/ThemeContext";

const MAX_TURNS_LABEL = 21;
const TURN_H = 120;
const HOUR_H = 100;
const DAY_H = 100;

export default function ConversationPatterns() {
  const { colors } = useTheme();
  const [data, setData] = useState<ConversationPatternsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversationPatterns()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-bg-hover rounded w-40 mb-4" />
            <div className="flex items-end gap-1" style={{ height: 100 }}>
              {Array.from({ length: 20 }).map((_, j) => (
                <div key={j} className="flex-1 bg-bg-hover rounded-t" style={{ height: 20 + (j % 5) * 15 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return <div className="text-text-secondary text-sm">Failed to load patterns.</div>;

  const { turn_distribution, hourly_distribution, weekday_distribution, conversation_flags } = data;

  const maxTurnCount = Math.max(...turn_distribution.map((d) => d.count), 1);
  const maxHourCount = Math.max(...hourly_distribution.map((d) => d.count), 1);
  const maxDayCount = Math.max(...weekday_distribution.map((d) => d.count), 1);
  const dayTotal = weekday_distribution.reduce((s, d) => s + d.count, 0) || 1;

  const hourMap = new Map(hourly_distribution.map((d) => [d.hour, d.count]));
  const allHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap.get(h) ?? 0 }));

  const c0 = colors.chart[0] ?? "#4ade80";
  const c1 = colors.chart[1] ?? "#60a5fa";
  const c2 = colors.chart[2] ?? "#f59e0b";
  const c4 = colors.chart[4] ?? "#a78bfa";

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="label mb-2">Total Conversations</div>
          <div className="text-2xl font-semibold text-text-primary">
            {conversation_flags.total.toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Redacted Rate</div>
          <div className="text-2xl font-semibold" style={{ color: c4 }}>
            {conversation_flags.redacted_pct}%
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {conversation_flags.redacted_count.toLocaleString()} conversations
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Clean Rate</div>
          <div className="text-2xl font-semibold" style={{ color: c0 }}>
            {(100 - conversation_flags.redacted_pct).toFixed(1)}%
          </div>
          <div className="text-xs text-text-secondary mt-1">not redacted</div>
        </div>
      </div>

      {/* Turn depth distribution */}
      <div className="card p-4">
        <div className="label mb-1">Turn Depth Distribution</div>
        <div className="text-xs text-text-secondary mb-4">
          Number of conversations by total turn count (20+ grouped)
        </div>
        <div className="flex items-end gap-0.5" style={{ height: TURN_H }}>
          {turn_distribution.map(({ turns, count }) => {
            const barH = Math.max(2, Math.round((count / maxTurnCount) * TURN_H));
            const label = turns === MAX_TURNS_LABEL ? "20+" : String(turns);
            return (
              <div
                key={turns}
                className="flex-1 rounded-t cursor-default"
                style={{
                  height: barH,
                  background: `linear-gradient(180deg, ${c0}, ${c0}99)`,
                }}
                title={`${label} turn${turns === 1 ? "" : "s"}: ${count.toLocaleString()} conversations`}
              />
            );
          })}
        </div>
        <div className="flex gap-0.5 mt-2">
          {turn_distribution.map(({ turns }) => {
            const label = turns === MAX_TURNS_LABEL ? "20+" : [1, 5, 10, 15, 20].includes(turns) ? String(turns) : "";
            return (
              <div key={turns} className="flex-1 text-center">
                <span className="text-text-secondary" style={{ fontSize: 9 }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly distribution */}
      <div className="card p-4">
        <div className="label mb-1">Hourly Activity (UTC)</div>
        <div className="text-xs text-text-secondary mb-4">
          When conversations are most frequent throughout the day
        </div>
        <div className="flex items-end gap-0.5" style={{ height: HOUR_H }}>
          {allHours.map(({ hour, count }) => {
            const barH = Math.max(2, Math.round((count / maxHourCount) * HOUR_H));
            const isPeak = count === maxHourCount;
            return (
              <div
                key={hour}
                className="flex-1 rounded-t cursor-default"
                style={{
                  height: barH,
                  background: isPeak ? c1 : `${c1}88`,
                }}
                title={`${hour.toString().padStart(2, "0")}:00 UTC — ${count.toLocaleString()} conversations`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-text-secondary">12 AM</span>
          <span className="text-xs text-text-secondary">6 AM</span>
          <span className="text-xs text-text-secondary">12 PM</span>
          <span className="text-xs text-text-secondary">6 PM</span>
          <span className="text-xs text-text-secondary">11 PM</span>
        </div>
      </div>

      {/* Day-of-week distribution */}
      <div className="card p-4">
        <div className="label mb-1">Day-of-Week Distribution</div>
        <div className="text-xs text-text-secondary mb-4">
          Which days see the most conversations
        </div>
        <div className="flex items-end gap-2" style={{ height: DAY_H }}>
          {weekday_distribution.map(({ day, count }) => {
            const barH = Math.max(4, Math.round((count / maxDayCount) * DAY_H));
            const isPeak = count === maxDayCount;
            return (
              <div
                key={day}
                className="flex-1 rounded-t cursor-default"
                style={{
                  height: barH,
                  background: isPeak ? c2 : `${c2}99`,
                }}
                title={`${day}: ${count.toLocaleString()} conversations`}
              />
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          {weekday_distribution.map(({ day, count }) => {
            const isPeak = count === maxDayCount;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-xs text-text-secondary">{day}</span>
                <span className="text-xs font-mono" style={{ fontSize: 10, color: isPeak ? c2 : colors.textSecondary }}>
                  {((count / dayTotal) * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
