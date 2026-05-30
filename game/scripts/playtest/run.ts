// Jira Run — headless playtest harness.
//
// Runs the autopilot personalities through hundreds of seeded games against the
// REAL rules engine (src/jirarun/simulation.ts), then reports beatability,
// difficulty-by-sprint, what kills players, and coin risk/reward.
//
// Usage:  npx tsx scripts/playtest/run.ts [seeds]
//   seeds = how many distinct layouts to test per personality (default 300)
//
// Reproduce any flagged run in the real game:  /play/jira-run?seed=<seed>

import { Sim } from '../../src/jirarun/simulation'
import { TOTAL_UPDATES } from '../../src/jirarun/runnerConfig'
import { policies, type Policy } from './autopilot'

const DT = 1 / 60 // fixed step — matches a 60fps frame
const MAX_FRAMES = 30000 // ~8 min of game time; a real win is ~6k frames

type DeathInfo = { cause: string; sprint: number; z: number; lane: number }
type RunResult = {
  seed: number; policy: string; won: boolean
  sprint: number; updates: number; dist: number; score: number
  frames: number; death: DeathInfo | null
}

function playOne(seed: number, policy: Policy): RunResult {
  const sim = new Sim(seed, { level: 1, updates: 0, score: 0 })
  let frames = 0
  let death: DeathInfo | null = null
  while (sim.state.alive && !sim.state.won && frames < MAX_FRAMES) {
    policy.act(sim, frames)
    const evs = sim.step(DT)
    for (const e of evs) {
      if (e.type === 'death') death = { cause: e.cause, sprint: e.sprint, z: Math.round(e.z), lane: e.lane }
    }
    frames++
  }
  const s = sim.state
  return {
    seed, policy: policy.name, won: s.won,
    sprint: s.level, updates: s.updates, dist: Math.round(s.z), score: s.score,
    frames, death,
  }
}

// ---- stats helpers ----
function median(arr: number[]): number {
  if (!arr.length) return 0
  const a = [...arr].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2)
}
function pct(arr: number[], p: number): number {
  if (!arr.length) return 0
  const a = [...arr].sort((x, y) => x - y)
  return a[Math.min(a.length - 1, Math.floor(p * a.length))]
}
function pad(s: string | number, n: number): string {
  return String(s).padEnd(n)
}
function padL(s: string | number, n: number): string {
  return String(s).padStart(n)
}

// ---- run ----
const SEEDS = Number(process.argv[2] ?? 300)
console.log(`\n🤖  Jira Run playtest — ${SEEDS} seeds × ${policies.length} personalities = ${SEEDS * policies.length} games\n`)

const all: RunResult[] = []
for (const policy of policies) {
  for (let seed = 1; seed <= SEEDS; seed++) all.push(playOne(seed, policy))
}

// ---- per-personality summary ----
console.log('═'.repeat(78))
console.log(pad('PERSONALITY', 20) + padL('win%', 7) + padL('med.sprint', 12) + padL('med.dist', 10) + padL('med.score', 11) + padL('reached✓', 10))
console.log('─'.repeat(78))
for (const policy of policies) {
  const rs = all.filter((r) => r.policy === policy.name)
  const wins = rs.filter((r) => r.won).length
  const winPct = ((wins / rs.length) * 100).toFixed(1)
  const reachedAll = rs.filter((r) => r.sprint >= TOTAL_UPDATES).length
  console.log(
    pad(policy.name, 20) +
    padL(winPct + '%', 7) +
    padL(median(rs.map((r) => r.sprint)) + '/' + TOTAL_UPDATES, 12) +
    padL(median(rs.map((r) => r.dist)), 10) +
    padL(median(rs.map((r) => r.score)), 11) +
    padL(reachedAll, 10),
  )
}
console.log('═'.repeat(78))

// ---- death-cause breakdown (all personalities that died) ----
console.log('\nWHAT KILLS PLAYERS (deaths by obstacle type):')
const causes = ['block', 'gap', 'overhang', 'wall'] as const
for (const policy of policies) {
  const deaths = all.filter((r) => r.policy === policy.name && r.death)
  if (!deaths.length) { console.log(`  ${pad(policy.name, 20)} — no deaths`); continue }
  const counts: Record<string, number> = {}
  for (const d of deaths) counts[d.death!.cause] = (counts[d.death!.cause] || 0) + 1
  const parts = causes.map((c) => `${c}:${padL(counts[c] || 0, 3)}`).join('  ')
  console.log(`  ${pad(policy.name, 20)} ${parts}`)
}

// ---- difficulty curve: where the PERFECT bot dies (sprint it died on) ----
const perfectRuns = all.filter((r) => r.policy === 'perfect')
const perfectDeaths = perfectRuns.filter((r) => r.death)
console.log('\nDIFFICULTY CURVE — perfect-play deaths by sprint (lower is fairer):')
for (let sp = 1; sp <= TOTAL_UPDATES; sp++) {
  const n = perfectDeaths.filter((r) => r.death!.sprint === sp).length
  const bar = '█'.repeat(n)
  console.log(`  Sprint ${sp}: ${padL(n, 3)}  ${bar}`)
}

// ---- candidate UNFAIR layouts: perfect bot died → inspect these seeds ----
console.log('\n⚠️  CANDIDATE UNFAIR SEEDS (perfect bot died — replay with ?seed=N):')
if (!perfectDeaths.length) {
  console.log('   none — the perfect bot cleared every layout it was given. ✅')
} else {
  console.log(`   ${perfectDeaths.length}/${perfectRuns.length} perfect-play runs ended in death.`)
  for (const r of perfectDeaths.slice(0, 12)) {
    console.log(`   seed ${padL(r.seed, 5)} → died sprint ${r.death!.sprint} on ${pad(r.death!.cause, 9)} at z=${r.death!.z}, lane ${r.death!.lane}`)
  }
}

// ---- coin risk/reward: greedy vs perfect ----
const g = all.filter((r) => r.policy === 'greedy')
const p = perfectRuns
console.log('\n💰  COIN RISK/REWARD (greedy chases tokens, perfect ignores them):')
console.log(`   median score   perfect ${median(p.map((r) => r.score))}  vs  greedy ${median(g.map((r) => r.score))}`)
console.log(`   win rate       perfect ${((p.filter((r) => r.won).length / p.length) * 100).toFixed(1)}%  vs  greedy ${((g.filter((r) => r.won).length / g.length) * 100).toFixed(1)}%`)
console.log(`   score spread   perfect p25/p75 ${pct(p.map((r) => r.score), 0.25)}/${pct(p.map((r) => r.score), 0.75)}  ·  greedy ${pct(g.map((r) => r.score), 0.25)}/${pct(g.map((r) => r.score), 0.75)}`)

console.log('\nDone.\n')
