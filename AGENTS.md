<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# VERVE Web Portal — project rules

**What this is:** a public, READ-ONLY, multi-game / multi-venue (franchise) dashboard that displays LIVE Table & Tales (and later other VERVE games) data from Second Life. Spec + roadmap: `D:\TableAndTales\VERVE_WEB_DESIGN_PROPOSAL.md` + `VERVE_WEB_BUILD_ROADMAP.md`.

**Governance (hard rules):**
- **Read-only public surface.** No POST/PUT/DELETE reachable from the web; no forms in MVP; no cloud write endpoint. Any future control = an owner-approved queue on the LOCAL machine, never from the browser.
- **Money is 100% human-gated + display-only.** Never pay/refund/redeem/transfer from the web.
- **Privacy:** never publish avatar legal/display names, UUIDs, per-guest rows, or party labels. Aggregates only by default; staff/guest names opt-in. The relay allowlist-serializes and REFUSES to publish on any name/UUID/token hit.
- **The DevBridge token never leaves the relay machine** and never appears in any client bundle or `NEXT_PUBLIC_` var.
- **Never use OneDrive paths.** This repo lives at `D:\dev\verve-web`.
- **Data flow:** in-world game → DevBridge (localhost) → local relay (reads + scrubs) → static JSON snapshot on a CDN → browser reads the static file. No per-request server/function/store in the visitor read path (that re-creates the Vercel-Blob cost blowup).

**Process:** heavy/architectural changes follow consult-first (`D:\dev\verve\docs\AI_CONSULT_FIRST_PROTOCOL.md`): Claude designs → consults Codex (read-only) → gates with independent evidence → human authorizes live deploy. Codex's green light = input, not authority.

**Language split:** all venue-/user-facing UI text = ENGLISH; owner↔Claude conversation = simple Indonesian.
