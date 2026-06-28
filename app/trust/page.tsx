import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & Trust — VERVE",
  description: "What the VERVE portal shows, what it never shows, and how that is enforced.",
};

export default function Trust() {
  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="brand">
          VERVE
        </Link>
        <div className="tagline">Privacy &amp; Trust</div>
      </header>

      <section className="venue">
        <h1 className="h1">What we show — and what we never show</h1>
        <p className="hero-pulse">
          Every VERVE page is read-only. It displays live venue status and aggregate counts pushed
          from in-world — never anything that could identify a guest.
        </p>

        <div className="hubcols">
          <div className="card">
            <div className="card-title">We show</div>
            <ul className="trust-list">
              <li>Whether a branch is open, and how fresh the data is.</li>
              <li>Aggregate counts: guests served, loyalty guests, shift score, ratings average.</li>
              <li>Live orders as table + dish + status only — no guest names.</li>
              <li>The current event, the menu, and owner-written venue info.</li>
              <li>Staff as a role (or by name only if that staff member opts in).</li>
            </ul>
          </div>
          <div className="card">
            <div className="card-title">We never show</div>
            <ul className="trust-list">
              <li>Any guest name, username, or avatar key.</li>
              <li>Who is sitting at a table, or who ordered what.</li>
              <li>Individual reviews or who wrote them.</li>
              <li>Any money/L$ action — the site can never pay, tip, book, or redeem.</li>
              <li>Anything that could re-identify one person from a small count.</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-title">How it&apos;s enforced</div>
          <p className="trust-p">
            The data is prepared by a small program on the owner&apos;s own computer (the
            &quot;relay&quot;). It builds each update from an <b>allow-list</b> of safe fields and runs a
            scan that <b>refuses to publish</b> if any name, avatar key, or secret appears (a
            &quot;privacy hold&quot;). The website then re-checks the same thing again before showing
            anything. The <b>&quot;verified clean&quot;</b> badge on the home page is that check, live.
          </p>
          <p className="trust-p">
            Nothing on the site can change the game: there are no forms, no buttons, and no way to
            send money or commands. Control stays in-world, gated by a human.
          </p>
        </div>
      </section>

      <footer className="footer">VERVE · read-only · privacy by design</footer>
    </main>
  );
}
