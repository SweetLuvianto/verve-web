// VERVE public snapshot contract (relay -> static file -> browser).
// UNIVERSAL CORE every game provides + TYPED PANELS for game-specific views + FRESHNESS.
// Additive within the same envelopeVersion; unknown panels are skipped, never fatal.

export type GameStatusState = "open" | "closed" | "maintenance" | "unknown";

export type MetricFormat = "int" | "rating5" | "raw";
export interface Metric {
  key: string;
  label: string;
  value: number;
  format?: MetricFormat;
  count?: number; // e.g. number of ratings behind an average
}

export interface OrderRow {
  table: string; // PUBLIC table label only (never a guest/party name)
  dish: string;
  state: string;
  ageSec?: number;
}

export interface PanelBase {
  type: string;
  title?: string;
}
export interface OrdersActivePanel extends PanelBase {
  type: "orders.active.v1";
  rows: OrderRow[];
}
export interface EventSummaryPanel extends PanelBase {
  type: "event.summary.v1";
  eventTitle: string;
  when?: string;
  description?: string;
  scoreGoal?: number;
}
export interface MenuItem {
  name: string;
  description?: string;
  price?: string; // in-world/RP currency framing, display-only
  category?: string;
}
export interface MenuShowcasePanel extends PanelBase {
  type: "menu.showcase.v1";
  items: MenuItem[];
}
export type Panel = OrdersActivePanel | EventSummaryPanel | MenuShowcasePanel;

export type HeartbeatErrorClass =
  | "none"
  | "bridge_unreachable"
  | "parse_failed"
  | "privacy_hold"
  | "stale_source";
export interface Heartbeat {
  online: boolean;
  lastOkAt?: string; // ISO; last successful read/build
  errorClass?: HeartbeatErrorClass;
}
export interface Freshness {
  generatedAt: string; // ISO, relay-stamped server time when the snapshot was built
  sourceReadAt?: string; // ISO, when the in-world source was read
  publishedAt?: string; // ISO, set at publish time if measurable
  ttlSeconds: number; // how long the data is considered fresh
  heartbeat: Heartbeat;
}

export interface VenueSnapshot {
  envelopeVersion: 1;
  game: { id: string; name: string; kind: "venue"; instanceId: string };
  venue: { id: string; name: string; slurl?: string; hoursLabel?: string };
  status: { state: GameStatusState; label?: string };
  occupancy?: {
    seated: number;
    capacity: number;
    tablesOccupied?: number;
    tablesTotal?: number;
    unitLabel?: string;
  };
  metrics?: Metric[];
  panels?: Panel[];
  freshness: Freshness;
}

// Registry = owner config listing games + venues (what the hub renders).
export interface RegistryVenue {
  id: string;
  name: string;
  gameId: string;
  slurl?: string;
  hoursLabel?: string;
  dataPath: string; // path under the data host, e.g. "tt/shelter.json"
}
export interface RegistryGame {
  id: string;
  name: string;
  venues: RegistryVenue[];
}
export interface Registry {
  schemaVersion: 1;
  games: RegistryGame[];
}

// Freshness helper the client island uses (computed against the client's own clock).
export type FreshnessLevel = "live" | "delayed" | "stale";
export function freshnessLevel(
  generatedAtIso: string,
  online: boolean,
  nowMs: number,
  liveMaxSec = 60,
  delayedMaxSec = 600,
): FreshnessLevel {
  if (!online) return "stale";
  const ageSec = (nowMs - Date.parse(generatedAtIso)) / 1000;
  if (!isFinite(ageSec) || ageSec > delayedMaxSec) return "stale";
  if (ageSec > liveMaxSec) return "delayed";
  return "live";
}
