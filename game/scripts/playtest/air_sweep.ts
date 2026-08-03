// Does the AIR attack (W then J) actually connect at the ranges players jump
// from? The report: "noise but no contact" — the swing/whiff sounds play (they
// should) but the strike itself may be whiffing at common ranges.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from '../../src/perfreview/fighterState'

const run = (gap: number, pressAt: number, fwd = 0 as 0 | 1): { hit: boolean; peakY: number } => {
  resetFight()
  fight.started = true
  leonard.x = -gap / 2
  opponent.x = gap / 2
  leonard.facing = 1
  opponent.facing = -1
  const hp0 = opponent.health
  let peakY = 0
  stepFight({ ...NO_INTENT, jump: true, walk: fwd }, NO_INTENT)
  for (let f = 1; f < 160; f++) {
    const intent = f === pressAt ? { ...NO_INTENT, move: 'jumpIn', walk: fwd } : { ...NO_INTENT, walk: fwd }
    stepFight(intent, NO_INTENT)
    peakY = Math.max(peakY, leonard.y)
    if (f > 20 && !leonard.airborne && leonard.state === 'idle') break
  }
  return { hit: opponent.health < hp0, peakY }
}

console.log('press J at frame N of the hop (jump startup ~apex ~land):')
for (const fwd of [0, 1] as const) {
  console.log(fwd ? '  — FORWARD jump (holding D) —' : '  — neutral hop —')
for (const pressAt of [6, 10, 14, 18, 22]) {
  const marks: string[] = []
  const hits: number[] = []
  for (let g = 0.8; g <= 2.6; g += 0.15) {
    const r = run(+g.toFixed(2), pressAt, fwd)
    marks.push(r.hit ? '#' : '.')
    if (r.hit) hits.push(+g.toFixed(2))
  }
  const lo = hits.length ? Math.min(...hits).toFixed(1) : '—'
  const hi = hits.length ? Math.max(...hits).toFixed(1) : '—'
  console.log(`  press f${String(pressAt).padStart(2)}  0.8m ${marks.join('')} 2.6m   connects ${lo}–${hi}`)
}
}
