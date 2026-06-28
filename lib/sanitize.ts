// Privacy publish gate (secondary net). The PRIMARY mechanism is allowlist BUILD
// (buildTtSnapshot only emits known public-safe fields). This is a HIGH-PRECISION scan
// for things that must NEVER be public: avatar UUIDs, agent SLurls, and credentials.
// It is deliberately NOT a fuzzy person-name detector — dish/table names like
// "Caesar Salad" or "The Velvet Table" would false-positive (Codex flagged this).
// Identity safety comes from never READING name-resolving sources, not from guessing names.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const AGENT_SLURL_RE = /secondlife\.com\/app\/agent\//i;
const SECONDLIFE_KEY_RE = /\bsecondlife:\/\/[^ ]*\/agent\//i;
const TOKEN_RE = /(gho_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,})/;
const BEARER_RE = /bearer\s+[A-Za-z0-9._\-]{16,}/i;

export interface Violation {
  path: string;
  reason: string;
  sample: string;
}

export function scanForbidden(value: string): string | null {
  if (UUID_RE.test(value)) return "uuid";
  if (AGENT_SLURL_RE.test(value) || SECONDLIFE_KEY_RE.test(value)) return "agent_ref";
  if (TOKEN_RE.test(value)) return "token";
  if (BEARER_RE.test(value)) return "bearer";
  return null;
}

export function findViolations(obj: unknown, path = "$"): Violation[] {
  const out: Violation[] = [];
  const walk = (v: unknown, p: string): void => {
    if (typeof v === "string") {
      const reason = scanForbidden(v);
      if (reason) out.push({ path: p, reason, sample: v.slice(0, 48) });
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${p}[${i}]`));
    } else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) walk(val, `${p}.${k}`);
    }
  };
  walk(obj, path);
  return out;
}

// Throws if the snapshot contains anything that must not be public.
// Callers (relay + client defensive re-check) should treat a throw as "do not publish/show".
export function assertPublishable(snapshot: unknown): void {
  const v = findViolations(snapshot);
  if (v.length) {
    throw new Error(
      "PRIVACY HOLD — refusing to publish/show. Violations: " +
        v.map((x) => `${x.path}:${x.reason}`).join(", "),
    );
  }
}
