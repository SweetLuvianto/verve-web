import Link from "next/link";
import { REGISTRY } from "@/lib/games";

// Portfolio hub: lists every VERVE game + venue (only Table & Tales / Shelter for MVP).
export default function Home() {
  const venues = REGISTRY.games.flatMap((g) =>
    g.venues.map((v) => ({ gameId: g.id, gameName: g.name, venue: v })),
  );
  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">VERVE</div>
        <div className="tagline">Live venues · Second Life</div>
      </header>

      <section className="hub">
        <h1 className="h1">Our Venues</h1>
        <div className="hub-grid">
          {venues.map(({ gameId, gameName, venue }) => (
            <Link key={`${gameId}/${venue.id}`} href={`/${gameId}/${venue.id}`} className="venue-card">
              <div className="venue-card-name">{venue.name}</div>
              <div className="venue-card-game">{gameName}</div>
              <div className="venue-card-cta">View live status →</div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="footer">VERVE · read-only live dashboard</footer>
    </main>
  );
}
