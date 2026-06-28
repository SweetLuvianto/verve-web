"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  VenueSnapshot,
  OrdersActivePanel,
  EventSummaryPanel,
} from "@/lib/snapshot";
import { freshnessLevel } from "@/lib/snapshot";
import { fetchSnapshot, type SnapshotSource } from "@/lib/fetch-snapshot";
import {
  Card,
  Metric,
  OrderRow,
  RatingStars,
  EventBanner,
  StatusBadge,
  FreshnessPill,
  type PillLevel,
} from "@/components/ui";

const POLL_MS = 75_000; // ~75s data poll
const TICK_MS = 10_000; // refresh the "x ago" age display

// The small CLIENT island: polls the static snapshot file and renders the live parts.
// No server code, no DevBridge — it only reads a public static file (or falls back to SAMPLE).
export function VenueLive({
  dataPath,
  sample,
  musicLabel,
}: {
  dataPath: string;
  sample: VenueSnapshot;
  musicLabel?: string;
}) {
  const [snap, setSnap] = useState<VenueSnapshot>(sample);
  const [source, setSource] = useState<SnapshotSource>("sample");
  const [nowMs, setNowMs] = useState<number>(() => Date.parse(sample.freshness.generatedAt) || 0);

  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return; // pause on hidden tab
    const search = typeof window !== "undefined" ? window.location.search : "";
    const res = await fetchSnapshot(dataPath, sample, Date.now(), search);
    setSnap(res.snapshot);
    setSource(res.source);
    setNowMs(Date.now());
  }, [dataPath, sample]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), POLL_MS);
    const tick = setInterval(() => {
      if (!document.hidden) setNowMs(Date.now());
    }, TICK_MS);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const online = snap.freshness.heartbeat.online && source !== "sample";
  const level: PillLevel =
    source === "sample" ? "sample" : freshnessLevel(snap.freshness.generatedAt, online, nowMs);
  const ageSec = Math.max(0, Math.round((nowMs - Date.parse(snap.freshness.generatedAt)) / 1000));

  const metrics = snap.metrics ?? [];
  const rating = metrics.find((m) => m.key === "rating");
  const liveMetrics = metrics.filter((m) => m.key !== "rating");
  const orders =
    (snap.panels?.find((p) => p.type === "orders.active.v1") as OrdersActivePanel | undefined)?.rows ??
    [];
  const event = snap.panels?.find((p) => p.type === "event.summary.v1") as
    | EventSummaryPanel
    | undefined;

  return (
    <>
      <div className="livebar">
        <StatusBadge state={snap.status.state} />
        <FreshnessPill level={level} ageSec={ageSec} />
      </div>
      {source !== "sample" && [snap.ambiance?.phase, snap.busy, musicLabel].filter(Boolean).length ? (
        <div className="venue-vibe">{[snap.ambiance?.phase, snap.busy, musicLabel].filter(Boolean).join(" · ")}</div>
      ) : null}

      <div className="grid">
        <Card title="Live Now">
          {liveMetrics.length ? (
            liveMetrics.map((m) => <Metric key={m.key} m={m} />)
          ) : (
            <p className="muted">No live metrics yet.</p>
          )}
        </Card>

        <Card title="Kitchen">
          {orders.length ? (
            orders.map((r, i) => <OrderRow key={`${r.table}-${i}`} {...r} />)
          ) : (
            <p className="muted">No active orders.</p>
          )}
        </Card>

        <Card title="Tonight & Rating">
          {event ? <EventBanner {...event} /> : <p className="muted">No event right now.</p>}
          {rating ? <RatingStars average={rating.value} count={rating.count} /> : null}
        </Card>
      </div>
    </>
  );
}
