// Lunch Dash car — the beige Camry + the driving loop.
//
// Controls mirror the office tank scheme so the feel matches Phase 1:
//   W / Up    accelerate
//   S / Down  brake, then reverse once stopped
//   A D / arrows steer (only while moving — can't pivot a parked car)
// Camera stays rigidly behind (see DriveCamera).
//
// No physics engine (project lock) and no collision yet — this slice is purely
// "does driving + the follow camera feel good". Bouncy-bumper collision, the
// salmon bowl, pedestrians and traffic all come in later slices.

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { DRIVE, DRIVE_WORLD, AIR } from './driveConfig'
import { carPosition, carFacing, carTelemetry, carAir } from './carState'
import { resolveCarCollision, SPAWN } from './cityLayout'
import { boundary } from './boundaryState'
import { crash, damageTier, type DamageTier } from './crashState'
import { bowl, sloshBowl } from './bowlState'
import { resolveTrafficCollision } from './trafficState'
import { useLunchStore } from './lunchStore'
import { terrainHeight } from './terrain'

export function Car() {
  const ref = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const shadowRef = useRef<Group>(null)
  // Suspension spring: `y` is the body's vertical offset (compression, m) and
  // `v` its velocity. It settles back to 0 with a stiff spring + damping, so the
  // car dips on hard landings and rebounds instead of snapping to the ground.
  const susp = useRef({ y: 0, v: 0 })
  const keys = useKeyboard()
  const [tier, setTier] = useState<DamageTier>('pristine')
  const tierRef = useRef<DamageTier>('pristine')

  // the car casts a real shadow — re-applied when damage swaps the body meshes
  useEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = true
    })
  }, [tier])

  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(delta, 0.05) // clamp big frames (tab refocus) so we don't lurch
    const k = keys.current

    // --- longitudinal speed ---
    let target = 0
    let rate: number = DRIVE.coastRate
    if (k.forward) {
      target = DRIVE.maxSpeed
      rate = DRIVE.throttleRate
    } else if (k.back) {
      if (carTelemetry.speed > 0.1) {
        target = 0
        rate = DRIVE.brakeRate // pressing back while moving forward = brake
      } else {
        target = -DRIVE.reverseMaxSpeed // once stopped, back = reverse
        rate = DRIVE.throttleRate
      }
    }
    const before = carTelemetry.speed
    const approach = 1 - Math.exp(-rate * dt)
    carTelemetry.speed += (target - carTelemetry.speed) * approach
    if (!k.forward && !k.back && Math.abs(carTelemetry.speed) < DRIVE.stopEps) {
      carTelemetry.speed = 0
    }

    // --- steering (left = left, can't pivot in place) ---
    let steer = 0
    if (k.left) steer += 1
    if (k.right) steer -= 1
    // Authority ramps from standstill up to fullSteerSpeed, then tapers a bit
    // at very high speed so top-speed turns stay stable.
    const a = Math.abs(carTelemetry.speed)
    const ramp = Math.min(a / DRIVE.fullSteerSpeed, 1)
    const taper =
      1 -
      DRIVE.highSteerTaper *
        Math.min(Math.max(a - DRIVE.fullSteerSpeed, 0) / (DRIVE.maxSpeed - DRIVE.fullSteerSpeed), 1)
    carFacing.y += steer * DRIVE.turnRate * ramp * taper * dt

    // --- integrate position along facing ---
    const fwdX = -Math.sin(carFacing.y)
    const fwdZ = -Math.cos(carFacing.y)
    carPosition.x += fwdX * carTelemetry.speed * dt
    carPosition.z += fwdZ * carTelemetry.speed * dt

    // (no hard edge wall — the soft countryside boundary is handled below)

    // building collision — "bouncy bumper": separate the car from any wall it
    // overlaps and scrub most of its speed, so you bump-and-slow instead of
    // clipping through.
    const sevBefore = crash.severity // remember pre-impact damage so the bowl can feel the jolt
    const ix = carPosition.x
    const iz = carPosition.z
    const col = resolveCarCollision(ix, iz, DRIVE.carRadius)
    if (col.hit) {
      carPosition.x = col.x
      carPosition.z = col.z
      // Collide-and-slide: kill speed in proportion to how HEAD-ON the hit was.
      // Straight into a wall → stop dead (no creeping forward). A glancing
      // scrape → keep most speed and slide along the wall, with a little drag.
      const nx = col.x - ix
      const nz = col.z - iz
      const nl = Math.hypot(nx, nz)
      if (nl > 1e-4) {
        const moveSign = carTelemetry.speed >= 0 ? 1 : -1
        const intoWall = Math.max(0, (-moveSign * (fwdX * nx + fwdZ * nz)) / nl)
        const impact = Math.abs(carTelemetry.speed)
        if (intoWall > 0.5 && impact > 9) {
          // hard head-on crash → recoil backward off the immovable wall, take
          // cosmetic damage, and jolt the camera. Still drivable afterward.
          carTelemetry.speed = -moveSign * impact * 0.35 * intoWall
          crash.severity += (impact / 30) * intoWall
          crash.shake = Math.min(1, impact / 22)
        } else {
          // gentle contact → collide-and-slide (stop head-on, slide glancing)
          carTelemetry.speed *= (1 - 0.93 * intoWall) * 0.97
        }
      } else {
        carTelemetry.speed *= 0.4
      }
    }

    // traffic + parked cars — bump moving cars aside, hit parked ones like walls.
    // Lighter than a building: cars give, so less recoil and less damage.
    // tighter than the building radius — a car "hit" should need real contact
    const tcol = resolveTrafficCollision(carPosition.x, carPosition.z, 1.1)
    if (tcol.hit) {
      const nx = tcol.x - carPosition.x
      const nz = tcol.z - carPosition.z
      carPosition.x = tcol.x
      carPosition.z = tcol.z
      const nl = Math.hypot(nx, nz)
      if (nl > 1e-4) {
        const moveSign = carTelemetry.speed >= 0 ? 1 : -1
        const intoCar = Math.max(0, (-moveSign * (fwdX * nx + fwdZ * nz)) / nl)
        const impact = Math.abs(carTelemetry.speed)
        if (intoCar > 0.5 && impact > 11) {
          carTelemetry.speed = -moveSign * impact * 0.28 * intoCar // recoil
          crash.severity += (impact / 45) * intoCar // lighter than a wall
          crash.shake = Math.min(1, impact / 26)
          if (bowl.carrying) sloshBowl(0, impact * 0.012 * intoCar, dt)
        } else {
          carTelemetry.speed *= (1 - 0.8 * intoCar) * 0.98 // scrape past
        }
      } else {
        carTelemetry.speed *= 0.5
      }
    }

    // reflect accumulated damage as a tier (drives the car's look + the HUD)
    const dmgTier = damageTier(crash.severity)
    if (dmgTier !== tierRef.current) {
      tierRef.current = dmgTier
      setTier(dmgTier)
    }

    // --- salmon bowl: the core mechanic — slosh on hard corners + crashes ---
    // Picked up at the first stop (stepIndex advances to 1); from then until you
    // hand it over at HQ (done) it rides with you. Cornering force (speed × how
    // hard you're turning) and crash jolts spill it; smooth driving doesn't. It
    // only ever drains — a spill is a spill.
    const lunch = useLunchStore.getState()
    if (lunch.stepIndex >= 1) bowl.carrying = true
    if (bowl.carrying && !lunch.done) {
      const yawRate = steer * DRIVE.turnRate * ramp * taper // rad/s actually applied
      const latAccel = Math.abs(carTelemetry.speed * yawRate) // m/s² sideways on the bowl
      const sevGain = Math.max(0, crash.severity - sevBefore) // this frame's impact jolt
      sloshBowl(latAccel, sevGain, dt)
    }

    // soft countryside boundary — warn far out, snap back to HQ past the limit
    const distFromCenter = Math.hypot(carPosition.x, carPosition.z)
    if (distFromCenter > DRIVE_WORLD.returnRadius) {
      carPosition.set(SPAWN.x, 0, SPAWN.z)
      carFacing.y = 0
      carTelemetry.speed = 0
      carAir.y = 0
      carAir.vy = 0
      carAir.airborne = false
      carAir.prevGh = 0
      carAir.climb = 0
      boundary.zone = 'in'
      boundary.returnPulse++
    } else {
      boundary.zone = distFromCenter > DRIVE_WORLD.warnRadius ? 'warning' : 'in'
    }

    // --- vertical: catch air over crests, fall under gravity, land with a thud ---
    const gh = terrainHeight(carPosition.x, carPosition.z) // ground height under the car
    if (carAir.airborne) {
      carAir.vy -= AIR.gravity * dt
      carAir.y += carAir.vy * dt
      if (carAir.y <= gh) {
        const impact = -carAir.vy // descent speed at touchdown (m/s)
        carAir.y = gh
        carAir.vy = 0
        carAir.airborne = false
        // compress the suspension on touchdown so the car dips + rebounds
        // instead of stopping dead (harder landing → deeper dip)
        susp.current.v -= Math.min(impact, 16) * 0.05
        if (impact > AIR.hardLanding) {
          crash.shake = Math.max(crash.shake, Math.min(1, impact / 14)) // landing jolt
          if (bowl.carrying) sloshBowl(0, impact * 0.03, dt) // a hard landing jostles the bowl
          if (impact > 12) crash.severity += (impact - 12) * 0.02 // really hard landings scuff
        }
      }
    } else {
      // glued to terrain — but cresting a rise with real climb momentum pops the
      // car into the air (arcade "send it over the hill"). vGround is how fast the
      // terrain is lifting the car right now; we remember the steepest recent climb
      // and fling the car when that climb rate falls off near the top.
      const vGround = Math.max(-60, Math.min(60, (gh - carAir.prevGh) / dt))
      carAir.y = gh
      carAir.climb = Math.max(vGround, carAir.climb)
      // launch only if going FAST, after a STEEP climb, right at the CREST —
      // popping a touch gentler than the climb so it lifts smoothly, no jerk.
      const fastEnough = Math.abs(carTelemetry.speed) >= AIR.minSpeed
      if (fastEnough && carAir.climb > AIR.launchMin && vGround < carAir.climb * AIR.crestRatio) {
        carAir.airborne = true
        carAir.vy = carAir.climb * AIR.crestBoost
        carAir.climb = 0
      } else if (vGround <= 0.05) {
        carAir.climb = 0 // back on the flat without launching — forget the climb
      }
    }
    carAir.prevGh = gh

    // write transform — Y is the air-aware height (terrain when grounded, up on a jump)
    g.position.set(carPosition.x, carAir.y, carPosition.z)
    g.rotation.y = carFacing.y

    // subtle weight cues on the body only: nose up on accel / dip on brake,
    // and roll into turns. Heading stays on the parent group above.
    const body = bodyRef.current
    if (body) {
      const accel = (carTelemetry.speed - before) / dt
      const accelPitch = Math.max(-8, Math.min(8, accel)) * 0.004
      const steerRoll = -steer * ramp * 0.07
      // pitch + roll the body to match the terrain slope under the car
      const L = 2.3 // half the car's length / width for sampling the gradient
      const W = 1.0
      const rX = Math.cos(carFacing.y) // car's right vector
      const rZ = -Math.sin(carFacing.y)
      const hF = terrainHeight(carPosition.x + fwdX * L, carPosition.z + fwdZ * L)
      const hB = terrainHeight(carPosition.x - fwdX * L, carPosition.z - fwdZ * L)
      const hR = terrainHeight(carPosition.x + rX * W, carPosition.z + rZ * W)
      const hL = terrainHeight(carPosition.x - rX * W, carPosition.z - rZ * W)
      const slopePitch = Math.atan2(hF - hB, 2 * L) // nose up when climbing
      const slopeRoll = Math.atan2(hR - hL, 2 * W)

      // suspension spring: settle back to rest with a little weight-transfer
      // squat under accel/brake, so the car breathes over bumps + landings
      const sp = susp.current
      sp.v += (-70 * sp.y - 13 * sp.v) * dt // stiff spring + damping toward rest
      if (!carAir.airborne) sp.v += Math.max(-8, Math.min(8, accel)) * 0.003 // squat/dive
      sp.y += sp.v * dt
      sp.y = Math.max(-0.3, Math.min(0.12, sp.y))
      body.position.y = sp.y

      if (carAir.airborne) {
        // mid-jump: pitch the body to the flight path — nose up rising, dropping on the way down
        const horiz = Math.max(Math.abs(carTelemetry.speed), 3)
        body.rotation.set(Math.atan2(carAir.vy, horiz), 0, steerRoll)
      } else {
        body.rotation.set(accelPitch + slopePitch, 0, steerRoll + slopeRoll)
      }

      // tilt the fake shadow to the ground slope so it stops burying into hills,
      // and keep it pinned to the ground (shrinking) while the car is airborne.
      const sh = shadowRef.current
      if (sh) {
        sh.rotation.set(slopePitch, 0, slopeRoll)
        const lift = Math.max(0, carAir.y - gh)
        sh.position.y = -lift // parent group rides at carAir.y; push shadow back to ground
        sh.scale.setScalar(Math.max(0.5, 1 - lift * 0.06))
      }
    }
  })

  return (
    <group ref={ref}>
      <group ref={bodyRef}>
        <CarMesh tier={tier} />
      </group>
      <group ref={shadowRef}>
        <BlobShadow />
      </group>
    </group>
  )
}

