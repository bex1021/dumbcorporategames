// Does a strike actually CONNECT at the ranges you'd throw it from?
// The hurricane kick was whiffing at every range because its forward travel
// lived in the Mixamo root motion, which we strip — the animation lunged, the
// body didn't. This sweeps starting gaps and reports the connect window.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from '../../src/perfreview/fighterState'

const run = (moveId: string, gap: number): { hit: boolean; travelled: number } => {
  resetFight()
  fight.started = true // stepFight early-returns until the round is live
  leonard.x = -gap / 2
  opponent.x = gap / 2
  leonard.facing = 1
  leonard.meter = 3 // 'phased' costs 3 bars; grant them so the sweep can fire it
  opponent.facing = -1
  const startX = leonard.x
  const hp0 = opponent.health
  stepFight({ ...NO_INTENT, move: moveId }, NO_INTENT)
  for (let i = 0; i < 200 && !fight.over; i++) {
    stepFight(NO_INTENT, NO_INTENT)
    if (leonard.state === 'idle' || leonard.state === 'walk') break
  }
  return { hit: opponent.health < hp0, travelled: leonard.x - startX }
}

for (const move of ['hurricane', 'phased', 'pushback', 'clarify']) {
  const hits: number[] = []
  let travel = 0
  const marks: string[] = []
  for (let g = 0.7; g <= 3.2; g += 0.1) {
    const r = run(move, +g.toFixed(2))
    if (r.hit) hits.push(+g.toFixed(2))
    travel = r.travelled
    marks.push(r.hit ? '#' : '.')
  }
  const lo = hits.length ? Math.min(...hits) : NaN
  const hi = hits.length ? Math.max(...hits) : NaN
  console.log(
    `${move.padEnd(10)} connects at gap ${isNaN(lo) ? 'NEVER' : `${lo.toFixed(1)}–${hi.toFixed(1)}m`}` +
      `  (lunge carried ${travel.toFixed(2)}m)\n  0.7m ${marks.join('')} 3.2m`,
  )
}
