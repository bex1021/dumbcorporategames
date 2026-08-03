// What actually happens when a move comes out in a REAL fight — not in a
// hand-placed isolation test. Reports outcome (hit/blocked/whiffed), what state
// the defender ends up in, and — critically — whether the sim's hit frames line
// up with the ANIMATION's visual contact frames.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from '../../src/perfreview/fighterState'
import { LEONARD_MOVES } from '../../src/perfreview/frameData'

// visual contact frames measured from each clip (scripts/mixamo/measure-new.mjs),
// expressed in TRIM-RELATIVE 30fps frames, plus the trim's timeScale
const VISUAL: Record<string, { rel: number[]; scale: number; off?: number }> = {
  hurricane: { rel: [24], scale: 2.2 }, // crescent: contact abs f40, trim starts f16
  phased: { rel: [12, 24, 66, 96], scale: 1.7 }, // abs f36,48,90,120 of trim [24,145]
  pushback: { rel: [8], scale: 1.0 },
  clarify: { rel: [4], scale: 1.09 },
}
const toGameFrame = (rel: number, scale: number) => Math.round((rel * 2) / scale)
const OFFSET: Record<string, number> = { hurricane: 0 } // kickprep occupies startup; spin contact is rel to move start

const audit = (moveId: string, gap: number, defBlocks: boolean) => {
  resetFight()
  fight.started = true
  leonard.x = -gap / 2
  opponent.x = gap / 2
  leonard.facing = 1
  opponent.facing = -1
  leonard.meter = 3
  const hp0 = opponent.health
  const hitFrames: number[] = []
  const states = new Set<string>()
  let prevHits = fight.leoHits
  let minGap = Math.abs(opponent.x - leonard.x)
  const leoStart = leonard.x
  stepFight({ ...NO_INTENT, move: moveId }, { ...NO_INTENT, block: defBlocks })
  for (let f = 1; f < 220; f++) {
    stepFight(NO_INTENT, { ...NO_INTENT, block: defBlocks })
    if (fight.leoHits > prevHits) { hitFrames.push(f); prevHits = fight.leoHits }
    states.add(opponent.state)
    minGap = Math.min(minGap, opponent.x - leonard.x) // SIGNED: negative = passed through
    if (leonard.state === 'idle' || leonard.state === 'walk') break
  }
  const dmg = hp0 - opponent.health
  return { hitFrames, dmg, states: [...states].filter((s) => s !== 'idle'),
    pushed: +(opponent.x - gap / 2).toFixed(2),
    minGap: +minGap.toFixed(2), leoTravel: +(leonard.x - leoStart).toFixed(2) }
}

for (const id of ['hurricane', 'phased']) {
  const m = LEONARD_MOVES[id]
  const v = VISUAL[id]
  const visual = v.rel.map((r) => (v.off ?? 0) + toGameFrame(r, v.scale))
  console.log(`\n══ ${id.toUpperCase()}  (startup ${m.startup}, active ${m.active}, hits ${m.hits ?? 1}, reArm ${m.reArm ?? '-'}) ══`)
  console.log(`  ANIMATION contacts at game frames: [${visual.join(', ')}]`)
  const expected: number[] = [m.startup]
  for (let i = 1; i < (m.hits ?? 1); i++)
    expected.push(expected[i - 1] + (m.reArmSeq?.[i - 1] ?? m.reArm ?? 0))
  console.log(`  SIM hit frames (if all connect):   [${expected.join(', ')}]`)
  const drift = visual.map((vf, i) => (expected[i] === undefined ? '—' : `${expected[i] - vf > 0 ? '+' : ''}${expected[i] - vf}`))
  console.log(`  drift (sim − animation):           [${drift.join(', ')}]  ${visual.some((vf,i)=>expected[i]!==undefined && Math.abs(expected[i]-vf)>6) ? '← OUT OF SYNC' : '✓'}`)
  for (const gap of [0.9, 1.4, 1.9]) {
    for (const block of [false, true]) {
      const r = audit(id, gap, block)
      console.log(
        `  gap ${gap}m ${block ? 'BLOCKING' : 'open    '}  dmg ${String(r.dmg).padStart(3)}  ` +
          `hits [${r.hitFrames.join(', ') || '—'}]  def: ${r.states.join('/') || '—'}  ` +
          `leo moved ${r.leoTravel}m  closest gap ${r.minGap}m ${r.minGap < 0 ? '← PASSED THROUGH' : r.minGap < 0.7 ? '← INSIDE minGap' : ''}`,
      )
    }
  }
}
