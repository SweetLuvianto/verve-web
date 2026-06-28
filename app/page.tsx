import { NetworkHub } from "@/components/NetworkHub";
import { REGISTRY } from "@/lib/games";
import { toDir } from "@/lib/network";

// Franchise hub: network status + busiest branch + active events + branch directory.
export default function Home() {
  const baked = toDir(REGISTRY);
  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">VERVE</div>
        <div className="tagline">Live venues · Second Life</div>
      </header>

      <NetworkHub baked={baked} />

      <footer className="footer">VERVE · read-only live dashboard</footer>
    </main>
  );
}
