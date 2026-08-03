
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT } from "../../src/perfreview/fighterState"
import { OPP_MOVES } from "../../src/perfreview/frameData"
for (const scale of [1.0, 1.28]) {
  let maxHit = 0
  for (let g = 0.7; g <= 2.0; g += 0.05) {
    resetFight({ oppMoves: OPP_MOVES, oppScale: scale })
    fight.started = true
    leonard.x = -g/2; opponent.x = g/2
    leonard.facing = 1; opponent.facing = -1
    const hp0 = leonard.health
    stepFight(NO_INTENT, { ...NO_INTENT, move: "jab" })
    for (let f = 0; f < 120; f++) { stepFight(NO_INTENT, NO_INTENT); if (opponent.state === "idle" && f > 10) break }
    if (leonard.health < hp0) maxHit = +g.toFixed(2)
  }
  console.log(`exec jab at scale ${scale}: connects to ${maxHit}m`)
}
