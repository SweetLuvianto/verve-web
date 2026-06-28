// Franchise network rollup: read the owner-authored registry (branch directory) + each
// branch's live snapshot, and aggregate into the hub views (status strip, totals, busiest,
// events). PRIVACY: only public-aggregate fields are used — counts/score/status/event +
// owner-authored directory text. Active-order TIE-BREAK uses the COUNT only, never the rows.

import type { GameStatusState, Registry, VenueSnapshot } from "./snapshot";
import { freshnessLevel } from "./snapshot";
import { assertPublishable } from "./sanitize";
import { dataUrl } from "./fetch-snapshot";

export interface DirVenue {
  key: string; // `${gameId}/${id}`
  id: string;
  gameId: string;
  gameName: string;
  name: string;
  region?: string;
  slurl?: string;
  hoursLabel?: string;
  dataPath: string;
}

export interface VenueLiveRow extends DirVenue {
  status: GameStatusState;
  online: boolean;
  ageSec: number | null; // null if no snapshot
  guestsServed: number | null;
  shiftScore: number | null;
  activeOrders: number | null; // COUNT only
  event: string | null;
}

export interface NetworkView {
  rows: VenueLiveRow[];
  totals: {
    branchesTotal: number;
    branchesOpen: number;
    branchesOnline: number;
    guestsServedTotal: number;
    eventsLive: number;
  };
  busiest: VenueLiveRow[];
  events: { key: string; gameId: string; id: string; name: string; event: string; slurl?: string }[];
}

export function toDir(reg: Registry): DirVenue[] {
  return reg.games.flatMap((g) =>
    g.venues.map((v) => ({
      key: `${g.id}/${v.id}`,
      id: v.id,
      gameId: g.id,
      gameName: g.name,
      name: v.name,
      region: v.region,
      slurl: v.slurl,
      hoursLabel: v.hoursLabel,
      dataPath: v.dataPath,
    })),
  );
}

function metric(snap: VenueSnapshot, key: string): number | null {
  const m = (snap.metrics ?? []).find((x) => x.key === key);
  return m ? m.value : null;
}

// Pure aggregation — testable. snaps keyed by DirVenue.key; missing/failed = null.
export function aggregateNetwork(
  dir: DirVenue[],
  snaps: Record<string, VenueSnapshot | null>,
  nowMs: number,
): NetworkView {
  const rows: VenueLiveRow[] = dir.map((d) => {
    const s = snaps[d.key] ?? null;
    if (!s) {
      return { ...d, status: "unknown", online: false, ageSec: null, guestsServed: null, shiftScore: null, activeOrders: null, event: null };
    }
    const online = !!s.freshness?.heartbeat?.online;
    const ageSec = Math.max(0, Math.round((nowMs - Date.parse(s.freshness.generatedAt)) / 1000));
    const orders = s.panels?.find((p) => p.type === "orders.active.v1");
    const ev = s.panels?.find((p) => p.type === "event.summary.v1");
    return {
      ...d,
      status: s.status?.state ?? "unknown",
      online,
      ageSec,
      guestsServed: metric(s, "guestsServed"),
      shiftScore: metric(s, "shiftScore"),
      activeOrders: orders && "rows" in orders ? orders.rows.length : 0, // COUNT only
      event: ev && "eventTitle" in ev ? ev.eventTitle : null,
    };
  });

  const totals = {
    branchesTotal: rows.length,
    branchesOpen: rows.filter((r) => r.status === "open").length,
    branchesOnline: rows.filter((r) => r.online).length,
    guestsServedTotal: rows.reduce((a, r) => a + (r.guestsServed ?? 0), 0),
    eventsLive: rows.filter((r) => !!r.event).length,
  };

  const busiest = rows
    .filter((r) => r.online)
    .sort(
      (a, b) =>
        (b.guestsServed ?? -1) - (a.guestsServed ?? -1) ||
        (b.shiftScore ?? -1) - (a.shiftScore ?? -1) ||
        (b.activeOrders ?? -1) - (a.activeOrders ?? -1),
    );

  const events = rows
    .filter((r) => !!r.event)
    .map((r) => ({ key: r.key, gameId: r.gameId, id: r.id, name: r.name, event: r.event as string, slurl: r.slurl }));

  return { rows, totals, busiest, events };
}

export interface NetworkResult extends NetworkView {
  source: "live" | "baked";
}

// IO wrapper: fetch the registry + each snapshot (bucketed, shared-cache friendly), then aggregate.
// Falls back to the baked directory (with no live data) if the registry can't be fetched.
export async function fetchNetwork(baked: DirVenue[], nowMs: number): Promise<NetworkResult> {
  let dir = baked;
  let source: "live" | "baked" = "baked";
  try {
    const res = await fetch(dataUrl("registry.json", nowMs), { cache: "no-store" });
    if (res.ok) {
      const reg = (await res.json()) as Registry;
      const live = toDir(reg);
      if (live.length) {
        dir = live;
        source = "live";
      }
    }
  } catch {
    /* keep baked */
  }

  const entries = await Promise.all(
    dir.map(async (d) => {
      try {
        const r = await fetch(dataUrl(d.dataPath, nowMs), { cache: "no-store" });
        if (!r.ok) return [d.key, null] as const;
        const snap = (await r.json()) as VenueSnapshot;
        assertPublishable(snap); // defensive privacy re-check before we use it
        return [d.key, snap] as const;
      } catch {
        return [d.key, null] as const;
      }
    }),
  );
  const snaps: Record<string, VenueSnapshot | null> = {};
  for (const [k, v] of entries) snaps[k] = v;

  return { ...aggregateNetwork(dir, snaps, nowMs), source };
}

export { freshnessLevel };
