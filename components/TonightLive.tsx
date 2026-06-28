"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchNetwork, aggregateNetwork, type DirVenue, type NetworkView } from "@/lib/network";
import { venueHref, safeExternalUrl } from "@/lib/games";

// Focused "what's on across the network" island (events + busiest), reuses the network rollup.
export function TonightLive({ baked }: { baked: DirVenue[] }) {
  const [view, setView] = useState<NetworkView>(() => aggregateNetwork(baked, {}, 0));
  const hasLive = useRef(false);

  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const res = await fetchNetwork(baked, Date.now());
    if (res.source === "live" || !hasLive.current) setView(res);
    if (res.source === "live") hasLive.current = true;
  }, [baked]);

  useEffect(() => {
    void load();
    const p = setInterval(() => void load(), 75_000);
    const o = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", o);
    return () => {
      clearInterval(p);
      document.removeEventListener("visibilitychange", o);
    };
  }, [load]);

  return (
    <section className="hubcols">
      <div className="card">
        <div className="card-title">Events on right now</div>
        {view.events.length ? (
          view.events.map((e) => {
            const tp = safeExternalUrl(view.rows.find((r) => r.key === e.key)?.slurl);
            return (
              <div key={e.key} className="event-row">
                <span className="event-dot" aria-hidden />
                <span className="event-venue">{e.name}</span>
                <span className="event-title">{e.event}</span>
                {tp ? (
                  <a className="btn-min" href={tp} target="_blank" rel="noopener noreferrer">
                    Teleport
                  </a>
                ) : (
                  <Link className="link-min" href={venueHref(e.gameId, e.id)}>
                    Details →
                  </Link>
                )}
              </div>
            );
          })
        ) : (
          <p className="muted">No live events across the network right now.</p>
        )}
      </div>

      <div className="card">
        <div className="card-title">Busiest branches now</div>
        {view.busiest.length ? (
          view.busiest.slice(0, 6).map((r) => (
            <div key={r.key} className="busiest-row">
              <Link href={venueHref(r.gameId, r.id)}>{r.name}</Link>
              <span>{r.guestsServed ?? 0} served</span>
            </div>
          ))
        ) : (
          <p className="muted">No branches online right now.</p>
        )}
      </div>
    </section>
  );
}
