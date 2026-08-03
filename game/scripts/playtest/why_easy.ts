// DIAGNOSIS, not guessing: run mash-jab and human-avg vs each bout and tally
// what happens to the AI's OFFENSE (stuffed/blocked/landed/never-thrown) and
// where Leonard's damage comes from. The tuning lever is whichever channel is
// broken, and only the numbers know.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT, setFightEventHandler } from '../../src/perfreview/fighterState'
import { readDummyIntent, resetDummy, setOpponentProfile, BRENT_AI, PRIYA_AI, EXEC_AI } from '../../src/perfreview/dummyAI'
import { BRENT_MOVES, PRIYA_MOVES, OPP_MOVES } from '../../src/perfreview/frameData'
import { BOUTS } from '../../src/perfreview/boutState'

const BOUT = [
  { name: 'BRENT', ai: BRENT_AI, moves: BRENT_MOVES, hp: 80, scale: 1.0, regen: 0.8 },
  { name: 'PRIYA', ai: PRIYA_AI, moves: PRIYA_MOVES, hp: 95, scale: 1.0, regen: 0 },
  { name: 'EXEC', ai: EXEC_AI, moves: OPP_MOVES, hp: 100, scale: 1.28, regen: 0 },
]

let seedState = 1
const srand = (s: number) => { seedState = s }
const rng = () => {
  seedState = (seedState * 1664525 + 1013904223) >>> 0
  return seedState / 4294967296
}

for (const b of BOUT) {
  // tally per bout, mash-jab bot, 40 seeds
  const t = { aiAttacks: 0, aiLanded: 0, aiBlockedByLeo: 0, aiStuffed: 0, aiWhiff: 0, leoLanded: 0, leoBlocked: 0, aiParry: 0 }
  let wins = 0
  let leoHPsum = 0
  for (let seed = 1; seed <= 40; seed++) {
    srand(seed * 7919)
    resetFight({ oppMoves: b.moves, oppHP: b.hp, oppScale: b.scale, regenPerSec: b.regen })
    setOpponentProfile(b.ai)
    resetDummy()
    fight.started = true
    let prevOppState = 'idle'
    let prevOppHP = opponent.health
    let prevLeoHP = leonard.health
    let jabTimer = 0
    for (let f = 0; f < 60 * 99 && !fight.over; f++) {
      jabTimer++
      const leoIntent = jabTimer % 3 === 0 ? { ...NO_INTENT, move: 'clarify' } : NO_INTENT
      stepFight(leoIntent, readDummyIntent())
      // tally AI offense outcomes
      if (opponent.state === 'startup' && prevOppState !== 'startup') t.aiAttacks++
      if (prevOppState === 'startup' && opponent.state === 'hitstun') t.aiStuffed++
      if (leonard.health < prevLeoHP) {
        if (leonard.health < prevLeoHP - 2) t.aiLanded++
        else t.aiBlockedByLeo++
      }
      if (opponent.health < prevOppHP) t.leoLanded++
      prevOppState = opponent.state
      prevOppHP = opponent.health
      prevLeoHP = leonard.health
    }
    if (fight.winner === 'leonard') { wins++; leoHPsum += leonard.health }
  }
  console.log(
    `${b.name.padEnd(6)} mash-jab: win ${((wins / 40) * 100).toFixed(0)}%  avgHP ${(leoHPsum / Math.max(1, wins)).toFixed(0)}  ` +
      `AI attacks/run ${(t.aiAttacks / 40).toFixed(1)}  stuffed ${((t.aiStuffed / Math.max(1, t.aiAttacks)) * 100).toFixed(0)}%  ` +
      `landed/run ${(t.aiLanded / 40).toFixed(1)}  leoHits/run ${(t.leoLanded / 40).toFixed(1)}`,
  )
}
