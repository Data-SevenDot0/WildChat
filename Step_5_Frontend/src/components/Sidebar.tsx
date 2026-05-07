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
  { label: "ETL run log",            view: "etl"        },
  { label: "Topic clustering",       view: "overview"   },
  { label: "Summary statistics",     view: "overview"   },
  { label: "Interactive map",        view: "geographic" },
  { label: "Turn depth compare",     view: "turns"      },
  { label: "Search refinement",      view: "explorer"   },
  { label: "Filters & combinations", view: "explorer"   },
  { label: "Conversation preview",   view: "explorer"   },
  { label: "Conversation flow",      view: "explorer"   },
  { label: "Annotation tool",        view: "explorer"   },
  { label: "Saved filter presets",   view: "explorer"   },
  { label: "User tracking history",  view: "explorer"   },
  { label: "Session history",        view: "explorer"   },
  { label: "Time / date slider",     view: "geographic" },
];

export default function Sidebar({ activeView, onSelect }: Props) {
  return (
    <aside
      style={{ width: 168, minWidth: 168 }}
      className="flex flex-col h-full bg-bg-panel border-r border-border-base overflow-y-auto flex-shrink-0"
    >
      {/* Logo */}
      <div className="px-3 py-3 border-b border-border-base">
        <div className="flex items-center gap-2">
          <span className="text-accent-green font-semibold text-sm" style={{ letterSpacing: "0.01em" }}>
            Wildchat Lens
          </span>
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
