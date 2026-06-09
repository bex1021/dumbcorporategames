// Lunch Dash — Phase 3 route shell (slice 1: drivable graybox).
//
// Walk out of the lobby → get in your car → drive across town for lunch and
// the exec's salmon bowl, back by noon. This first slice is ONLY the car +
// world + camera, to test whether driving feels good before layering on the
// bowl, pedestrians, traffic and the clock.
//
// Follows the jirarun phase pattern: a self-contained folder + a lazy route
// (/play/lunch-dash) wired in App.tsx.

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { DriveWorld } from './DriveWorld'
import { Car } from './Car'
import { DriveCamera } from './DriveCamera'
import { DriveHud } from './DriveHud'
import { ObjectiveDetector } from './ObjectiveDetector'
import { GameClock } from './GameClock'
import { DRIVE_CAMERA } from './driveConfig'
import { carPosition, carFacing, carTelemetry, carAir } from './carState'
import { driveClock, START_MIN } from './clockState'
import { SPAWN, ALLEYS, ALLEY_W, ALLEY_PROPS, BUILDINGS, ROADS } from './cityLayout'
import { terrainHeight } from './terrain'
import { boundary } from './boundaryState'
import { crash } from './crashState'
import { resetBowl, bowl, bowlTier, sloshBowl } from './bowlState'
import { resetTraffic, traffic, resolveTrafficCollision } from './trafficState'
import { resetPeds, peds, hr, updatePeds } from './pedState'
import { useLunchStore } from './lunchStore'

export default function LunchDash() {
  // Start rendering immediately — even if this tab happens to load hidden (a
  // backgrounded / prerendered tab, or a headless preview), so we never show a
  // black canvas. The visibilitychange handler below still pauses the loop
  // when the user actually leaves the tab mid-session (saves GPU/battery and
  // prevents a big delta lurch on refocus).
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
  useEffect(() => {
    const onVis = () => setFrameloop(document.hidden ? 'never' : 'always')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Fresh run on every entry: reset the persistent (module-global) car, clock,
  // and objective state so navigating in always starts clean at 11:00.
  useEffect(() => {
    carPosition.set(SPAWN.x, 0, SPAWN.z)
    carFacing.y = 0
    carTelemetry.speed = 0
    carAir.y = terrainHeight(SPAWN.x, SPAWN.z)
    carAir.vy = 0
    carAir.airborne = false
    carAir.prevGh = carAir.y
    carAir.climb = 0
    driveClock.minutes = START_MIN
    driveClock.running = true
    boundary.zone = 'in'
    crash.severity = 0
    crash.shake = 0
    resetBowl()
    resetTraffic()
    resetPeds()
    useLunchStore.getState().reset()
    // dev-only teleport hook for auditing the city: __lunch.go(x, z, facingRad)
    if (import.meta.env.DEV) {
      ;(window as unknown as { __lunch?: unknown }).__lunch = {
        go: (x: number, z: number, fy = 0) => {
          carPosition.set(x, 0, z)
          carFacing.y = fy
          carTelemetry.speed = 0
          const gy = terrainHeight(x, z)
          carAir.y = gy
          carAir.vy = 0
          carAir.airborne = false
          carAir.prevGh = gy
          carAir.climb = 0
        },
        // bowl-mechanic inspection / tuning hooks
        bowl,
        bowlTier,
        sloshBowl,
        store: useLunchStore,
        // living-city inspection hooks
        traffic,
        peds,
        hr,
        resolveTrafficCollision,
        updatePeds,
        // layout inspection hooks
        alleys: ALLEYS,
        alleyW: ALLEY_W,
        alleyProps: ALLEY_PROPS,
        buildings: BUILDINGS,
        roads: ROADS,
      }
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={frameloop}
        camera={{
          position: [SPAWN.x, DRIVE_CAMERA.height, SPAWN.z + DRIVE_CAMERA.distance],
          fov: DRIVE_CAMERA.fov,
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#c4ccd2']} />
        <fog attach="fog" args={['#c4ccd2', 170, 520]} />
        <Suspense fallback={null}>
          <DriveWorld />
          <Car />
        </Suspense>
        <DriveCamera />
        <ObjectiveDetector />
        <GameClock />
      </Canvas>

      <DriveHud />
    </div>
  )
}
