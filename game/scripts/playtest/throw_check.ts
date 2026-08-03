// Why does spam-throw still beat the Exec? Tally every channel.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT, type Intent } from '../../src/perfreview/fighterState'
import { readDummyIntent, resetDummy, setOpponentProfile, setDummyRng, EXEC_AI } from '../../src/perfreview/dummyAI'
import { OPP_MOVES } from '../../src/perfreview/frameData'
import { BOUTS } from '../../src/perfreview/boutState'

let seedState = 1
const mulberry = (a: number) => () => {
  let t = (a += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const exec = BOUTS[2]
const t = { throwsStarted: 0, throwsLanded: 0, throwWhiff: 0, aiHitsTaken: 0, aiAttacks: 0, dashes: 0 }
let wins = 0
for (let seed = 1; seed <= 40; seed++) {
  const rng = mulberry(seed * 7919)
  setDummyRng(rng)
  resetFight({ oppMoves: exec.moves, oppHP: exec.startHP, oppScale: exec.oppScale, regenPerSec: exec.regenPerSec })
  setOpponentProfile(EXEC_AI)
  resetDummy()
  fight.started = true
  let prevLeoState = 'idle'
  let prevOppState = 'idle'
  let prevLeoHP = leonard.health
  let prevOppHP = opponent.health
  for (let f = 0; f < 60 * 99 && !fight.over; f++) {
    const dist = Math.abs(opponent.x - leonard.x)
    const intent: Intent = dist <= 0.9 ? { ...NO_INTENT, move: 'offline' } : { ...NO_INTENT, walk: (leonard.x < opponent.x ? 1 : -1) as 1 | -1 }
    const ai = readDummyIntent()
    if (ai.dash !== 0) t.dashes++
    stepFight(intent, ai)
    if (leonard.state === 'startup' && prevLeoState !== 'startup') t.throwsStarted++
    if (opponent.health < prevOppHP) t.throwsLanded++
    if (prevLeoState === 'active' && leonard.state === 'recovery' && opponent.health === prevOppHP) t.throwWhiff++
    if (leonard.health < prevLeoHP) t.aiHitsTaken++
    if (opponent.state === 'startup' && prevOppState !== 'startup') t.aiAttacks++
    prevLeoState = leonard.state
    prevOppState = opponent.state
    prevLeoHP = leonard.health
    prevOppHP = opponent.health
  }
  if (fight.winner === 'leonard') wins++
}
console.log(`spam-throw vs EXEC: win ${(wins / 40) * 100}%`)
console.log(`per run: throws started ${(t.throwsStarted / 40).toFixed(1)}, landed ${(t.throwsLanded / 40).toFixed(1)}, whiffed ${(t.throwWhiff / 40).toFixed(1)}, AI dashes ${(t.dashes / 40).toFixed(1)}, AI attacks ${(t.aiAttacks / 40).toFixed(1)}, hits Leonard took ${(t.aiHitsTaken / 40).toFixed(1)}`)
