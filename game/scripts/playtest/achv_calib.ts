// One-off: calibrate Jira Run end-screen achievement thresholds.
//
// Achievements show ONLY on a WIN (all 4 sprints completed). The end screen's
// "dodged" counts tally EVERY obstacle that passes behind Leonard, by kind
// (block→slack, gap→worms, overhang→invites, wall→walls) — see RunnerWorld.tsx.
// So a winner's counts ≈ the full obstacle set spawned across the run, which
// varies only by seed. This script reproduces that exact tally for many winning
// runs and prints the distribution so thresholds can sit at sensible percentiles.
//
// Usage: npx tsx scripts/playtest/achv_calib.ts [seeds]

import { Sim } from '../../src/jirarun/simulation'
import { policies } from './autopilot'

const DT = 1 / 60
const MAX_FRAMES = 30000
const SEEDS = Number(process.argv[2] ?? 600)
const perfect = policies.find((p) => p.name === 'perfect')!

type Tally = { slack: number; worms: number; invites: number; walls: number; total: number; score: number }

function playWin(seed: number): Tally | null {
  const sim = new Sim(seed, { level: 1, updates: 0, score: 0 })
  const counted = new Set<number>()
  const t: Tally = { slack: 0, worms: 0, invites: 0, walls: 0, total: 0, score: 0 }
  let frames = 0
  while (sim.state.alive && !sim.state.won && frames < MAX_FRAMES) {
    perfect.act(sim, frames)
    sim.step(DT)
    const s = sim.state
    // mirror RunnerWorld's tally: count each non-board obstacle once as it passes behind
    for (const o of s.obstacles) {
      if (o.kind === 'board' || o.z >= s.z - 0.5 || counted.has(o.id)) continue
      counted.add(o.id)
      if (o.kind === 'block') t.slack++
      else if (o.kind === 'gap') t.worms++
      else if (o.kind === 'overhang') t.invites++
      else if (o.kind === 'wall') t.walls++
    }
    frames++
  }
  if (!sim.state.won) return null
  t.total = t.slack + t.worms + t.invites + t.walls
  t.score = sim.state.score
  return t
}

function stats(arr: number[]) {
  const a = [...arr].sort((x, y) => x - y)
  const at = (p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))]
  const mean = a.reduce((s, v) => s + v, 0) / a.length
  return { min: a[0], p10: at(0.1), p25: at(0.25), med: at(0.5), p75: at(0.75), p90: at(0.9), max: a[a.length - 1], mean: Math.round(mean * 10) / 10 }
}

const wins: Tally[] = []
for (let seed = 1; seed <= SEEDS; seed++) {
  const t = playWin(seed)
  if (t) wins.push(t)
}

console.log(`\nWinning runs: ${wins.length}/${SEEDS} (perfect autopilot)\n`)
const keys: (keyof Tally)[] = ['slack', 'worms', 'invites', 'walls', 'total', 'score']
console.log('metric    min  p10  p25  med  p75  p90  max   mean')
console.log('─'.repeat(54))
for (const k of keys) {
  const s = stats(wins.map((w) => w[k]))
  const f = (n: number) => String(n).padStart(5)
  console.log(`${k.padEnd(8)}${f(s.min)}${f(s.p10)}${f(s.p25)}${f(s.med)}${f(s.p75)}${f(s.p90)}${f(s.max)}${f(s.mean)}`)
}

// Apply the CURRENT thresholds and report the earned-rate among winners.
const T = { dnd: 12, lurker: 16, worms: 16, declined: 17, unblock: 24, ninja: 75, hoarder: 10000 }
const rate = (pred: (w: Tally) => boolean) => ((wins.filter(pred).length / wins.length) * 100).toFixed(0) + '%'
console.log('\nEarned-rate among WINNERS at current thresholds:')
console.log(`  🔕 dnd      slack>=${T.dnd}   ${rate((w) => w.slack >= T.dnd)}`)
console.log(`  🧘 lurker   slack>=${T.lurker}   ${rate((w) => w.slack >= T.lurker)}`)
console.log(`  🪱 worms    worms>=${T.worms}   ${rate((w) => w.worms >= T.worms)}`)
console.log(`  📅 declined invites>=${T.declined} ${rate((w) => w.invites >= T.declined)}`)
console.log(`  🚧 unblock  walls>=${T.unblock}   ${rate((w) => w.walls >= T.unblock)}`)
console.log(`  🥷 ninja    total>=${T.ninja}   ${rate((w) => w.total >= T.ninja)}`)
console.log(`  ⭐ hoarder  score>=${T.hoarder} ${rate((w) => w.score >= T.hoarder)}`)
console.log('')
