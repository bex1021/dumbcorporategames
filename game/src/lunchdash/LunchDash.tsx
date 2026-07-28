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
import { CinematicEffects } from './CinematicEffects'
import { DRIVE_CAMERA } from './driveConfig'
import { carPosition, carFacing, carTelemetry, carAir } from './carState'
import { SPAWN, ALLEYS, ALLEY_W, ALLEY_PROPS, BUILDINGS, ROADS, inWater, nearestRoadPoint } from './cityLayout'
import { river } from './riverState'
import { driveClock } from './clockState'
import { terrainHeight } from './terrain'
import { bowl, bowlTier, sloshBowl, armBowl } from './bowlState'
import { traffic, resolveTrafficCollision } from './trafficState'
import { peds, hr, updatePeds } from './pedState'
import { useLunchStore } from './lunchStore'
import { resetRun } from './runReset'
import { Retrospective } from './Retrospective'
import { DriveIntro } from './DriveIntro'
import { startRadio, stopAll } from './driveAudio'

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

  // The intro card holds the clock at 11:00 (GameClock only mounts once the
  // player starts the car) so reading the brief doesn't cost them the run.
  // A photomode door (press-kit capture, DEV-only) skips the intro entirely.
  const [started, setStarted] = useState(() =>
    import.meta.env.DEV &&
    ['bowl', 'parade'].includes(new URLSearchParams(window.location.search).get('photomode') ?? '')
  )

  // Tune the car radio to the market-news bed for the whole session; tear all
  // audio down when we leave Lunch Dash.
  useEffect(() => stopAll, [])

  // Fresh run on every entry: reset the persistent (module-global) car, clock,
  // and objective state so navigating in always starts clean at 11:00.
  useEffect(() => {
    resetRun()
    // Dev-only photomode doors (press-kit capture): ?photomode=<door> skips the
    // intro and primes the scene for a promo shot. Doors:
    //   bowl   — salmon bowl aboard, long straight on Synergy Ave for swerving
    //   parade — bowl aboard, pointed at the downtown parade barricades
    if (import.meta.env.DEV) {
      const door = new URLSearchParams(window.location.search).get('photomode')
      if (door === 'bowl' || door === 'parade') {
        useLunchStore.getState().advance() // Slop Bowlz stop is "done"
        armBowl() // bowl in the cupholder, integrity 100
        const spot = door === 'parade'
          ? { x: -43, z: 70 } // Synergy Ave, short run-up into the parade zone
          : { x: -43, z: 220 } // south arterial straight — room to swerve hard
        carPosition.set(spot.x, 0, spot.z)
        carFacing.y = 0 // forward is -z: both doors drive north up Synergy Ave
        const gy = terrainHeight(spot.x, spot.z)
        carAir.y = gy
        carAir.prevGh = gy
        startRadio() // `started` already true via the useState initializer
      }
    }
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
        // live car state (read-only inspection)
        carPosition,
        carAir,
        carFacing,
        terrainHeight,
        // bowl-mechanic inspection / tuning hooks
        bowl,
        bowlTier,
        sloshBowl,
        store: useLunchStore,
        // living-city inspection hooks
        traffic,
        peds,
        hr,
        river,
        inWater,
        nearestRoadPoint,
        clock: driveClock,
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
        shadows
        camera={{
          position: [SPAWN.x, DRIVE_CAMERA.height, SPAWN.z + DRIVE_CAMERA.distance],
          fov: DRIVE_CAMERA.fov,
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#cfd8dd']} />
        <fog attach="fog" args={['#d6dde1', 180, 540]} />
        <Suspense fallback={null}>
          <DriveWorld />
          <Car />
        </Suspense>
        <DriveCamera />
        <ObjectiveDetector />
        {started && <GameClock />}
        <CinematicEffects />
      </Canvas>

      <DriveHud />
      {!started && <DriveIntro onStart={() => { setStarted(true); startRadio() }} />}
      <Retrospective />
    </div>
  )
}

