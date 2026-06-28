// Table & Tales HOVERTEXT parser.
// NOTE (per Codex consult): the in-world boards expose HOVERTEXT (pipe-split rows),
// NOT the signed-event protocol that verve/apps/web/src/relay.mjs parses. So this is a
// dedicated TT hovertext parser, grounded in the EXISTING push-bridge.ps1 format:
//   order board: skip first (header) line; each row = a|TABLE|b|ITEM|STATE (item underscores->spaces)
//   score board: lines "Event: X", "Shift Score: N", "Staff served: N", "Loyalty guests: N"
// The relay (M3) must re-validate this against the LIVE board text before publish.

import type { GameStatusState, Metric, OrderRow, Panel, VenueSnapshot } from "./snapshot";

export function parseOrderBoard(text: string): OrderRow[] {
  const lines = (text ?? "").split(/\r?\n/);
  const rows: OrderRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.includes("|")) continue;
    const p = line.split(/\s*\|\s*/);
    const table = (p[1] ?? "").trim();
    const dish = (p[3] ?? "").replace(/_/g, " ").trim();
    const state = (p[4] ?? "").trim();
    if (!table && !dish) continue;
    rows.push({ table, dish, state });
  }
  return rows;
}

export interface ScoreBoard {
  event?: string;
  metrics: Metric[];
}

const SCORE_KEYS: { key: string; label: string }[] = [
  { key: "shiftScore", label: "Shift Score" },
  { key: "guestsServed", label: "Staff served" },
  { key: "loyaltyGuests", label: "Loyalty guests" },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function toInt(s: string): number {
  const n = parseInt(String(s).replace(/[^0-9-]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

// Humanize id-like event values ("food_critic_visit" -> "Food Critic Visit").
// Leaves already-human strings (with spaces/caps) untouched.
export function humanizeEvent(s: string): string {
  if (/^[a-z0-9_]+$/.test(s)) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

export function parseScoreBoard(text: string): ScoreBoard {
  const lines = (text ?? "").split(/\r?\n/);
  const metrics: Metric[] = [];
  for (const k of SCORE_KEYS) {
    const re = new RegExp("^" + escapeRe(k.label) + "\\s*:\\s*(.+)$", "i");
    for (const l of lines) {
      const m = l.match(re);
      if (m) {
        metrics.push({ key: k.key, label: k.label, value: toInt(m[1]), format: "int" });
        break;
      }
    }
  }
  const evLine = lines.find((l) => /^Event\s*:/i.test(l));
  const event = evLine ? evLine.replace(/^Event\s*:\s*/i, "").trim() || undefined : undefined;
  return { event, metrics };
}

export interface BuildTtInput {
  venue: { id: string; name: string; slurl?: string; hoursLabel?: string };
  orderBoardText?: string;
  scoreBoardText?: string;
  rating?: { average: number; count: number };
  status?: GameStatusState;
  nowIso: string; // relay-stamped server time (NOT in-world time)
  sourceReadAtIso?: string;
  online?: boolean;
  ttlSeconds?: number;
}

// Builds a privacy-safe snapshot by ALLOWLIST construction: only known, public-safe
// fields are emitted (table label + dish + state, aggregate score metrics, event title).
// No guest/avatar identity is ever read here. assertPublishable() (sanitize.ts) is the
// secondary net run before publish.
export function buildTtSnapshot(input: BuildTtInput): VenueSnapshot {
  const orders = input.orderBoardText ? parseOrderBoard(input.orderBoardText) : [];
  const score = input.scoreBoardText ? parseScoreBoard(input.scoreBoardText) : { metrics: [] as Metric[] };

  const metrics: Metric[] = [...score.metrics];
  if (input.rating) {
    metrics.push({
      key: "rating",
      label: "Rating",
      value: input.rating.average,
      format: "rating5",
      count: input.rating.count,
    });
  }

  const panels: Panel[] = [{ type: "orders.active.v1", title: "Kitchen", rows: orders }];
  if (score.event) {
    panels.push({ type: "event.summary.v1", title: "Tonight", eventTitle: humanizeEvent(score.event) });
  }

  const online = input.online ?? true;
  return {
    envelopeVersion: 1,
    game: { id: "table-and-tales", name: "Table & Tales", kind: "venue", instanceId: input.venue.id },
    venue: {
      id: input.venue.id,
      name: input.venue.name,
      slurl: input.venue.slurl,
      hoursLabel: input.venue.hoursLabel,
    },
    status: { state: input.status ?? (online ? "open" : "unknown") },
    metrics,
    panels,
    freshness: {
      generatedAt: input.nowIso,
      sourceReadAt: input.sourceReadAtIso,
      ttlSeconds: input.ttlSeconds ?? 90,
      heartbeat: {
        online,
        lastOkAt: online ? input.nowIso : undefined,
        errorClass: online ? "none" : "bridge_unreachable",
      },
    },
  };
}
