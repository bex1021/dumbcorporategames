// "Why does blocking not seem to work?" — playtest 2026-08-03.
// Measure it: Leonard HOLDS BLOCK the entire time while Priya rushes him
// down. Count what actually happens to her hits. If blocking works, a held
// guard should eat strings as chip (blocked), not as clean hits.
import { fight, leonard, opponent, resetFight, stepFight, setSimRng, NO_INTENT } from '../../src/perfreview/fighterState'
import { readDummyIntent, resetDummy, setOpponentProfile, setDummyRng, PRIYA_AI } from '../../src/perfreview/dummyAI'
import { BOUTS } from '../../src/perfreview/boutState'

const mulberry = (a: number) => () => {
  let t = (a += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const priya = BOUTS[1]
const t = { clean: 0, blocked: 0, thrown: 0, cleanWhileHoldingBlock: 0, taught: 0 }
for (let seed = 1; seed <= 30; seed++) {
  const rng = mulberry(seed * 7919)
  setDummyRng(rng)
  setSimRng(rng)
  resetFight({ oppMoves: priya.moves, oppHP: priya.startHP, oppScale: priya.oppScale, regenPerSec: priya.regenPerSec, oppTech: priya.throwTech })
  setOpponentProfile(PRIYA_AI)
  resetDummy()
  fight.started = true
  let prevHP = leonard.health
  for (let f = 0; f < 60 * 30 && !fight.over; f++) {
    // Leonard: hold block, never anything else — the turtle test
    stepFight({ ...NO_INTENT, block: true }, readDummyIntent())
    if (fight.lastHit?.kind === 'throw' && fight.teachGrabT > 100) t.taught++
    if (leonard.health < prevHP) {
      const dmg = prevHP - leonard.health
      const kind = fight.lastHit?.kind
      if (kind === 'throw') t.thrown++
      else if (dmg <= 2) t.blocked++ // chip is ≤2 (8% of any move)
      else {
        t.clean++
        t.cleanWhileHoldingBlock++
      }
    }
    prevHP = leonard.health
  }
}
console.log(`Held-block vs Priya, 30 x 30s runs:`)
console.log(`  blocked (chip only): ${t.blocked}`)
console.log(`  thrown (unblockable, by design): ${t.thrown}`)
console.log(`  CLEAN hits through a held block: ${t.clean}`)
console.log(`  teaching flashes raised on those grabs: ${t.taught}`)
console.log(t.clean > t.blocked * 0.2 ? '\n✗ blocking is broken — strings punch through a held guard' : '\n✓ blocking holds')
