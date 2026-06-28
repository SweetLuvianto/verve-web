import type { Metadata } from "next";
import Link from "next/link";
import { REGISTRY, venueHref } from "@/lib/games";
import { toDir } from "@/lib/network";
import { DATA_BASE } from "@/lib/fetch-snapshot";

export const metadata: Metadata = {
  title: "Embed VERVE live status",
  description: "Drop a self-updating live status badge for your VERVE venue into a profile, Discord, or in-world.",
};

const SITE = "https://verve-web-sepia.vercel.app";

export default function Embed() {
  const venues = toDir(REGISTRY);
  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="brand">
          VERVE
        </Link>
        <div className="tagline">Embed live status</div>
      </header>

      <section className="venue">
        <h1 className="h1">Embed a live badge</h1>
        <p className="hero-pulse">
          Paste a self-updating status badge anywhere — a website, blog, profile, or an in-world
          Media-on-a-Prim. It refreshes from the static CDN, so there is no server and no cost per view.
        </p>

        {venues.map((v) => {
          const badge = `${DATA_BASE}/badge/${v.id}.svg`;
          const data = `${DATA_BASE}/${v.dataPath}`;
          const snippet = `<a href="${SITE}${venueHref(v.gameId, v.id)}"><img src="${badge}" alt="${v.name} live status" width="360" height="84"></a>`;
          return (
            <div className="card" key={v.key}>
              <div className="card-title">{v.name}</div>
              <p className="trust-p">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={badge}
                  alt={`${v.name} live status`}
                  width={360}
                  height={84}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </p>
              <div className="menu-cat">HTML embed</div>
              <pre className="code">{snippet}</pre>
              <div className="menu-cat">In-world (Media-on-a-Prim URL)</div>
              <pre className="code">{badge}</pre>
              <div className="menu-cat">JSON API — same privacy-scrubbed data, public-safe</div>
              <pre className="code">{data}</pre>
            </div>
          );
        })}

        <div className="card">
          <div className="card-title">Good to know</div>
          <ul className="trust-list">
            <li>The badge shows only public aggregates (status, served count, vibe) — never guest data.</li>
            <li>It updates about every minute; a closed/offline venue shows a neutral CLOSED badge.</li>
            <li>The JSON file is the exact data the site renders — fair to build on.</li>
          </ul>
        </div>
      </section>

      <footer className="footer">VERVE · read-only</footer>
    </main>
  );
}
