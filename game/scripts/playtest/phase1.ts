// Phase 1 (Pre-Standup Alignment) — headless decision-layer playtester.
//
// Phase 1 isn't a reflex game like Jira Run — it's a DECISION game: walk to 5
// stakeholders, pick dialogue options that move meters (project / pissed-off /
// meeting-load / alignment / time), beat the 10:30 hard deadline. So the
// "autopilot" here doesn't dodge obstacles — it makes choices.
//
// Crucially this drives the REAL game store (src/state/gameStore.ts) and the
// REAL dialogue/achievement/recovery data, replaying each choice exactly the
// way DialoguePanel/RecoveryPanel do. So what it proves is true of the shipped
// game, not a lookalike:
//   - Is the day winnable? Which endings/ratings are reachable?
//   - Is EVERY achievement reachable by some strategy? (auto-checks the
//     "Aligned but Hated" fix we debugged, and all the others)
//   - Is the deadline fair once walking time is included?
//   - Is any single strategy dominant?
//
// Walking is modelled from real NPC positions × the real 0.06 min/m walk cost.
//
// Usage:  npx tsx scripts/playtest/phase1.ts

import { useGameStore, computeRating } from '../../src/state/gameStore'
import { DIALOGUE } from '../../src/content/dialogue'
import { NPCS, PLAYER } from '../../src/config/constants'
import { ACHIEVEMENTS, evaluateAchievements, type RunSnapshot } from '../../src/content/achievements'

const WALK_MIN_PER_M = 0.06 // matches Player.tsx
const SOFT_DEADLINE = 75 // 10:15 standup (on-time achievement + rating penalty start)
const HARD_DEADLINE = 90 // 10:30 — past this is an automatic loss
const REQUIRED = ['brent', 'tasha', 'priya', 'chad', 'diane'] as const
const WIN_ENDINGS = new Set(['standup-complete', 'green-enough', 'pyrrhic-alignment'])

const store = useGameStore
const posOf: Record<string, { x: number; z: number }> = Object.fromEntries(
  NPCS.map((n) => [n.id, { x: n.x, z: n.z }]),
)
const SPAWN = { x: PLAYER.spawnX, z: PLAYER.spawnZ }
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z)

// Efficient nearest-neighbour-ish visit order from the PM's spawn. Walking is
// minor (~3 min total) so order barely moves the deadline, but we fix one so
// runs are comparable and delayed-effect timing is consistent.
const ORDER = ['brent', 'tasha', 'diane', 'priya', 'chad'] as const

// Recovery default: if the Calendar Apocalypse panel fires mid-run, resolve it
// the way a competent player would (Decline — the strongest escape).
const RECOVERY_DECLINE = { time: 10, meetingLoad: -25, pissedOff: 7, alignment: -1 }

type Plan = Record<string, number> // npcId -> choice index (0..3)

type RunResult = {
  ending: string | null
  won: boolean
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
  time: number
  handled: number
  ratingTier: string
  ratingScore: number
  achievements: string[]
}

