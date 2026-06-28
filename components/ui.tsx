// Presentational components (pure, prop-driven). Safe in both server and client trees.
import type {
  GameStatusState,
  Metric as MetricT,
  MenuItem,
  OrderRow as OrderRowT,
} from "@/lib/snapshot";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      {children}
    </div>
  );
}

function formatMetric(m: MetricT): string {
  if (m.format === "rating5") return m.value.toFixed(1);
  if (m.format === "int") return Math.round(m.value).toLocaleString("en-US");
  return String(m.value);
}

export function Metric({ m }: { m: MetricT }) {
  return (
    <div className="metric">
      <span className="metric-label">{m.label}</span>
      <span className="metric-val">{formatMetric(m)}</span>
    </div>
  );
}

export function OrderRow({ table, dish, state, ageSec }: OrderRowT) {
  const age = typeof ageSec === "number" ? `${Math.max(0, Math.round(ageSec))}s` : state;
  return (
    <div className="order-row">
      <span className="order-table">{table}</span>
      <span className="order-dish">{dish}</span>
      <span className="order-state">{state || age}</span>
    </div>
  );
}

export function RatingStars({ average, count }: { average: number; count?: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(average)));
  const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
  return (
    <div className="rating">
      <span className="stars" aria-hidden>
        {stars}
      </span>
      <span className="rating-avg">{average.toFixed(1)}</span>
      {typeof count === "number" ? (
        <span className="rating-count">{count} reviews</span>
      ) : null}
    </div>
  );
}

export function EventBanner({
  eventTitle,
  when,
  description,
}: {
  eventTitle: string;
  when?: string;
  description?: string;
}) {
  return (
    <div>
      <div className="event-name">{eventTitle}</div>
      {when ? <span className="event-when">{when}</span> : null}
      {description ? <div className="event-desc">{description}</div> : null}
    </div>
  );
}

const STATUS_LABEL: Record<GameStatusState, string> = {
  open: "Open",
  closed: "Closed",
  maintenance: "Maintenance",
  unknown: "Unknown",
};
export function StatusBadge({ state }: { state: GameStatusState }) {
  return (
    <span className="badge">
      <span className={`dot dot-${state}`} aria-hidden />
      {STATUS_LABEL[state]}
    </span>
  );
}

export type PillLevel = "live" | "delayed" | "stale" | "sample";
function ageLabel(ageSec: number): string {
  if (ageSec < 90) return `${Math.max(0, Math.round(ageSec))}s ago`;
  const min = Math.round(ageSec / 60);
  if (min < 90) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}
export function FreshnessPill({ level, ageSec }: { level: PillLevel; ageSec: number }) {
  const text =
    level === "live"
      ? `Live · ${ageLabel(ageSec)}`
      : level === "delayed"
        ? `Delayed · ${ageLabel(ageSec)}`
        : level === "sample"
          ? "Sample data"
          : "Offline";
  return (
    <span className="badge" role="status">
      <span className={`dot dot-${level}`} aria-hidden />
      {text}
    </span>
  );
}

export function MenuShowcase({ items }: { items: MenuItem[] }) {
  const cats = Array.from(new Set(items.map((i) => i.category ?? "Menu")));
  return (
    <div className="menu">
      <h2 className="menu-title">Menu</h2>
      <div className="grid">
        {cats.map((cat) => (
          <div className="card" key={cat}>
            <div className="menu-cat">{cat}</div>
            {items
              .filter((i) => (i.category ?? "Menu") === cat)
              .map((i) => (
                <div className="menu-item" key={i.name}>
                  <div>
                    <div className="menu-item-name">{i.name}</div>
                    {i.description ? <div className="menu-item-desc">{i.description}</div> : null}
                  </div>
                  {i.price ? <div className="menu-item-price">{i.price}</div> : null}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
