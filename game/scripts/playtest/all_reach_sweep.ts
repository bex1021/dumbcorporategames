// Reach honesty audit for EVERY move in EVERY kit: at what gap does damage
// register, vs what a limb can visually cover (fist ≈ 0.85m + body 0.42m).
// The super hid a 2.16m fist for weeks; this closes the class.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from '../../src/perfreview/fighterState'
import { LEONARD_MOVES, OPP_MOVES, BRENT_MOVES, PRIYA_MOVES } from '../../src/perfreview/frameData'

const HONEST_MAX = 1.35 // arm/leg + defender body; anything past this needs a lunge

const sweep = (side: 'leo' | 'opp', kit: Record<string, { id: string; kind: string }>, kitName: string) => {
  for (const id of Object.keys(kit)) {
    if (kit[id].kind === 'counter') continue // no hitbox of its own
    let maxHit = 0
    let lunged = 0
    for (let g = 0.7; g <= 3.0; g += 0.1) {
      resetFight({ oppMoves: kit === LEONARD_MOVES ? OPP_MOVES : (kit as never) })
      fight.started = true
      leonard.x = -g / 2
      opponent.x = g / 2
      leonard.facing = 1
      opponent.facing = -1
      leonard.meter = 3
      const att = side === 'leo' ? leonard : opponent
      const def = side === 'leo' ? opponent : leonard
      const startX = att.x
      const hp0 = def.health
      const intent = { ...NO_INTENT, move: id }
      stepFight(side === 'leo' ? intent : NO_INTENT, side === 'opp' ? intent : NO_INTENT)
      for (let f = 0; f < 220; f++) {
        stepFight(NO_INTENT, NO_INTENT)
        if (att.state === 'idle' && f > 10) break
      }
      if (def.health < hp0) {
        maxHit = +g.toFixed(1)
        lunged = Math.abs(att.x - startX)
      }
    }
    const effective = maxHit - lunged // how far the LIMB itself reached
    const flag = effective > HONEST_MAX ? '  ← DISHONEST (limb reaches past honesty cap)' : ''
    console.log(
      `${kitName.padEnd(8)} ${id.padEnd(13)} connects to ${maxHit.toFixed(1)}m` +
        `  (lunge ${lunged.toFixed(2)} → limb ${effective.toFixed(2)}m)${flag}`,
    )
  }
}
sweep('leo', LEONARD_MOVES as never, 'LEONARD')
sweep('opp', OPP_MOVES as never, 'EXEC')
sweep('opp', BRENT_MOVES as never, 'BRENT')
sweep('opp', PRIYA_MOVES as never, 'PRIYA')
