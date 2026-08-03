// Every attack must produce at least one sound in EVERY outcome — landed,
// blocked, whiffed. Silence on any row is the bug the player actually notices.
import { fight, leonard, opponent, resetFight, stepFight, NO_INTENT, setFightEventHandler } from '../../src/perfreview/fighterState'
const cues: string[] = []
setFightEventHandler((e) => cues.push(e))
const run = (move: string, gap: number, block: boolean) => {
  cues.length = 0
  resetFight(); fight.started = true
  leonard.x = -gap / 2; opponent.x = gap / 2
  leonard.facing = 1; opponent.facing = -1; leonard.meter = 3
  stepFight({ ...NO_INTENT, move }, { ...NO_INTENT, block })
  for (let i = 0; i < 220; i++) {
    stepFight(NO_INTENT, { ...NO_INTENT, block })
    if (leonard.state === 'idle' || leonard.state === 'walk') break
  }
  return cues.filter((c) => c !== 'ko')
}
for (const m of ['clarify', 'pushback', 'hurricane', 'offline', 'phased']) {
  for (const [label, gap, block] of [['landed', 0.9, false], ['blocked', 0.9, true], ['whiffed', 3.0, false]] as const) {
    const c = run(m, gap, block)
    console.log(`${m.padEnd(10)} ${label.padEnd(8)} → ${c.join(', ') || 'SILENCE'}${c.length ? '' : '  ← BUG'}`)
  }
}
