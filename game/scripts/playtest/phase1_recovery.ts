// Targeted probe: is the Calendar Apocalypse recovery panel reachable AT ALL?
// Exhaustively tries every visit ORDER (120) × every dialogue combo (1024) =
// 122,880 runs against the real store, and records whether meetingLoad ever
// reaches the 80 recovery threshold while the run is still alive (time < 90).
//
// setTimeout is stubbed so the store's toast-auto-clear timers don't pile up
// across 122k runs (irrelevant to this analysis).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).setTimeout = () => 0

import { useGameStore } from '../../src/state/gameStore'
import { DIALOGUE } from '../../src/content/dialogue'
import { NPCS, PLAYER } from '../../src/config/constants'

const WALK = 0.06
const REQUIRED = ['brent', 'tasha', 'priya', 'chad', 'diane']
const store = useGameStore
const posOf: Record<string, { x: number; z: number }> = Object.fromEntries(NPCS.map((n) => [n.id, { x: n.x, z: n.z }]))
const SPAWN = { x: PLAYER.spawnX, z: PLAYER.spawnZ }
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z)
const RECOVERY = { time: 10, meetingLoad: -25, pissedOff: 7, alignment: -1 }

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) out.push([arr[i], ...p])
  }
  return out
}

const orders = permutations(REQUIRED)
const idx = [0, 1, 2, 3]

let recoveryRuns = 0
let apocalypseEndings = 0
let peakMeetingWhileAlive = 0 // highest meetingLoad seen at a living markHandled (time<90)
let runs = 0

for (const order of orders) {
  for (const a of idx) for (const b of idx) for (const c of idx) for (const d of idx) for (const e of idx) {
    const plan: Record<string, number> = { brent: a, tasha: b, priya: c, chad: d, diane: e }
    store.getState().reset()
    store.getState().startGame()
    let prev = SPAWN
    let recovered = false
    for (const npcId of order) {
      if (store.getState().phase !== 'playing') break
      store.getState().addWalkTime(dist(prev, posOf[npcId]) * WALK)
      prev = posOf[npcId]
      if (store.getState().phase !== 'playing') break
      const choice = DIALOGUE[npcId].choices[plan[npcId]]
      store.getState().applyEffects(choice.effects)
      if (choice.delayedEffects) {
        store.getState().queueDelayedEffect({
          interactionsRemaining: choice.delayedEffects.delayInteractions,
          effects: choice.delayedEffects.effects,
          toastCopy: choice.delayedEffects.toastCopy,
        })
      }
      if (store.getState().phase !== 'playing') break
      store.getState().markHandled(npcId)
      const st = store.getState()
      // meetingLoad right after a handle, while not failed on time
      if (st.timeMinutes < 90) peakMeetingWhileAlive = Math.max(peakMeetingWhileAlive, st.meetingLoad)
      if (st.pendingRecovery) {
        recovered = true
        store.getState().applyRecovery(RECOVERY)
      }
      if (store.getState().phase === 'ended') break
    }
    if (recovered) recoveryRuns++
    if (store.getState().ending === 'calendar-apocalypse') apocalypseEndings++
    runs++
  }
}

console.log(`\nExhaustive Calendar-Apocalypse reachability probe`)
console.log(`  runs: ${runs.toLocaleString()} (${orders.length} orders × 1024 combos)`)
console.log(`  recovery panel triggered in: ${recoveryRuns} runs`)
console.log(`  calendar-apocalypse ENDING reached in: ${apocalypseEndings} runs`)
console.log(`  highest meetingLoad ever reached while still alive: ${peakMeetingWhileAlive} (need ≥80 to trigger recovery)`)
console.log(
  recoveryRuns === 0
    ? `\n  ⚠️  UNREACHABLE: no dialogue path ever spikes meetingLoad to 80 before the 90-min deadline.\n     → the "Calendar Apocalypse" achievement + ending can't be earned through stakeholder choices.`
    : `\n  ✅ reachable.`,
)
