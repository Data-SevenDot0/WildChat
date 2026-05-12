import WildchatLogo from "./WildchatLogo";
import { useTheme } from "../context/ThemeContext";

type View = "overview" | "explorer" | "notes" | "geographic" | "language" | "model" | "etl" | "turns" | "matrix" | "continent" | "graph" | "tags" | "topic-freq" | "patterns";

interface Props {
  activeView: View;
  onSelect: (v: View) => void;
}

const NAV: { label: string; view: View }[] = [
  { label: "Overview",        view: "overview"   },
  { label: "Explorer",        view: "explorer"   },
  { label: "Notes",           view: "notes"      },
  { label: "Geographic",      view: "geographic" },
  { label: "Continents",      view: "continent"  },
  { label: "Languages",       view: "language"   },
  { label: "Models",          view: "model"      },
  { label: "Model × Topic",   view: "matrix"     },
  { label: "ETL Log",         view: "etl"        },
  { label: "Turn Depth",      view: "turns"      },
];

const TOOLS: { label: string; view: View }[] = [
  { label: "Topics",          view: "overview"   },
  { label: "Map",             view: "geographic" },
  { label: "Date Range",      view: "geographic" },
  { label: "Search",          view: "explorer"   },
  { label: "Graph Builder",   view: "graph"      },
  { label: "My Tags",         view: "tags"       },
  { label: "Topic Frequency", view: "topic-freq" },
  { label: "Patterns",        view: "patterns"   },
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
