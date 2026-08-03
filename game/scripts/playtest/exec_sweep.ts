// Do Leonard's strikes connect against the 1.28× Exec, at the ranges where they
// connect against a normal body? Sim-level, both fighters sandbagged.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from '../../src/perfreview/fighterState'
import { OPP_MOVES } from '../../src/perfreview/frameData'

const run = (moveId: string, gap: number, scale: number): boolean => {
  resetFight({ oppMoves: OPP_MOVES, oppScale: scale, oppHP: 100 })
  fight.started = true
  leonard.x = -gap / 2
  opponent.x = gap / 2
  leonard.facing = 1
  opponent.facing = -1
  leonard.meter = 3
  const hp0 = opponent.health
  stepFight({ ...NO_INTENT, move: moveId }, NO_INTENT)
  for (let f = 0; f < 200; f++) {
    stepFight(NO_INTENT, NO_INTENT)
    if (leonard.state === 'idle' && f > 10) break
  }
  return opponent.health < hp0
}

for (const move of ['clarify', 'pushback', 'hurricane', 'phased']) {
  for (const scale of [1.0, 1.28]) {
    const marks: string[] = []
    const hits: number[] = []
    for (let g = 0.7; g <= 2.4; g += 0.1) {
      const ok = run(move, +g.toFixed(2), scale)
      marks.push(ok ? '#' : '.')
      if (ok) hits.push(+g.toFixed(2))
    }
    const lo = hits.length ? Math.min(...hits).toFixed(1) : '—'
    const hi = hits.length ? Math.max(...hits).toFixed(1) : '—'
    console.log(`${move.padEnd(10)} scale ${scale}  0.7m ${marks.join('')} 2.4m  connects ${lo}–${hi}`)
  }
}
