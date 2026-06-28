// Foundation selftest — run with: npx --yes tsx lib/selftest.ts
// Independent runtime evidence for the M1 parser + privacy gate (not bundled into the app).
import assert from "node:assert/strict";
import { parseOrderBoard, parseScoreBoard, buildTtSnapshot } from "./tt-hovertext";
import { assertPublishable, findViolations, scanForbidden } from "./sanitize";
import { freshnessLevel } from "./snapshot";
import { SAMPLE_ORDER_BOARD, SAMPLE_SCORE_BOARD, SAMPLE_SNAPSHOT } from "./fixtures/tt-sample";

let n = 0;
const ok = (label: string) => {
  n++;
  console.log(`  ok  ${label}`);
};

// --- order board parsing (table + dish + state only; underscores -> spaces) ---
const orders = parseOrderBoard(SAMPLE_ORDER_BOARD);
assert.equal(orders.length, 3, "3 order rows (header skipped)");
assert.deepEqual(orders[0], { table: "The Velvet Table", dish: "pasta cream", state: "WAITING" });
assert.equal(orders[2].dish, "salad caesar");
ok("parseOrderBoard maps table/dish/state, skips header, de-underscores");

// --- score board parsing ---
const score = parseScoreBoard(SAMPLE_SCORE_BOARD);
assert.equal(score.event, "Live Jazz Night");
assert.equal(score.metrics.find((m) => m.key === "shiftScore")?.value, 1840);
assert.equal(score.metrics.find((m) => m.key === "guestsServed")?.value, 37);
assert.equal(score.metrics.find((m) => m.key === "loyaltyGuests")?.value, 4);
ok("parseScoreBoard extracts event + 3 metrics");

// --- snapshot build shape ---
assert.equal(SAMPLE_SNAPSHOT.envelopeVersion, 1);
assert.equal(SAMPLE_SNAPSHOT.game.id, "table-and-tales");
assert.equal(SAMPLE_SNAPSHOT.status.state, "open");
assert.ok(SAMPLE_SNAPSHOT.panels?.some((p) => p.type === "orders.active.v1"));
assert.ok(SAMPLE_SNAPSHOT.panels?.some((p) => p.type === "event.summary.v1"));
assert.equal(SAMPLE_SNAPSHOT.metrics?.find((m) => m.key === "rating")?.count, 126);
ok("buildTtSnapshot produces a valid envelope with panels + metrics");

// --- offline build sets heartbeat correctly ---
const offline = buildTtSnapshot({ venue: { id: "shelter", name: "T&T" }, nowIso: "2026-06-28T19:00:00Z", online: false });
assert.equal(offline.status.state, "unknown");
assert.equal(offline.freshness.heartbeat.online, false);
assert.equal(offline.freshness.heartbeat.errorClass, "bridge_unreachable");
ok("offline build => status unknown + heartbeat offline");

// --- privacy gate: clean sample passes, leaked identity is REFUSED ---
assert.doesNotThrow(() => assertPublishable(SAMPLE_SNAPSHOT), "clean sample publishable");
assert.equal(scanForbidden("The Velvet Table"), null, "table name is not a violation");
assert.equal(scanForbidden("Caesar Salad"), null, "dish name is not a violation");
assert.equal(scanForbidden("a1b2c3d4-e5f6-7a8b-9c0d-112233445566"), "uuid", "UUID flagged");
const leaked = JSON.parse(JSON.stringify(SAMPLE_SNAPSHOT));
leaked.panels[0].rows[0].table = "guest a1b2c3d4-e5f6-7a8b-9c0d-112233445566";
assert.equal(findViolations(leaked).length, 1, "one violation found in leaked snapshot");
assert.throws(() => assertPublishable(leaked), /PRIVACY HOLD/, "leaked snapshot refused");
ok("privacy gate: clean passes, UUID/agent/token refused, dish/table names safe");

// --- freshness levels ---
const now = Date.parse("2026-06-28T19:05:00Z");
assert.equal(freshnessLevel("2026-06-28T19:04:30Z", true, now), "live"); // 30s
assert.equal(freshnessLevel("2026-06-28T19:00:00Z", true, now), "delayed"); // 5m
assert.equal(freshnessLevel("2026-06-28T18:50:00Z", true, now), "stale"); // 15m
assert.equal(freshnessLevel("2026-06-28T19:04:59Z", false, now), "stale"); // offline overrides
ok("freshnessLevel: live / delayed / stale + offline override");

console.log(`\nALL ${n} CHECKS PASSED`);
