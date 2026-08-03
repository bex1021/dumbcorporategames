// What ACTUALLY happens when Leonard throws the kick at live Priya, 200 times.
// Uses the real dummyAI + real sim — no browser, no screencast RNG, no vibes.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from '../../src/perfreview/fighterState'
import { readDummyIntent, resetDummy, setOpponentProfile, PRIYA_AI } from '../../src/perfreview/dummyAI'

// isolate WHERE the blocks come from: run the tally at several react-block
// levels; if block% barely moves, the guard is coming from somewhere else
const REACT_BLOCK = Number(process.env.RB ?? PRIYA_AI.reactBlock)
import { PRIYA_MOVES } from '../../src/perfreview/frameData'

const outcomes = { landed: 0, blocked: 0, evaded: 0, stuffed: 0, whiffed: 0 }
const N = 200
for (let trial = 0; trial < N; trial++) {
  resetFight({ oppMoves: PRIYA_MOVES })
  setOpponentProfile({ ...PRIYA_AI, reactBlock: REACT_BLOCK })
  resetDummy()
  fight.started = true
  leonard.x = -0.6
  opponent.x = 0.6
  leonard.facing = 1
  opponent.facing = -1
  // let her AI settle into its rhythm for a random-ish offset (deterministic seed
  // via trial count — no Math.random in the harness)
  for (let f = 0; f < 10 + (trial % 37); f++) stepFight(NO_INTENT, readDummyIntent())
  const hp0 = opponent.health
  const leoHp0 = leonard.health
  let pressed = false
  let sawDash = false
  let sawBlock = false
  let interrupted = false
  for (let f = 0; f < 140; f++) {
    const intent = !pressed ? { ...NO_INTENT, move: 'hurricane' } : NO_INTENT
    if (!pressed) pressed = true
    stepFight(intent, readDummyIntent())
    if (opponent.state === 'dash') sawDash = true
    if (opponent.state === 'blockstun' || opponent.blocking) sawBlock = true
    if (leonard.state === 'hitstun' || leonard.state === 'knockdown') { interrupted = true; break }
    if (opponent.health < hp0) break
    if (pressed && (leonard.state === 'idle' || leonard.state === 'walk') && f > 10) break
  }
  if (opponent.health < hp0 && opponent.health <= hp0 - 10) outcomes.landed++
  else if (opponent.health < hp0) outcomes.blocked++ // chip only
  else if (interrupted) outcomes.stuffed++
  else if (sawDash) outcomes.evaded++
  else if (sawBlock) outcomes.blocked++
  else outcomes.whiffed++
}
const pct = (n: number) => `${((n / N) * 100).toFixed(0)}%`
console.log(`kick outcomes over ${N} live-AI trials from 1.2m:`)
for (const [k, v] of Object.entries(outcomes)) console.log(`  ${k.padEnd(8)} ${String(v).padStart(4)}  ${pct(v)}`)