// Sleek modern EV — reads as a Tesla, no branding. Low "skateboard" stance, a
// continuous near-black glass roof, raked windshield + fastback, flush
// low-profile wheels, and the signature full-width rear light bar. Pearl white
// so it pops against the beige traffic. Length runs along Z, front at -Z (so
// the camera behind sees the fastback + light bar — the recognizable angle).
function CarMesh({ tier }: { tier: DamageTier }) {
  const dmg = tier === 'wrecked' ? 3 : tier === 'dinged' ? 2 : tier === 'scuffed' ? 1 : 0
  const BODY = ['#e6e8ea', '#d4d4d2', '#b6b3af', '#9c9893'][dmg] // dulls as it takes damage
  const GLASS = dmg >= 3 ? '#16181b' : '#22252b'
  const SKIRT = '#1d2024'
  const TIRE = '#202225'
  const HUB = '#b9bdc2'
  const wheels: [number, number][] = [
    [-0.92, -1.5],
    [0.92, -1.5],
    [-0.92, 1.55],
    [0.92, 1.55],
  ]
  return (
    <group>
      {/* battery skirt — the low EV "skateboard" base */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.94, 0.3, 4.6]} />
        <meshStandardMaterial color={SKIRT} />
      </mesh>
      {/* main body — low and long (z-centered with the skirt so their rear
          faces don't sit at the same depth and z-fight = bumper flashing) */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.9, 0.5, 4.5]} />
        <meshStandardMaterial color={BODY} metalness={0.1} roughness={0.5} />
      </mesh>
      {/* low smooth nose (no grille) */}
      <mesh position={[0, 0.5, -2.05]}>
        <boxGeometry args={[1.78, 0.34, 0.7]} />
        <meshStandardMaterial color={BODY} metalness={0.1} roughness={0.5} />
      </mesh>
      {/* continuous glass greenhouse — the panoramic roof */}
      <mesh position={[0, 1.02, 0.05]}>
        <boxGeometry args={[1.6, 0.5, 2.5]} />
        <meshStandardMaterial color={GLASS} metalness={0.2} roughness={0.25} />
      </mesh>
      {/* raked windshield */}
      <mesh position={[0, 0.92, -1.5]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[1.62, 0.7, 0.08]} />
        <meshStandardMaterial color={GLASS} metalness={0.2} roughness={0.25} />
      </mesh>
      {/* fastback rear glass */}
      <mesh position={[0, 0.92, 1.55]} rotation={[0.7, 0, 0]}>
        <boxGeometry args={[1.6, 0.8, 0.08]} />
        <meshStandardMaterial color={GLASS} metalness={0.2} roughness={0.25} />
      </mesh>
      {/* continuous rear light bar */}
      <mesh position={[0, 0.66, 2.34]}>
        <boxGeometry args={[1.7, 0.08, 0.04]} />
        <meshStandardMaterial color="#c0392b" emissive="#a02a20" emissiveIntensity={0.6} />
      </mesh>
      {/* slim headlights — sit just proud of the nose so they don't z-fight */}
      <mesh position={[0, 0.56, -2.47]}>
        <boxGeometry args={[1.55, 0.07, 0.04]} />
        <meshStandardMaterial color="#dfe4ea" emissive="#cfd6dd" emissiveIntensity={0.3} />
      </mesh>
      {/* flush low-profile wheels with a hubcap */}
      {wheels.map(([x, z], i) => (
        <group key={i} position={[x, 0.37, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.37, 0.37, 0.22, 18]} />
            <meshStandardMaterial color={TIRE} />
          </mesh>
          <mesh position={[x > 0 ? 0.12 : -0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 14]} />
            <meshStandardMaterial color={HUB} metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* crash damage — front crumple, hood dent, dead headlight, roof crease */}
      {dmg >= 1 && (
        <mesh position={[0, 0.46, -2.2 + dmg * 0.08]} rotation={[0.12 * dmg, 0.05 * dmg, 0.04 * dmg]}>
          <boxGeometry args={[1.7 - dmg * 0.12, 0.42, 0.5 + dmg * 0.16]} />
          <meshStandardMaterial color="#33343a" />
        </mesh>
      )}
      {dmg >= 2 && (
        <mesh position={[0.5, 0.84, -1.3]} rotation={[0, 0, 0.22]}>
          <boxGeometry args={[0.6, 0.1, 0.9]} />
          <meshStandardMaterial color="#7c7a78" />
        </mesh>
      )}
      {dmg >= 2 && (
        <mesh position={[-0.55, 0.56, -2.42]}>
          <boxGeometry args={[0.55, 0.09, 0.06]} />
          <meshStandardMaterial color="#2a2b2e" />
        </mesh>
      )}
      {dmg >= 3 && (
        <mesh position={[-0.4, 0.86, 0.2]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.5, 0.1, 1.2]} />
          <meshStandardMaterial color="#76746f" />
        </mesh>
      )}
    </group>
  )
}

// Cheap fake shadow so the car doesn't float — avoids a real shadow pass over
// a 400 m world (which would be low-res and expensive for a graybox).
function BlobShadow() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.7, 24]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.22} />
    </mesh>
  )
}