function playRun(plan: Plan, opts: { order?: readonly string[]; openSlackAtEnd?: boolean; recovery?: typeof RECOVERY_DECLINE } = {}): RunResult {
  const order = opts.order ?? ORDER
  store.getState().reset()
  store.getState().startGame()

  let prev = SPAWN
  for (const npcId of order) {
    const g0 = store.getState()
    if (g0.phase !== 'playing') break
    // Walk to the NPC (accrues time; can trip the hard deadline like in-game).
    store.getState().addWalkTime(dist(prev, posOf[npcId]) * WALK_MIN_PER_M)
    prev = posOf[npcId]
    if (store.getState().phase !== 'playing') break

    const choice = DIALOGUE[npcId].choices[plan[npcId]]
    // Replay the exact DialoguePanel sequence: applyEffects → queue delayed →
    // recordChoice → markHandled.
    store.getState().applyEffects(choice.effects)
    if (choice.delayedEffects) {
      store.getState().queueDelayedEffect({
        interactionsRemaining: choice.delayedEffects.delayInteractions,
        effects: choice.delayedEffects.effects,
        toastCopy: choice.delayedEffects.toastCopy,
      })
    }
    if (store.getState().phase !== 'playing') break // hard deadline from choice time
    store.getState().recordChoice(npcId, choice.id, choice.resultCopy, choice.followUp)
    store.getState().markHandled(npcId)

    // Resolve a Calendar Apocalypse recovery panel if it fired.
    if (store.getState().pendingRecovery) {
      store.getState().applyRecovery(opts.recovery ?? RECOVERY_DECLINE)
    }
    if (store.getState().phase === 'ended') break
  }

  if (opts.openSlackAtEnd) store.getState().toggleSlack()

  const s = store.getState()
  const snap: RunSnapshot = {
    ending: (s.ending ?? 'missed-standup') as RunSnapshot['ending'],
    projectStatus: s.projectStatus,
    pissedOff: s.pissedOff,
    meetingLoad: s.meetingLoad,
    alignment: s.alignment,
    timeMinutes: s.timeMinutes,
    copingUseCounts: s.copingUseCounts,
    recoveryTriggered: s.runRecoveryTriggered,
    delayedFireCount: s.runDelayedFireCount,
    slackOpenedAtAll: s.runSlackOpened,
    finalUnreadSlack: s.unreadSlack,
  }
  const achievements = s.ending ? evaluateAchievements(snap) : []
  const rating = computeRating({
    ending: s.ending,
    projectStatus: s.projectStatus,
    pissedOff: s.pissedOff,
    meetingLoad: s.meetingLoad,
    alignment: s.alignment,
    timeMinutes: s.timeMinutes,
    npcsHandled: s.handledNPCs.size,
  })
  return {
    ending: s.ending,
    won: !!s.ending && WIN_ENDINGS.has(s.ending),
    projectStatus: s.projectStatus,
    pissedOff: s.pissedOff,
    meetingLoad: s.meetingLoad,
    alignment: s.alignment,
    time: Math.round(s.timeMinutes),
    handled: s.handledNPCs.size,
    ratingTier: rating.tier,
    ratingScore: rating.score,
    achievements,
  }
}

const pad = (s: string | number, n: number) => String(s).padEnd(n)
const padL = (s: string | number, n: number) => String(s).padStart(n)

// ---- 1) Strategy personalities ----
const PERSONAS: { name: string; plan: Plan; openSlackAtEnd?: boolean }[] = [
  { name: 'diplomat (calm)', plan: { brent: 0, tasha: 0, priya: 1, chad: 1, diane: 0 } },
  { name: 'aligner (max align)', plan: { brent: 0, tasha: 2, priya: 0, chad: 1, diane: 2 } },
  { name: 'speedrunner (min time)', plan: { brent: 3, tasha: 1, priya: 3, chad: 3, diane: 1 } },
  { name: 'process-bro (all meetings)', plan: { brent: 2, tasha: 2, priya: 2, chad: 2, diane: 2 } },
  { name: 'dismissive (all worst)', plan: { brent: 3, tasha: 1, priya: 3, chad: 3, diane: 3 } },
]

console.log('\n🧑‍💼  Phase 1 (Pre-Standup Alignment) — decision-layer playtest\n')
console.log('STRATEGY PERSONALITIES')
console.log('═'.repeat(98))
console.log(
  pad('strategy', 26) + pad('ending', 20) + padL('time', 6) + padL('proj', 6) +
  padL('pissed', 8) + padL('mtg', 5) + padL('align', 7) + '  ' + pad('rating', 9) + 'achievements',
)
console.log('─'.repeat(98))
for (const p of PERSONAS) {
  const r = playRun(p.plan, { openSlackAtEnd: p.openSlackAtEnd })
  console.log(
    pad(p.name, 26) +
    pad(r.ending ?? '—', 20) +
    padL(r.time + 'm', 6) +
    padL(r.projectStatus, 6) +
    padL(r.pissedOff, 8) +
    padL(r.meetingLoad, 5) +
    padL(r.alignment, 7) + '  ' +
    pad(r.ratingTier === 'none' ? '—' : `${r.ratingTier}(${r.ratingScore})`, 9) +
    r.achievements.length,
  )
}
console.log('═'.repeat(98))

// ---- 2) Brute force ALL 4^5 = 1024 dialogue combos (fixed order) ----
const idx = [0, 1, 2, 3]
const all: RunResult[] = []
for (const a of idx) for (const b of idx) for (const c of idx) for (const d of idx) for (const e of idx) {
  all.push(playRun({ brent: a, tasha: b, priya: c, chad: d, diane: e }))
}

