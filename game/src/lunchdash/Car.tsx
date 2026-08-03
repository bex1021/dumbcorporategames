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

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { useKeyboard, type KeyMap } from '../hooks/useKeyboard'
import { DRIVE, DRIVE_WORLD, AIR, RIVER } from './driveConfig'
import { carPosition, carFacing, carTelemetry, carAir } from './carState'
import { resolveCarCollision, SPAWN, PARADE, inWater } from './cityLayout'
import { river, riverHasControl, updateRiver, beginDunk } from './riverState'
import { boundary } from './boundaryState'
import { crash, damageTier, type DamageTier } from './crashState'
import { bowl, sloshBowl } from './bowlState'
import { resolveTrafficCollision } from './trafficState'
import { useLunchStore } from './lunchStore'
import { terrainHeight, rampHeight, rampAt } from './terrain'
import { updateEngine, engineOff, screech, crashHit, setParadeMix, playerHonk, toggleRadio } from './driveAudio'

// Stand-in for the key map while the river has the car — every control reads
// as released, so the sink can't be steered or throttled out of.
const NO_KEYS: KeyMap = { forward: false, back: false, left: false, right: false }

export function Car() {
  const ref = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const shadowRef = useRef<Group>(null)
  // Suspension spring: `y` is the body's vertical offset (compression, m) and
  // `v` its velocity. It settles back to 0 with a stiff spring + damping, so the
  // car dips on hard landings and rebounds instead of snapping to the ground.
  const susp = useRef({ y: 0, v: 0 })
  // the four wheel groups (front pair first), animated in the frame loop below
  const wheelRefs = useRef<(Group | null)[]>([])
  const wheelSpin = useRef(0)
  const wheelSteer = useRef(0)
  const keys = useKeyboard()
  const [tier, setTier] = useState<DamageTier>('pristine')
  const tierRef = useRef<DamageTier>('pristine')

  // Space = honk, Q = toggle the car radio. Both sit right under the left hand
  // that's already on WASD (Space is the thumb, Q the pinky) — far comfier mid-
  // drive than the old H/R reach. Taps, not holds. Engine winds down on unmount.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Space') { e.preventDefault(); playerHonk() }
      else if (e.code === 'KeyQ') toggleRadio()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      engineOff()
    }
  }, [])

  // the car casts a real shadow — re-applied when damage swaps the body meshes
  useEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = true
    })
  }, [tier])

  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    // Floor dt at a tiny positive value: R3F's delta can be 0 on the first frame,
    // and a 0 would make `accel = (speed-before)/dt` compute 0/0 = NaN, which
    // poisons the suspension spring and renders the car body at "nowhere"
    // (invisible) forever. (This was the "where's my car" bug.)
    const dt = Math.max(1e-4, Math.min(delta, 0.05)) // clamp big frames (tab refocus) + never 0

    // --- river: while you're in the water the car is not yours ---
    // Sinking, being fished out and dropped back on the road all run here; the
    // controls go dead for the duration (there is no other input-suppression
    // path in this loop, so the key map is simply blanked).
    const riverLocked = riverHasControl()
    if (riverLocked) updateRiver(dt)
    const k = riverLocked ? NO_KEYS : keys.current

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
    // While the river has the car, updateRiver owns its speed (water drag) —
    // don't also apply engine coasting on top of it.
    if (!riverLocked) {
      const approach = 1 - Math.exp(-rate * dt)
      carTelemetry.speed += (target - carTelemetry.speed) * approach
      if (!k.forward && !k.back && Math.abs(carTelemetry.speed) < DRIVE.stopEps) {
        carTelemetry.speed = 0
      }
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
    // Pass how high we are OVER THE GROUND, so anything shorter than that is
    // flown over instead of hit. Without this the barricades were invisible
    // walls at any altitude and a jump could never clear them.
    const aboveGround = Math.max(0, carAir.y - terrainHeight(ix, iz))
    const col = resolveCarCollision(ix, iz, DRIVE.carRadius, aboveGround)
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
          crashHit(Math.min(1, (impact / 25) * intoWall))
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
    // pass the player's world velocity so the struck car can take momentum off
    // us (see the transfer block in resolveTrafficCollision)
    const tcol = resolveTrafficCollision(
      carPosition.x,
      carPosition.z,
      1.1,
      fwdX * carTelemetry.speed,
      fwdZ * carTelemetry.speed,
    )
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
          // You SHOVE a car — you don't bounce off it. Momentum went into the
          // other car (see resolveTrafficCollision), so we bleed speed rather
          // than reversing: at a hard hit you keep roughly a third of it and
          // barge through, which is what makes the impact read as mass meeting
          // mass instead of masonry.
          carTelemetry.speed = moveSign * impact * Math.max(0.18, 0.45 - intoCar * 0.22)
          crash.severity += (impact / 45) * intoCar // lighter than a wall
          crash.shake = Math.min(1, impact / 26)
          crashHit(Math.min(1, (impact / 30) * intoCar) * 0.8) // cars give a little
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

    // --- into the drink? ---
    // The water is no longer a wall, so crossing the bank actually puts you in
    // the river. Everything that follows (sinking, the tow, the time penalty)
    // is handled by updateRiver above on subsequent frames.
    if (!riverLocked && inWater(carPosition.x, carPosition.z)) beginDunk()

    // soft countryside boundary — warn far out, snap back to HQ past the limit
    const distFromCenter = Math.hypot(carPosition.x, carPosition.z)
    if (distFromCenter > DRIVE_WORLD.returnRadius) {
      const spawnY = terrainHeight(SPAWN.x, SPAWN.z)
      carPosition.set(SPAWN.x, 0, SPAWN.z)
      carFacing.y = 0
      carTelemetry.speed = 0
      carAir.y = spawnY
      carAir.vy = 0
      carAir.airborne = false
      carAir.prevGh = spawnY
      carAir.climb = 0
      boundary.zone = 'in'
      boundary.returnPulse++
    } else {
      boundary.zone = distFromCenter > DRIVE_WORLD.warnRadius ? 'warning' : 'in'
    }

    // --- vertical: catch air over crests, fall under gravity, land with a thud ---
    const gh = terrainHeight(carPosition.x, carPosition.z) // ground height under the car
    if (riverLocked) {
      // Going under. The riverbed is painted flat ground, so the sink is faked
      // by riding the body below the waterline. Air state is pinned clear the
      // whole time so surfacing never reads as a launch.
      carAir.y = gh - RIVER.sinkDepth * river.submersion
      carAir.vy = 0
      carAir.airborne = false
      carAir.prevGh = gh
      carAir.climb = 0
    } else if (carAir.airborne) {
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
        // …and refuse to launch again for a moment, scaled by how hard we hit.
        // This is what makes a failed jump a FAILURE: you come down short, the
        // car is planted, and the next ramp just gets driven over.
        // Tuned DOWN from 0.25 + impact*0.045. That was ~1 s after a big jump —
        // 24 m at speed — which meant a FAST first hop landed closer to the
        // float and was then still locked out when it got there. Faster must
        // never be worse. 0.4 s is enough to stop an accidental re-launch while
        // leaving the designed truck→float chain comfortably makeable, and the
        // kickers can't catapult you by accident anyway: their back face is a
        // wall, not a slope.
        carAir.settle = Math.max(carAir.settle, 0.12 + Math.min(impact, 16) * 0.018)
        if (impact > AIR.hardLanding) {
          crash.shake = Math.max(crash.shake, Math.min(1, impact / 14)) // landing jolt
          crashHit(Math.min(1, (impact - AIR.hardLanding) / 12) * 0.7) // suspension slam
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
      const fell = carAir.prevGh - gh
      if (carAir.settle > 0) carAir.settle = Math.max(0, carAir.settle - dt)
      carAir.climb = Math.max(vGround, carAir.climb)

      // Launch only if going FAST, after a STEEP climb, right at the CREST.
      // On an authored ramp the gates relax and the boost goes up, so a kicker
      // actually sends you; ordinary hill grade stays a gentle lift, which
      // keeps incidental terrain from repeatedly jolting the bowl.
      const onRamp = rampHeight(carPosition.x, carPosition.z) > 0.15
      // A ramp may set its OWN launch gate (see Ramp.minSpeed) — the parade pair
      // does, so failing the jump is failing to reach the speed.
      const ramp = onRamp ? rampAt(carPosition.x, carPosition.z) : null
      if (onRamp) {
        carAir.rampGate = ramp?.minSpeed ?? AIR.rampMinSpeed
        carAir.rampGateT = 0.25 // hold it briefly past the footprint edge
      } else if (carAir.rampGateT > 0) {
        carAir.rampGateT = Math.max(0, carAir.rampGateT - dt)
      }
      // Treat "just left a ramp" as still on it, so the lip uses the ramp's own
      // gate and boost rather than the gentle natural-hill defaults.
      const fromRamp = onRamp || carAir.rampGateT > 0
      const minSpeed = fromRamp ? (onRamp ? (ramp?.minSpeed ?? AIR.rampMinSpeed) : carAir.rampGate) : AIR.minSpeed
      const launchMin = fromRamp ? AIR.rampLaunchMin : AIR.launchMin
      const boost = fromRamp ? AIR.rampBoost : AIR.crestBoost
      const fastEnough = Math.abs(carTelemetry.speed) >= minSpeed
      const settled = carAir.settle <= 0

      // ORDER MATTERS. The launch test has to come BEFORE the fell-off-an-edge
      // test, because on a kicker they fire on the very same frame: the lip IS
      // the edge. Checking the edge first turned every ramp into a limp drop
      // off the end instead of a jump.
      if (settled && fastEnough && carAir.climb > launchMin && vGround < carAir.climb * AIR.crestRatio) {
        carAir.airborne = true
        carAir.vy = carAir.climb * boost
        carAir.climb = 0
      } else if (fell > 0.35) {
        // No launch, but the ground has dropped out from under us — fall off it
        // properly instead of teleporting down, which read as falling THROUGH
        // the ramp. This is the failed-jump case.
        carAir.airborne = true
        carAir.y = carAir.prevGh
        carAir.vy = 0
        carAir.climb = 0
      } else {
        carAir.y = gh
        if (vGround <= 0.05) carAir.climb = 0 // back on the flat — forget the climb
      }
    }
    carAir.prevGh = gh

    // write transform — Y is the air-aware height (terrain when grounded, up on
    // a jump), lifted onto the ROAD SURFACE (ribbons draw at terrain + 0.08;
    // planting the car at raw terrain kept its tyres 8 cm deep in the asphalt).
    // Render-only: physics (carAir) stays on the analytic terrain.
    g.position.set(carPosition.x, carAir.y + 0.08, carPosition.z)
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
      // hard guard: a stray NaN here would hide the whole car body. Never let it.
      if (!Number.isFinite(sp.y)) { sp.y = 0; sp.v = 0 }
      body.position.y = sp.y

      if (riverLocked) {
        // going under nose-first, with a slow list to one side — reads as the
        // car settling into the water rather than descending through the floor
        body.rotation.set(0.30 * river.submersion, 0, 0.16 * river.submersion)
      } else if (carAir.airborne) {
        // mid-jump: pitch the body to the flight path — nose up rising, dropping on the way down
        const horiz = Math.max(Math.abs(carTelemetry.speed), 3)
        body.rotation.set(Math.atan2(carAir.vy, horiz), 0, steerRoll)
      } else {
        body.rotation.set(accelPitch + slopePitch, 0, steerRoll + slopeRoll)
      }

      // ── wheels: roll with distance travelled, front pair turns with steering ──
      // Rolling is driven by distance (speed × dt ÷ radius), not by a fixed
      // rate, so the wheels stop dead when the car does and creep when it
      // creeps. Static wheels are the single loudest "nothing is actually
      // moving" tell in a driving game.
      wheelSpin.current += (carTelemetry.speed * dt) / 0.37
      if (wheelSpin.current > Math.PI * 2) wheelSpin.current -= Math.PI * 2
      else if (wheelSpin.current < 0) wheelSpin.current += Math.PI * 2
      // ease toward the commanded angle so the wheels don't snap between locks
      const steerTarget = -steer * 0.42 * (0.35 + 0.65 * ramp)
      wheelSteer.current += (steerTarget - wheelSteer.current) * (1 - Math.exp(-14 * dt))
      for (let i = 0; i < 4; i++) {
        const w = wheelRefs.current[i]
        if (!w) continue
        w.rotation.y = i < 2 ? wheelSteer.current : 0 // only the front pair steers
        w.rotation.x = wheelSpin.current
      }

      // tilt the fake shadow to the ground slope so it stops burying into hills,
      // and keep it pinned to the ground (shrinking) while the car is airborne.
      const sh = shadowRef.current
      if (sh) {
        sh.rotation.set(slopePitch, 0, slopeRoll)
        const lift = Math.max(0, carAir.y - gh)
        // parent group rides at carAir.y + 0.08 (road-surface lift); -0.06
        // leaves the blob 2 cm proud of the asphalt plane so neither z-fights
        sh.position.y = -lift - 0.06
        sh.scale.setScalar(Math.max(0.5, 1 - lift * 0.06))
      }
    }

    // ── audio: engine tracks throttle + speed; tires screech under hard
    //    cornering load or braking at speed; the parade bed swells nearby ──
    updateEngine(carTelemetry.speed, keys.current.forward)
    const yawRateAudio = steer * DRIVE.turnRate * ramp * taper
    const latAudio = Math.abs(carTelemetry.speed * yawRateAudio)
    if (latAudio > 14 || (keys.current.back && Math.abs(carTelemetry.speed) > 8)) {
      screech(Math.min(1, latAudio / 28))
    }
    const paradeCZ = (PARADE.z0 + PARADE.z1) / 2
    const paradeDist = Math.hypot(carPosition.x - PARADE.x, carPosition.z - paradeCZ)
    setParadeMix(Math.max(0, 1 - paradeDist / 70))
  })

  return (
    <group ref={ref}>
      <group ref={bodyRef}>
        <CarMesh tier={tier} wheelRefs={wheelRefs} />
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
function CarMesh({ tier, wheelRefs }: { tier: DamageTier; wheelRefs: RefObject<(Group | null)[]> }) {
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
        <group
          key={i}
          // YXZ so the steer angle (Y) is applied before the rolling spin (X),
          // which is what lets a turned front wheel still roll correctly
          rotation-order="YXZ"
          ref={(g) => {
            wheelRefs.current[i] = g
          }}
          position={[x, 0.37, z]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.37, 0.37, 0.22, 18]} />
            <meshStandardMaterial color={TIRE} />
          </mesh>
          <mesh position={[x > 0 ? 0.12 : -0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 14]} />
            <meshStandardMaterial color={HUB} metalness={0.4} roughness={0.4} />
          </mesh>
          {/* SPOKES. Without these the wheel is a plain cylinder with a
              concentric hubcap — perfectly rotationally symmetric, so it looks
              identical at every angle and the (correct) spin is invisible.
              Five spokes give the rotation something to read against. */}
          {[0, 1, 2, 3, 4].map((s) => (
            <mesh
              key={s}
              position={[x > 0 ? 0.14 : -0.14, 0, 0]}
              rotation={[(s * Math.PI) / 2.5, 0, Math.PI / 2]}
            >
              <boxGeometry args={[0.055, 0.03, 0.34]} />
              <meshStandardMaterial color="#e6eaee" metalness={0.45} roughness={0.35} />
            </mesh>
          ))}
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
