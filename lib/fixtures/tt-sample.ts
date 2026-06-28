// Sample TT board hovertext + a sample snapshot, used by the selftest and as the
// client SAMPLE fallback (3-tier: live static file -> ?d=base64 -> baked SAMPLE).
// Column layout matches push-bridge.ps1: a | TABLE | b | ITEM | STATE  (header line skipped).

import { buildTtSnapshot } from "../tt-hovertext";
import type { VenueSnapshot } from "../snapshot";

export const SAMPLE_ORDER_BOARD = [
  "Active Orders",
  "1 | The Velvet Table | grill | pasta_cream | WAITING",
  "2 | The Hearth Table | bar | wine_red | COOKING",
  "3 | The Garden Table | prep | salad_caesar | READY",
].join("\n");

export const SAMPLE_SCORE_BOARD = [
  "Event: Live Jazz Night",
  "Shift Score: 1840",
  "Staff served: 37",
  "Loyalty guests: 4",
].join("\n");

export const SAMPLE_SNAPSHOT: VenueSnapshot = buildTtSnapshot({
  venue: { id: "shelter", name: "Table & Tales — Shelter", hoursLabel: "8 PM – Late" },
  orderBoardText: SAMPLE_ORDER_BOARD,
  scoreBoardText: SAMPLE_SCORE_BOARD,
  rating: { average: 4.8, count: 126 },
  status: "open",
  nowIso: "2026-06-28T19:04:11Z",
  online: true,
});
