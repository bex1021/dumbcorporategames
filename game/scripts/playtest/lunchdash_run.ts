// Balance harness runner for Phase 3 "Lunch Dash".
//   npx tsx scripts/playtest/lunchdash_run.ts
//
// Drives bot personalities through the real rule code (see lunchdash_model.ts),
// sweeps the clock budget to find "tense but fair", checks tier reachability,
// and does a speed-sensitivity pass so the conclusion doesn't hinge on one
// modelling guess.

import { simulate, LEGS, ROUTE_DIST, START_MIN, END_MIN, type Bot, type RunResult } from './lunchdash_model.ts'
import { makeRng } from '../../src/jirarun/rng.ts'

const N = 4000 // seeds per personality

const BOTS: Bot[] = [
  // floors corners just under the slosh limit, hauls on straights, hits nobody
  { name: 'optimal', cruise: 22, corner: 9.5, cornerSharp: 0.85, pedPerKm: 0.0, crashPerKm: 0.05, navWaste: 1.0, ditherSec: 0 },
  // cautious everywhere, protects the bowl, the occasional graze
  { name: 'careful', cruise: 13, corner: 7, cornerSharp: 0.85, pedPerKm: 0.12, crashPerKm: 0.05, navWaste: 1.05, ditherSec: 2 },
  // floors it through corners and crowds — the bowl + HR pay for it
  { name: 'reckless', cruise: 24, corner: 19, cornerSharp: 0.9, pedPerKm: 3.0, crashPerKm: 0.5, navWaste: 1.0, ditherSec: 0 },
  // bad at everything: wrong turns, dithers, clips people, middling speed
  { name: 'naive', cruise: 15, corner: 14, cornerSharp: 0.9, pedPerKm: 1.5, crashPerKm: 0.4, navWaste: 1.4, ditherSec: 8 },
]

const fmtClock = (m: number) => {
  const hh = Math.floor(m / 60)
  const mm = Math.floor(m % 60)
  return `${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, '0')}`
}
const pct = (n: number, d: number) => ((100 * n) / d).toFixed(0) + '%'

function runBot(bot: Bot, minPerSec: number, n = N) {
  const rng = makeRng(1009 + bot.name.length * 7919)
  const out: RunResult[] = []
  for (let i = 0; i < n; i++) out.push(simulate(bot, minPerSec, rng))
  const delivered = out.filter((r) => r.delivered)
  const onTime = out.filter((r) => r.delivered && !r.wasLate)
  const late = out.filter((r) => r.delivered && r.wasLate)
  const noShow = out.filter((r) => !r.delivered)
  const tiers = { composed: 0, functional: 0, disheveled: 0 }
  const bowls = { composed: 0, functional: 0, disheveled: 0 }
  let usedSum = 0
  let hitSum = 0
  for (const r of out) {
    tiers[r.tier]++
    bowls[r.bowlState]++
    usedSum += r.minutesUsed
    hitSum += r.pedestrianHits
  }
  return {
    bot: bot.name,
    onTime: onTime.length,
    late: late.length,
    noShow: noShow.length,
    avgUsed: usedSum / out.length,
    avgFinish: START_MIN + usedSum / out.length,
    avgHits: hitSum / out.length,
    tiers,
    bowls,
    n: out.length,
    delivered: delivered.length,
  }
}

const CUR_BUDGET = 150 // REAL_SECONDS_PER_HOUR currently in clockState.ts
const minPerSecFor = (budget: number) => (END_MIN - START_MIN) / budget

console.log('═══════════════════════════════════════════════════════════════════')
console.log('  LUNCH DASH — autopilot balance report')
console.log('═══════════════════════════════════════════════════════════════════')
console.log(`\nROUTE (road-following, Manhattan + bridge constraint):`)
console.log(`  spawn→Bowlz ${LEGS[0].dist}m · Bowlz→Lunch ${LEGS[1].dist}m · Lunch→HQ ${LEGS[2].dist}m`)
console.log(`  total ≈ ${ROUTE_DIST}m, ${LEGS.reduce((s, l) => s + l.corners, 0)} corners`)
console.log(`  in-game budget: 60 min over the hour; clock = 11:00→12:00 noon, 12:30 hard fail`)

console.log(`\n─── (1) AT THE CURRENT CLOCK (REAL_SECONDS_PER_HOUR=${CUR_BUDGET}, ${(3600 / CUR_BUDGET).toFixed(0)}:1) ───`)
console.log('  bot       on-time   late   no-show   avg finish   avg used   avg hits   tier dist (C/F/D)')
for (const bot of BOTS) {
  const r = runBot(bot, minPerSecFor(CUR_BUDGET))
  const td = `${pct(r.tiers.composed, r.n)}/${pct(r.tiers.functional, r.n)}/${pct(r.tiers.disheveled, r.n)}`
  console.log(
    `  ${r.bot.padEnd(9)} ${pct(r.onTime, r.n).padStart(6)} ${pct(r.late, r.n).padStart(6)} ${pct(r.noShow, r.n).padStart(8)}    ${fmtClock(r.avgFinish).padStart(6)}     ${r.avgUsed.toFixed(0).padStart(4)}min    ${r.avgHits.toFixed(1).padStart(5)}     ${td}`,
  )
}

console.log(`\n─── (2) TIER REACHABILITY (any bot, current clock) ───`)
const reach = { composed: false, functional: false, disheveled: false }
for (const bot of BOTS) {
  const r = runBot(bot, minPerSecFor(CUR_BUDGET))
  for (const t of ['composed', 'functional', 'disheveled'] as const) if (r.tiers[t] > 0) reach[t] = true
}
for (const t of ['composed', 'functional', 'disheveled'] as const) console.log(`  ${t.padEnd(11)} ${reach[t] ? '✓ reachable' : '✗ UNREACHABLE — bug'}`)

console.log(`\n─── (3) CLOCK-BUDGET SWEEP (on-time % by personality) ───`)
console.log('  budget(s)  ratio   optimal  careful  reckless  naive    optimal-finish')
for (const budget of [240, 180, 140, 110, 90, 75, 60, 50]) {
  const mps = minPerSecFor(budget)
  const o = runBot(BOTS[0], mps, 2500)
  const c = runBot(BOTS[1], mps, 2500)
  const k = runBot(BOTS[2], mps, 2500)
  const na = runBot(BOTS[3], mps, 2500)
  console.log(
    `  ${String(budget).padStart(7)}   ${(3600 / budget).toFixed(0).padStart(3)}:1  ${pct(o.onTime, o.n).padStart(7)}  ${pct(c.onTime, c.n).padStart(7)}  ${pct(k.onTime, k.n).padStart(8)}  ${pct(na.onTime, na.n).padStart(6)}   ${fmtClock(o.avgFinish)}`,
  )
}

console.log(`\n─── (4) SPEED SENSITIVITY (optimal bot, current 240s clock; does the loose-clock finding hold?) ───`)
for (const mult of [0.7, 0.85, 1.0, 1.15, 1.3]) {
  const b = { ...BOTS[0], cruise: BOTS[0].cruise * mult, corner: BOTS[0].corner * mult }
  // keep corner under the slosh limit even when scaled, so this isolates TIME not bowl
  const r = runBot(b, minPerSecFor(CUR_BUDGET), 1500)
  console.log(`  speed ×${mult.toFixed(2)}   avg finish ${fmtClock(r.avgFinish)}   margin to noon ${(END_MIN - r.avgFinish).toFixed(0)}min`)
}

console.log('\n═══════════════════════════════════════════════════════════════════\n')
