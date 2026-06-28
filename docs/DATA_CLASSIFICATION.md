# Data classification (relay-enforced)

The relay decides what may leave the machine. Default = **fail-closed**: if a value is not
explicitly on the PUBLIC allowlist, it is dropped. Privacy is a build-time mechanism
(allowlist construction in `buildTtSnapshot`) plus a publish-time scan (`assertPublishable`),
never UI discipline.

## PUBLIC (may appear in a published snapshot)
- Venue identity: game id/name, venue id/name, SLurl, hours label.
- Status: `open | closed | maintenance | unknown`.
- Occupancy as AGGREGATE COUNTS only: seated, capacity, tables occupied/total.
- Orders reduced to: **table label + dish + state + age** (no guest/party label).
- Aggregate metrics: shift score, guests-served count, loyalty-guest **count**, rating
  **average + count**.
- Event/promo summary (owner-authored), menu items (owner-authored, display-only price).
- Staff as **role + on/off** (or a count). Display names ONLY with explicit per-person opt-in.
- Freshness/heartbeat: timestamps + online flag + a public-safe error class enum.

## OWNER-ONLY (never on the public site in MVP; future gated route only)
- Per-shift detailed analytics, revenue figures, busy-hour breakdowns.
- Reservation queue details, loyalty/voucher specifics, staff performance by person.
- Itemized order history.

## NEVER (must not leave the machine / reach the browser, ever)
- The DevBridge bearer token or ANY credential / write key.
- Any avatar legal name, display name, username, or `llKey2Name` result.
- Any avatar UUID / key, or an agent SLurl (`secondlife.com/app/agent/...`).
- The party/table-occupant **label**; individual guest rows; review text + author.
- Money/L$ transfer actions of any kind (display-only, human-gated in-world).

## Enforcement
1. `buildTtSnapshot` constructs the snapshot from known PUBLIC fields only (allowlist build).
2. `assertPublishable` scans the final object and REFUSES (throws) on any UUID / agent ref /
   token / bearer pattern. On refusal the relay publishes `{ online:false, errorClass:"privacy_hold" }`
   and replaces (never leaves) the last public snapshot.
3. The browser runs the same scan defensively before rendering.
4. Forbidden boards (staff roster, reservations — they resolve real names) are NOT on the
   relay read list and must not be added without opt-in or reduction to role/count.
