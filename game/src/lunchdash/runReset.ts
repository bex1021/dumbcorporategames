// One place to start a fresh Lunch Dash run — used both on route mount and by
// the retrospective's "Drive again" button, so the two can never drift apart.

import { carPosition, carFacing, carTelemetry, carAir } from './carState'
import { driveClock, START_MIN } from './clockState'
import { SPAWN } from './cityLayout'
import { terrainHeight } from './terrain'
import { boundary } from './boundaryState'
import { crash } from './crashState'
import { resetBowl } from './bowlState'
import { resetTraffic } from './trafficState'
import { resetPeds } from './pedState'
import { resetPickup } from './pickupState'
import { resetRiver } from './riverState'
import { useLunchStore } from './lunchStore'

export function resetRun() {
  carPosition.set(SPAWN.x, 0, SPAWN.z)
  carFacing.y = 0
  carTelemetry.speed = 0
  const gy = terrainHeight(SPAWN.x, SPAWN.z)
  carAir.y = gy
  carAir.vy = 0
  carAir.airborne = false
  carAir.prevGh = gy
  carAir.climb = 0
  carAir.settle = 0
  carAir.rampGate = 0
  carAir.rampGateT = 0
  driveClock.minutes = START_MIN
  driveClock.running = true
  boundary.zone = 'in'
  crash.severity = 0
  crash.shake = 0
  resetBowl()
  resetTraffic()
  resetPeds()
  resetPickup()
  resetRiver()
  useLunchStore.getState().reset()
}
