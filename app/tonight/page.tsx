import type { Metadata } from "next";
import Link from "next/link";
import { TonightLive } from "@/components/TonightLive";
import { REGISTRY } from "@/lib/games";
import { toDir } from "@/lib/network";

export const metadata: Metadata = {
  title: "VERVE Tonight — what's on across the network",
  description: "Live events and the busiest VERVE venues in Second Life right now.",
};

export default function Tonight() {
  const baked = toDir(REGISTRY);
  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="brand">
          VERVE
        </Link>
        <div className="tagline">Tonight across the network</div>
      </header>
      <h1 className="h1">VERVE Tonight</h1>
      <TonightLive baked={baked} />
      <footer className="footer">VERVE · read-only live dashboard</footer>
    </main>
  );
}