const wins = all.filter((r) => r.won)
console.log(`\nBRUTE FORCE — every dialogue combination (${all.length} runs, efficient route, Decline on recovery)`)
console.log('─'.repeat(70))
console.log(`  win rate: ${((wins.length / all.length) * 100).toFixed(1)}%  (${wins.length}/${all.length})`)
const endingCounts: Record<string, number> = {}
for (const r of all) endingCounts[r.ending ?? 'none'] = (endingCounts[r.ending ?? 'none'] || 0) + 1
console.log('  endings reachable:')
for (const [end, n] of Object.entries(endingCounts).sort((x, y) => y[1] - x[1])) {
  console.log(`    ${pad(end, 22)} ${padL(n, 4)}  ${((n / all.length) * 100).toFixed(0)}%`)
}
const ratingCounts: Record<string, number> = {}
for (const r of wins) ratingCounts[r.ratingTier] = (ratingCounts[r.ratingTier] || 0) + 1
console.log('  win ratings: ' + Object.entries(ratingCounts).map(([t, n]) => `${t}:${n}`).join('  '))
const onTime = wins.filter((r) => r.time <= SOFT_DEADLINE)
console.log(`  beat SOFT deadline (≤${SOFT_DEADLINE}m, "On Time"): ${onTime.length} winning combos`)
const bestScore = wins.reduce((m, r) => (r.ratingScore > m.ratingScore ? r : m), wins[0])
console.log(`  best win: ${bestScore.ratingTier}(${bestScore.ratingScore})  proj ${bestScore.projectStatus} align ${bestScore.alignment} pissed ${bestScore.pissedOff} time ${bestScore.time}m`)

// ---- 3) Achievement reachability ----
console.log('\nACHIEVEMENT REACHABILITY (across all dialogue combos)')
console.log('─'.repeat(70))
// dialogue-driven achievements: reachable if any combo earns it
const dialogueReach: Record<string, boolean> = {}
for (const r of all) for (const id of r.achievements) dialogueReach[id] = true
// object/slack achievements need extra inputs — verify those separately
const objSlackChecks: Record<string, boolean> = {}
// printer-prophet: 5 printer presses
store.getState().reset(); store.getState().startGame()
for (let i = 0; i < 6; i++) store.getState().interactObject('printer')
objSlackChecks['printer-prophet'] = (store.getState().copingUseCounts.printer ?? 0) >= 5
// plant-friend: 5 phyllis presses
store.getState().reset(); store.getState().startGame()
for (let i = 0; i < 6; i++) store.getState().interactObject('phyllis')
objSlackChecks['plant-friend'] = (store.getState().copingUseCounts.phyllis ?? 0) >= 5
// inbox-zero: a winning run that opens slack at the end (unread<8)
const inboxRun = playRun(PERSONAS[0].plan, { openSlackAtEnd: true })
objSlackChecks['inbox-zero'] = inboxRun.achievements.includes('inbox-zero')
// calendar-apocalypse ENDING (not just the achievement): embrace the recovery
const apocRun = playRun({ brent: 2, tasha: 2, priya: 2, chad: 2, diane: 2 }, { recovery: { time: 5, alignment: 1 } })

for (const a of ACHIEVEMENTS) {
  const reachable = dialogueReach[a.id] || objSlackChecks[a.id]
  const note = objSlackChecks[a.id] !== undefined ? ' (needs object/slack interaction)' : ''
  console.log(`  ${reachable ? '✅' : '❌'}  ${pad(a.title, 24)} ${a.description}${reachable ? '' : '  ← UNREACHABLE' + note}`)
}

// ---- 4) Notable specifics ----
console.log('\nKEY CHECKS')
console.log('─'.repeat(70))
const alignedHated = all.find((r) => r.alignment >= 6 && r.pissedOff >= 40 && r.won)
console.log(`  "Aligned but Hated" reachable in a WIN: ${alignedHated ? `yes (align ${alignedHated.alignment}, pissed ${alignedHated.pissedOff}, ${alignedHated.ending})` : 'NO ⚠️'}`)
const allHonest = playRun({ brent: 0, tasha: 0, priya: 0, chad: 0, diane: 0 })
console.log(`  all-honest (all "A") run: ${allHonest.ending}, ${allHonest.time}m → ${allHonest.time > SOFT_DEADLINE ? `${allHonest.time - SOFT_DEADLINE}m late (misses On Time by design)` : 'on time'}`)
console.log(`  calendar-apocalypse ENDING reachable (embrace recovery): ${apocRun.ending === 'calendar-apocalypse' ? 'yes' : apocRun.ending}`)
const goldRuns = wins.filter((r) => r.ratingTier === 'gold')
console.log(`  Gold rating reachable: ${goldRuns.length > 0 ? `yes (${goldRuns.length} combos)` : 'NO'}`)

console.log('\nDone.\n')
