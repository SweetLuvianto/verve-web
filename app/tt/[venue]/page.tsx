import Link from "next/link";
import { notFound } from "next/navigation";
import { findGame, findVenue, safeExternalUrl } from "@/lib/games";
import { VenueLive } from "@/components/VenueLive";
import { MenuShowcase } from "@/components/ui";
import { TT_MENU } from "@/lib/menu";
import { SAMPLE_SNAPSHOT } from "@/lib/fixtures/tt-sample";

// Prerender one static page per registered TT venue.
export function generateStaticParams() {
  return (findGame("table-and-tales")?.venues ?? []).map((v) => ({ venue: v.id }));
}

// RSC shell: static venue identity + menu, with a small client polling island for live data.
export default async function VenuePage({ params }: { params: Promise<{ venue: string }> }) {
  const { venue } = await params;
  const v = findVenue("table-and-tales", venue);
  if (!v) notFound();

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="brand">
          VERVE
        </Link>
        <div className="tagline">{v.name}</div>
      </header>

      <section className="venue">
        <div className="venue-head">
          <h1 className="h1">{v.name}</h1>
          {v.hoursLabel ? <div className="hours">{v.hoursLabel}</div> : null}
          {safeExternalUrl(v.slurl) ? (
            <a className="btn" href={safeExternalUrl(v.slurl)} target="_blank" rel="noopener noreferrer">
              Teleport in Second Life
            </a>
          ) : null}
        </div>

        <VenueLive dataPath={v.dataPath} sample={SAMPLE_SNAPSHOT} musicLabel={v.musicLabel} />

        <MenuShowcase items={TT_MENU} />
      </section>

      <footer className="footer">VERVE · read-only · live data refreshes about every minute</footer>
    </main>
  );
}
