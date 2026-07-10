// HR FILE export/import — carry your whole day between browsers.
//
// The entire campaign lives in four localStorage keys; clear your cookies and
// the day is gone. This packs all four into one copyable code (your "HR file")
// and restores them from it — no account, no server, on-theme. The code is a
// base64 blob of the four keys' raw JSON, tagged so a stray paste is rejected
// cleanly.
//
// Keys covered (the whole day's persisted state):
//   blocked.progress.v1        — which phases are beaten (the unlock chain)
//   blocked.campaign.v1        — the receipts spine (per-phase finals)
//   blocked.achievements.v1    — Phase 1 achievements
//   blocked.jr-achievements.v1 — Jira Run achievements

const KEYS = [
  'blocked.progress.v1',
  'blocked.campaign.v1',
  'blocked.achievements.v1',
  'blocked.jr-achievements.v1',
] as const

const PREFIX = 'ALGN-HR-'

// UTF-8-safe base64 (emoji live in some ending strings, so btoa-of-raw would
// throw). Encode to UTF-8 bytes first, then base64.
function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}
function b64decode(s: string): string {
  const bin = atob(s)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Serialize the whole day into one HR-file code. Returns null if there's
 * nothing worth exporting yet (no phases beaten, no receipts).
 */
export function exportCode(): string | null {
  const payload: Record<string, string> = {}
  let hasData = false
  for (const k of KEYS) {
    try {
      const v = localStorage.getItem(k)
      if (v != null) { payload[k] = v; hasData = true }
    } catch {
      /* ignore a single unreadable key */
    }
  }
  if (!hasData) return null
  try {
    return PREFIX + b64encode(JSON.stringify(payload))
  } catch {
    return null
  }
}

export type ImportResult = { ok: true; restored: number } | { ok: false; error: string }

/**
 * Restore the day from an HR-file code. Only writes the known campaign keys,
 * and only string values, so a malformed / hostile code can't inject
 * arbitrary storage. Caller should reload the page after a success so every
 * store re-reads localStorage.
 */
export function importCode(raw: string): ImportResult {
  const code = raw.trim()
  if (!code.startsWith(PREFIX)) {
    return { ok: false, error: "That's not an HR file code — it should start with ALGN-HR-." }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(b64decode(code.slice(PREFIX.length)))
  } catch {
    return { ok: false, error: 'This code is damaged or incomplete — check it copied in full.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'This code is damaged or incomplete — check it copied in full.' }
  }
  const obj = parsed as Record<string, unknown>
  let restored = 0
  for (const k of KEYS) {
    const v = obj[k]
    if (typeof v !== 'string') continue
    try {
      // Validate it parses as JSON before trusting it (all four keys store JSON).
      JSON.parse(v)
      localStorage.setItem(k, v)
      restored++
    } catch {
      /* skip a key that isn't valid JSON */
    }
  }
  if (restored === 0) {
    return { ok: false, error: 'This code had nothing restorable in it.' }
  }
  return { ok: true, restored }
}
