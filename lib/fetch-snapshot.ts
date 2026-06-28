// Client-side snapshot fetch with the proven 3-tier fallback:
//   1) live static file on the data host (coarse time-bucket cache-buster -> shared CDN cache)
//   2) ?d=base64(json) inline escape hatch (debug/share, mirrors the board pattern)
//   3) baked SAMPLE (so the page always renders something honest)
// No DevBridge access, no server function — the browser fetches a static file directly.

import type { VenueSnapshot } from "./snapshot";
import { assertPublishable } from "./sanitize";

export type SnapshotSource = "live" | "inline" | "sample";
export interface SnapshotResult {
  snapshot: VenueSnapshot;
  source: SnapshotSource;
}

// Data host base, e.g. https://sweetluvianto.github.io/verve-web-data (set at build via env).
// Empty in MVP/dev -> the live tier is skipped and we fall back to SAMPLE.
const DATA_BASE = (process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "").replace(/\/$/, "");

export function dataUrl(dataPath: string, nowMs: number): string {
  // 60s bucket: every visitor in the same minute hits the SAME url -> shared edge cache
  // (the file is served with max-age=600, so this is how we still see ~minute-fresh data).
  const bucket = Math.floor(nowMs / 60000);
  const sep = dataPath.includes("?") ? "&" : "?";
  return `${DATA_BASE}/${dataPath.replace(/^\//, "")}${sep}t=${bucket}`;
}

export function readInlineSnapshot(search: string): VenueSnapshot | null {
  const m = search.match(/[?&]d=([^&]+)/);
  if (!m) return null;
  try {
    return JSON.parse(atob(decodeURIComponent(m[1]))) as VenueSnapshot;
  } catch {
    return null;
  }
}

export async function fetchSnapshot(
  dataPath: string,
  sample: VenueSnapshot,
  nowMs: number,
  search = "",
): Promise<SnapshotResult> {
  // tier 2 first if explicitly provided (lets you share/debug a frozen snapshot)
  const inline = readInlineSnapshot(search);
  if (inline) {
    try {
      assertPublishable(inline);
      return { snapshot: inline, source: "inline" };
    } catch {
      /* fall through */
    }
  }
  // tier 1: live static file
  if (DATA_BASE) {
    try {
      const res = await fetch(dataUrl(dataPath, nowMs), { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as VenueSnapshot;
        assertPublishable(data); // defensive client-side privacy re-check
        return { snapshot: data, source: "live" };
      }
    } catch {
      /* fall through */
    }
  }
  // tier 3: baked sample
  return { snapshot: sample, source: "sample" };
}
