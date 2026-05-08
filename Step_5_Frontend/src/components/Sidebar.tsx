import WildchatLogo from "./WildchatLogo";
import { useTheme } from "../context/ThemeContext";

type View = "overview" | "explorer" | "geographic" | "language" | "model" | "etl" | "turns";

interface Props {
  activeView: View;
  onSelect: (v: View) => void;
}

const NAV: { label: string; view: View }[] = [
  { label: "Overview", view: "overview" },
  { label: "Conversation explorer", view: "explorer" },
  { label: "Geographic breakdown", view: "geographic" },
  { label: "Language analysis", view: "language" },
  { label: "Model comparison", view: "model" },
  { label: "ETL run log", view: "etl" },
  { label: "Turn depth compare", view: "turns" },
];

const TOOLS: { label: string; view: View }[] = [
  { label: "Topic clustering",       view: "overview"   },
  { label: "Interactive map",        view: "geographic" },
  { label: "Time / date slider",     view: "geographic" },
  { label: "Search refinement",      view: "explorer"   },
];

export default function Sidebar({ activeView, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <aside
      style={{ width: 168, minWidth: 168 }}
      className="flex flex-col h-full bg-bg-panel border-r border-border-base overflow-y-auto flex-shrink-0"
    >
      {/* Logo */}
      <div className="px-3 py-4 border-b border-border-base flex flex-col items-start gap-1.5">
        <WildchatLogo size={36} wordmark={false} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.01em", color: colors.textPrimary }}>
            Wild<span style={{ color: colors.logoAccent, fontWeight: 400 }}>chat</span> Lens
          </div>
          <div style={{ fontSize: "0.7rem", color: colors.textSecondary, letterSpacing: "0.04em" }}>
            conversation analytics
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-2 pt-3 pb-1">
        <div className="label px-2 mb-2">Navigation</div>
        {NAV.map(({ label, view }) => (
          <button
            key={view}
            className={`sidebar-link w-full text-left ${activeView === view ? "active" : ""}`}
            onClick={() => onSelect(view)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tools */}
      <div className="px-2 pt-3 pb-4">
        <div className="label px-2 mb-2">Tools</div>
        {TOOLS.map(({ label, view }) => (
          <button
            key={label}
            className={`sidebar-link w-full text-left ${activeView === view ? "active" : ""}`}
            onClick={() => onSelect(view)}
            title={`Go to ${view} view`}
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}
