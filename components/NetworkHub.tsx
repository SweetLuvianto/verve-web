"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchNetwork, aggregateNetwork, type DirVenue, type NetworkView } from "@/lib/network";
import { venueHref } from "@/lib/games";
import { StatusBadge, FreshnessPill, type PillLevel } from "@/components/ui";

const POLL_MS = 75_000;

function levelOf(online: boolean, ageSec: number | null): PillLevel {
  if (!online || ageSec == null) return "stale";
  if (ageSec < 60) return "live";
  if (ageSec < 600) return "delayed";
  return "stale";
}

// Franchise hub: network status strip + totals + busiest branch + active events + branch directory.
// All public-aggregate-safe; reads owner registry + each branch's live snapshot.
export function NetworkHub({ baked }: { baked: DirVenue[] }) {
  const [view, setView] = useState<NetworkView>(() => aggregateNetwork(baked, {}, 0));
  const [source, setSource] = useState<"live" | "baked">("baked");

  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const res = await fetchNetwork(baked, Date.now());
    setView(res);
    setSource(res.source);
  }, [baked]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), POLL_MS);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const t = view.totals;
  const top = view.busiest[0];

  return (
    <>
      <h1 className="h1">Our Venues</h1>

      {/* Network status strip + totals today */}
      <section className="netstrip">
        <div className="stat">
          <div className="stat-v">
            {t.branchesOpen}<span className="stat-of">/{t.branchesTotal}</span>
          </div>
          <div className="stat-l">branches open now</div>
        </div>
        <div className="stat">
          <div className="stat-v">{t.guestsServedTotal}</div>
          <div className="stat-l">guests served today</div>
        </div>
        <div className="stat">
          <div className="stat-v">{t.branchesOnline}</div>
          <div className="stat-l">branches online</div>
        </div>
        <div className="stat">
          <div className="stat-v">{t.eventsLive}</div>
          <div className="stat-l">events live</div>
        </div>
      </section>

      <div className="hubcols">
        {/* Busiest branch right now */}
        <section className="card">
          <div className="card-title">Busiest right now</div>
          {top ? (
            <Link href={venueHref(top.gameId, top.id)} className="busiest">
              <div className="busiest-name">{top.name}</div>
              <div className="busiest-stat">
                <b>{top.guestsServed ?? 0}</b> served · score {top.shiftScore ?? 0}
              </div>
              {view.busiest.length > 1 ? (
                <div className="busiest-rest">
                  {view.busiest.slice(1, 4).map((r) => (
                    <div key={r.key} className="busiest-row">
                      <span>{r.name}</span>
                      <span>{r.guestsServed ?? 0} served</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Link>
          ) : (
            <p className="muted">No branches online right now.</p>
          )}
        </section>

        {/* Active events across the network */}
        <section className="card">
          <div className="card-title">What&apos;s on across the network</div>
          {view.events.length ? (
            view.events.map((e) => (
              <Link key={e.key} href={venueHref(e.gameId, e.id)} className="event-row">
                <span className="event-dot" aria-hidden />
                <span className="event-venue">{e.name}</span>
                <span className="event-title">{e.event}</span>
              </Link>
            ))
          ) : (
            <p className="muted">No live events right now.</p>
          )}
        </section>
      </div>

      {/* Branch directory */}
      <section className="hub">
        <h2 className="menu-title">Branches</h2>
        <div className="hub-grid">
          {view.rows.map((r) => {
            const level = levelOf(r.online, r.ageSec);
            return (
              <div key={r.key} className="venue-card">
                <div className="venue-card-top">
                  <div className="venue-card-name">{r.name}</div>
                  <StatusBadge state={r.status} />
                </div>
                <div className="venue-card-game">
                  {r.gameName}
                  {r.region ? ` · ${r.region}` : ""}
                </div>
                {r.hoursLabel ? <div className="venue-card-hours">{r.hoursLabel}</div> : null}
                {r.online ? (
                  <div className="venue-card-live">
                    {r.guestsServed ?? 0} served · score {r.shiftScore ?? 0}
                    {r.event ? ` · ${r.event}` : ""}
                  </div>
                ) : (
                  <div className="venue-card-live muted">offline</div>
                )}
                <div className="venue-card-foot">
                  <FreshnessPill level={level} ageSec={r.ageSec ?? 0} />
                  <div className="venue-card-actions">
                    <Link href={venueHref(r.gameId, r.id)} className="link-min">
                      Details →
                    </Link>
                    {r.slurl ? (
                      <a className="btn-min" href={r.slurl} target="_blank" rel="noopener noreferrer">
                        Teleport
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {source === "baked" ? (
          <p className="muted" style={{ marginTop: "0.6rem" }}>
            Live network data loading…
          </p>
        ) : null}
      </section>
    </>
  );
}
