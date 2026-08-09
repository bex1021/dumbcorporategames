// Phase 4 (Performance Review) achievement CATALOG + persistence.
//
// Same shape as content/lunchAchievements.ts and jrAchievements.ts: badge
// metadata only (no sim imports, no predicates) so the level-select menu can
// list the collection without pulling the fight chunk into the menu bundle.
// PerformanceReview.tsx keeps the earned() logic next to the fight stats and
// writes the earned ids here as bouts and the day resolve.

export type FightAchievementMeta = { id: string; emoji: string; title: string; desc: string }

export const FIGHT_ACHIEVEMENTS_CATALOG: FightAchievementMeta[] = [
  { id: 'aligned', emoji: '🤝', title: 'Fully Aligned', desc: 'All three rooms convinced in one afternoon. The project remains unbuilt.' },
  { id: 'exceeds', emoji: '🏆', title: 'Exceeds Expectations', desc: 'Won the day averaging over half your credibility. The bar was on the floor.' },
  { id: 'flawless', emoji: '✨', title: 'Flawless Victory', desc: 'Convinced a room at 88%+ credibility. They never laid a doubt on you.' },
  { id: 'comeback', emoji: '🩹', title: 'Dead Cat Bounce', desc: 'Under 10% credibility, and you still closed the room. HR was mid-email.' },
  { id: 'offline', emoji: '🗓️', title: 'Serial Scheduler', desc: 'Won a meeting by taking it offline five separate times. The calendar groans.' },
  { id: 'strictly', emoji: '🎯', title: 'Strictly Professional', desc: 'Won a room without a single grab attempted. Words only. Mostly fists, technically.' },
  { id: 'listener', emoji: '🛡️', title: 'Active Listening', desc: 'Blocked twelve objections in one winning meeting. They felt heard. They lost.' },
  { id: 'hardstop', emoji: '⚡', title: 'Hard Stop Honored', desc: 'Closed a room in under 30 seconds. The next invite was already loading.' },
  { id: 'noresched', emoji: '📅', title: 'Zero Reschedules', desc: 'Beat the whole day without one meeting regenerating. Unheard of. Literally.' },
  { id: 'however', emoji: '🔁', title: 'However — Countered', desc: 'Three grabs broken in one meeting and you won anyway. Persistence, noted.' },
]

const STORAGE_KEY = 'blocked.fight-achievements.v1'

export function loadFightUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

// Merge newly-earned ids into the persisted set (never un-earns). Safe to call
// on every bout and day resolution.
export function saveFightUnlocked(ids: Iterable<string>): void {
  try {
    const set = loadFightUnlocked()
    let changed = false
    for (const id of ids) if (!set.has(id)) { set.add(id); changed = true }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}
