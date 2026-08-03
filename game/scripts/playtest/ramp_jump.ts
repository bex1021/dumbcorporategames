// PARADE JUMP HARNESS — drives the ramp using the SAME rules as Car.tsx.
//
// This exists because three separate ramp bugs shipped to the player that a
// thirty-second simulation would have caught: the deck floating 2 m in the air,
// the car snapping through the lip instead of falling off it, and the barricades
// acting as infinitely tall invisible walls that no jump could ever clear.
//
// It mirrors Car.tsx's grounded/airborne branch exactly — INCLUDING the order of
// the launch vs edge-fall tests and the ramp-gate hold — so if that logic
// changes, change it here too and re-run:
//
//   npx tsx scripts/playtest/ramp_jump.ts
//
// Read the output as: under the gate you must be BLOCKED; at or over it you must
// LAUNCH and clear every barricade with real altitude.
import { terrainHeight, RAMPS, rampAt, rampHeight } from '../../src/lunchdash/terrain'
import { AIR } from '../../src/lunchdash/driveConfig'
import { PARADE_BARRIERS } from '../../src/lunchdash/cityLayout'

const X = -43, dt = 1 / 60
const truck = RAMPS.find((r: any) => r.dressing === 'truck')!

// barricade tops, for the fly-over check the collision layer now does
const bars = PARADE_BARRIERS.map((b) => ({ z0: b.minZ, z1: b.maxZ, h: 1.2 }))

function run(v: number) {
  let z = truck.z + truck.len / 2 + 12
  let y = terrainHeight(X, z), prevGh = y, climb = 0, vy = 0
  let airborne = false
  let gate = 0, gateT = 0
  const log: string[] = []
  for (let i = 0; i < 900; i++) {
    z -= v * dt
    const gh = terrainHeight(X, z)
    if (airborne) {
      vy -= AIR.gravity * dt; y += vy * dt
      if (y <= gh) { y = gh; airborne = false; log.push(`land z=${z.toFixed(0)}`); break }
    } else {
      const vG = Math.max(-60, Math.min(60, (gh - prevGh) / dt))
      const fell = prevGh - gh
      climb = Math.max(vG, climb)
      const onRamp = rampHeight(X, z) > 0.15
      const rp = onRamp ? rampAt(X, z) : null
      if (onRamp) { gate = rp?.minSpeed ?? AIR.rampMinSpeed; gateT = 0.25 }
      else if (gateT > 0) gateT = Math.max(0, gateT - dt)
      const fromRamp = onRamp || gateT > 0
      const ms = fromRamp ? (onRamp ? (rp?.minSpeed ?? AIR.rampMinSpeed) : gate) : AIR.minSpeed
      // launch BEFORE edge-fall — same order as Car.tsx
      if (v >= ms && climb > (fromRamp ? AIR.rampLaunchMin : AIR.launchMin) && vG < climb * AIR.crestRatio) {
        airborne = true; vy = climb * (fromRamp ? AIR.rampBoost : AIR.crestBoost); climb = 0
        log.push(`LAUNCH z=${z.toFixed(0)} y=${y.toFixed(1)} vy=${vy.toFixed(1)}`)
      } else if (fell > 0.35) {
        airborne = true; y = prevGh; vy = 0; climb = 0
        log.push(`no launch — falls off lip z=${z.toFixed(0)}`)
      } else {
        y = gh; if (vG <= 0.05) climb = 0
      }
    }
    // barricade: blocked only if we are NOT above its height
    for (const b of bars) {
      if (z < b.z1 && z > b.z0) {
        const above = y - terrainHeight(X, z)
        if (above <= b.h) { log.push(`❌ BLOCKED by barricade z=${z.toFixed(0)} (only ${above.toFixed(1)}m up)`); return log }
        log.push(`✅ cleared barricade z=${z.toFixed(0)} at ${above.toFixed(1)}m`)
      }
    }
    prevGh = gh
  }
  return log
}
console.log(`truck: entry z=${truck.z + truck.len / 2}  lip z=${truck.z - truck.len / 2}  gate ${truck.minSpeed} m/s\n`)
for (const v of [12, 18, 20, 22, 25]) console.log(`v=${String(v).padStart(2)}  ${run(v).join('  →  ')}`)
