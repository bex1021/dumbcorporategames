// The arena + two fighter RIGS + the beating heart: a FIXED 60 Hz stepper.
// useFrame accumulates real time and advances the sim in whole 1/60 s ticks so
// the fight is frame-deterministic regardless of display refresh.
//
// Fighters are graybox (capsule torso + head + two articulated arms + two legs;
// real art is Build E), but the WHOLE BODY commits to each move so it's legible
// while you play: a jab leans in and punches, a heavy winds back over the
// shoulder then lunges through, a throw reaches with both hands, a block braces
// and raises its guard, a hit snaps the head and torso back. Limbs are a dark
// contrasting colour; the torso/head carry the state colour. Poses lerp for snap.

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ARENA, BODY, FRAME, COLORS } from './fightConfig'
import { leonard, opponent, fight, stepFight, setFightEventHandler, renderX, renderY, type Fighter } from './fighterState'
import { readLeonardIntent, disposeFightInput, initFightInput } from './fightInput'
import { readDummyIntent, resetDummy } from './dummyAI'
import { playFightCue, disposeFightAudio, audioDebug, measurePeak } from './fightAudio'
import { currentBout } from './boutState'
import { EngineeringStage } from './stages/EngineeringStage'
import { ProductStage } from './stages/ProductStage'
import { BoardroomStage } from './stages/BoardroomStage'

// bout → stage set. Design doc: Brent = GitHub-dark tron grid, Priya = the
// bright Jira/Figma studio, Exec = corner office at golden hour.
const STAGE_SETS: Record<string, React.FC> = {
  brent: EngineeringStage,
  priya: ProductStage,
  exec: BoardroomStage,
}
import { AnimatedFighter } from './AnimatedFighter'
import { Suspense } from 'react'

// Toggle: real Mixamo characters (Build E) vs the proven capsule graybox.
// Flip to false to fall straight back to capsules if a model misbehaves.
const USE_MODELS = true
const OPP_BODY: Record<string, string> = {
  brent: '/models/Male1_idle.glb',
  priya: '/models/Female1_idle.glb',
  exec: '/models/_mixamo_glb/exec_body.glb',
}

// Proportions (all local to the hip pivot at HIP_Y).
const HIP_Y = 0.82
const LEG_LEN = 0.82
const TORSO_LEN = 0.5 // cylinder part of the torso capsule
const TORSO_R = 0.36
const TORSO_CY = 0.36 // torso capsule centre above the hip
const HEAD_Y = 0.82 // head centre above the hip (→ world ~1.64)
const HEAD_R = 0.17
const SHOULDER_Y = 0.58 // shoulder height above the hip
const ARM_Z = 0.19
const LEG_Z = 0.14
const UPPER = 0.32
const FORE = 0.34
const LIMB_R = 0.085
const LEG_R = 0.1
const ARM_COLOR = '#241f18' // dark limbs, always contrast the body tint

type Rig = {
  group: THREE.Group | null
  torso: THREE.Group | null // leans; carries torso mesh + head + arms
  bodyMesh: THREE.Mesh | null
  head: THREE.Mesh | null
  shF: THREE.Group | null
  elF: THREE.Group | null
  shB: THREE.Group | null
  elB: THREE.Group | null
  hipF: THREE.Group | null
  hipB: THREE.Group | null
}
const emptyRig = (): Rig => ({
  group: null, torso: null, bodyMesh: null, head: null,
  shF: null, elF: null, shB: null, elB: null, hipF: null, hipB: null,
})

// PHOTOSENSITIVITY: the shake used to re-roll Math.random() once per RENDERED
// frame, so the entire world (floor, wall, both fighters, shadows) jumped to a
// new uncorrelated offset at DISPLAY refresh rate — 120Hz on a ProMotion Mac —
// with the character animation frozen behind it during hitstop. A decaying sine
// is continuous, frame-rate independent and bounded: consecutive frames differ
// by a small increment, so the eye reads a thud instead of a flicker.
const SHAKE_HZ_X = 11
const SHAKE_HZ_Y = 7
const SHAKE_MAX = 0.05 // hard ceiling on world displacement, metres
const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

export function FightWorld({
  keyLight = 1.5,
  boutKey,
  oppScale = 1,
}: {
  keyLight?: number
  // Passed in rather than read from currentBout(): gauntlet.index advances the
  // instant a bout is recorded, so reading it here would silently swap the
  // opponent's body/scale mid-transition, before the arena is meant to change.
  boutKey: string
  oppScale?: number
}) {
  const StageSet = STAGE_SETS[boutKey]
  const shakeGroup = useRef<THREE.Group>(null)
  const shakeT = useRef(0)
  const leoRig = useRef<Rig>(emptyRig())
  const oppRig = useRef<Rig>(emptyRig())
  const leoTag = useRef<THREE.Group>(null)
  const oppTag = useRef<THREE.Group>(null)
  const acc = useRef(0)

  const [leoSay, setLeoSay] = useState('')
  const [oppSay, setOppSay] = useState('')
  const leoSayRef = useRef('')
  const oppSayRef = useRef('')

  useEffect(() => {
    initFightInput()
    resetDummy()
    setFightEventHandler(playFightCue) // sim events → synth cues (browser only)
    if (import.meta.env.DEV) {
      ;(window as unknown as { __audio?: unknown }).__audio = { playFightCue, audioDebug, measurePeak }
    }
    return () => {
      disposeFightInput()
      setFightEventHandler(null)
      disposeFightAudio()
    }
  }, [])

  useFrame((_, delta) => {
    acc.current += Math.min(delta, 0.1)
    let steps = 0
    while (acc.current >= FRAME && steps < 5) {
      stepFight(readLeonardIntent(), readDummyIntent())
      acc.current -= FRAME
      steps++
    }
    // leftover → render blend. Pinned to 1 while the world is frozen: a second,
    // independent guard against the KO strobe (see the snapshot note in
    // stepFight). If alpha can't vary, no frame-to-frame blend can occur.
    fight.alpha = fight.hitstop > 0 || fight.over ? 1 : Math.min(1, acc.current / FRAME)
    if (!USE_MODELS) {
      applyFighter(leoRig.current, leonard)
      applyFighter(oppRig.current, opponent)
    }
    syncTag(leoTag.current, leonard, 1.05, leoSayRef, setLeoSay)
    syncTag(oppTag.current, opponent, 0.15, oppSayRef, setOppSay)

    if (shakeGroup.current) {
      shakeT.current += delta
      // Dead still from the instant the result card can appear, and fully
      // opt-out-able at the OS level (Reduce Motion).
      const amp = REDUCED_MOTION || (fight.over && fight.hitstop <= 0) ? 0 : Math.min(fight.shake, SHAKE_MAX)
      const t = shakeT.current
      shakeGroup.current.position.x = amp ? Math.sin(t * Math.PI * 2 * SHAKE_HZ_X) * amp : 0
      shakeGroup.current.position.y = amp ? Math.sin(t * Math.PI * 2 * SHAKE_HZ_Y) * amp * 0.6 : 0
    }
  })

// ── HIT SPARK ───────────────────────────────────────────────────────────────
// The genre's answer to interpenetration: there is no physics stopping a
// sweeping leg from crossing the victim's torso volume for a few frames, so a
// burst of light OWNS the contact point and the eye reads "impact" instead of
// "clip-through". One-shot per connect, ~8 frames, scale-out fade.
// PHOTOSENSITIVITY: small, local, fires once per hit (player-caused rhythm
// only), no loop, no full-screen luminance change.
function HitSpark() {
  const group = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const life = useRef(0)
  const lastSeen = useRef<typeof fight.lastHit>(null)
  useFrame(() => {
    if (fight.lastHit && fight.lastHit !== lastSeen.current) {
      lastSeen.current = fight.lastHit
      if (fight.lastHit.kind !== 'counter') {
        life.current = 8
        const att = fight.lastHit.by === 'leonard' ? leonard : opponent
        const def = fight.lastHit.by === 'leonard' ? opponent : leonard
        if (group.current) {
          // between the two bodies, at chest height, biased toward the victim
          group.current.position.set(
            renderX(def) * 0.65 + renderX(att) * 0.35,
            BODY.height * 0.62 + renderY(def),
            0.15,
          )
          group.current.rotation.z = ((renderX(att) * 997) % 1) * Math.PI // deterministic variety
        }
      }
    }
    if (!group.current || !mat.current) return
    if (life.current > 0) {
      // freeze with the world during hitstop — the spark holds on the impact
      if (fight.hitstop <= 0) life.current--
      const t = life.current / 8
      group.current.visible = true
      group.current.scale.setScalar(0.55 + (1 - t) * 0.5)
      mat.current.opacity = 0.85 * t
    } else {
      group.current.visible = false
    }
  })
  return (
    <group ref={group} visible={false}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
          <planeGeometry args={[0.62, 0.07]} />
          <meshBasicMaterial
            ref={i === 0 ? mat : undefined}
            color="#fff3d0"
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

  return (
    <group ref={shakeGroup}>
      {/* AMBIENT IS OWNED BY THE STAGE. This global fill used to STACK with each
          stage's own ambient (0.55 + 0.34 = 0.89), acting as a brightness
          elevator that flattened the rim-light separation into grey mush —
          ambient should tint, never lift. Only the fallback set uses it. */}
      {!StageSet && <ambientLight intensity={0.55} />}
      {/* per-bout key light: golden hour → narrowing blinds → the dark dolly-in */}
      <directionalLight position={[4, 8, 6]} intensity={keyLight} color="#ffe6b0" castShadow shadow-mapSize={[1024, 1024]} />
      {!StageSet && <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#8fa6c0" />}
      <HitSpark />

      {/* Per-bout stage SET (stages/*): each provides its own floor + backdrop.
          The plain planes below remain the fallback for unknown keys. */}
      {StageSet ? (
        <StageSet />
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[ARENA.halfWidth * 2 + 4, 8]} />
            <meshStandardMaterial color={COLORS.floor} />
          </mesh>
          <mesh position={[0, 2, -2.2]} receiveShadow>
            <planeGeometry args={[ARENA.halfWidth * 2 + 4, 5]} />
            <meshStandardMaterial color={COLORS.wall} />
          </mesh>
        </>
      )}

      {USE_MODELS ? (
        <Suspense fallback={null}>
          <AnimatedFighter bodyUrl="/models/Player_Idle.glb" fighter={leonard} foe={opponent} />
          <AnimatedFighter
            bodyUrl={OPP_BODY[boutKey] ?? '/models/Male1_idle.glb'}
            fighter={opponent}
            foe={leonard}
            baseScale={oppScale}
          />
        </Suspense>
      ) : (
        <>
          <FighterRig rig={leoRig} />
          <FighterRig rig={oppRig} />
        </>
      )}

      <group ref={leoTag}>{leoSay && <Callout text={leoSay} tint={COLORS.leonard} />}</group>
      <group ref={oppTag}>{oppSay && <Callout text={oppSay} tint={COLORS.opponent} />}</group>
    </group>
  )
}

function Arm({ shoulderRef, elbowRef, z }: { shoulderRef: (g: THREE.Group | null) => void; elbowRef: (g: THREE.Group | null) => void; z: number }) {
  return (
    <group ref={shoulderRef} position={[0, SHOULDER_Y, z]}>
      <mesh position={[UPPER / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <capsuleGeometry args={[LIMB_R, UPPER, 4, 8]} />
        <meshStandardMaterial color={ARM_COLOR} />
      </mesh>
      <group ref={elbowRef} position={[UPPER, 0, 0]}>
        <mesh position={[FORE / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <capsuleGeometry args={[LIMB_R, FORE, 4, 8]} />
          <meshStandardMaterial color={ARM_COLOR} />
        </mesh>
        <mesh position={[FORE, 0, 0]} castShadow>
          <sphereGeometry args={[LIMB_R * 1.4, 10, 10]} />
          <meshStandardMaterial color={ARM_COLOR} />
        </mesh>
      </group>
    </group>
  )
}

function Leg({ hipRef, z }: { hipRef: (g: THREE.Group | null) => void; z: number }) {
  return (
    <group ref={hipRef} position={[0, HIP_Y, z]}>
      <mesh position={[0, -LEG_LEN / 2, 0]} castShadow>
        <capsuleGeometry args={[LEG_R, LEG_LEN - LEG_R, 4, 8]} />
        <meshStandardMaterial color={ARM_COLOR} />
      </mesh>
      {/* foot */}
      <mesh position={[0.09, -LEG_LEN + 0.03, 0]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.18]} />
        <meshStandardMaterial color={ARM_COLOR} />
      </mesh>
    </group>
  )
}

function FighterRig({ rig }: { rig: React.RefObject<Rig> }) {
  return (
    <group ref={(g) => { rig.current.group = g }}>
      {/* legs stay planted on the outer group (they don't lean with the torso) */}
      <Leg z={LEG_Z} hipRef={(g) => { rig.current.hipF = g }} />
      <Leg z={-LEG_Z} hipRef={(g) => { rig.current.hipB = g }} />
      {/* torso pivots at the hip → leaning tips the upper body + head + arms */}
      <group ref={(g) => { rig.current.torso = g }} position={[0, HIP_Y, 0]}>
        <mesh ref={(m) => { rig.current.bodyMesh = m }} position={[0, TORSO_CY, 0]} castShadow>
          <capsuleGeometry args={[TORSO_R, TORSO_LEN, 6, 14]} />
          <meshStandardMaterial />
        </mesh>
        <mesh ref={(m) => { rig.current.head = m }} position={[0, HEAD_Y, 0]} castShadow>
          <sphereGeometry args={[HEAD_R, 14, 14]} />
          <meshStandardMaterial />
        </mesh>
        <Arm z={ARM_Z} shoulderRef={(g) => { rig.current.shF = g }} elbowRef={(g) => { rig.current.elF = g }} />
        <Arm z={-ARM_Z} shoulderRef={(g) => { rig.current.shB = g }} elbowRef={(g) => { rig.current.elB = g }} />
      </group>
    </group>
  )
}

function Callout({ text, tint }: { text: string; tint: string }) {
  return (
    // distanceFactor scales the bubble with camera distance. It was 9, tuned
    // when the camera sat much further back; after the close-quarters rescale
    // the same value rendered the bubbles enormous.
    <Html center distanceFactor={3.6} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      {/* Speech, not terminal output. The mono font + hard border read as a
          code editor, which is exactly the "vibe-coded" look we're avoiding —
          this matches the Slack/Alignly chrome used everywhere else in the
          game: system sans, white bubble, soft shadow, a tail, and only a thin
          tinted spine to say who is talking. */}
      <div style={{ position: 'relative', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.28))' }}>
        <div
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Arial, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.35,
            letterSpacing: '0.005em',
            whiteSpace: 'nowrap',
            color: '#172b4d',
            background: '#ffffff',
            borderLeft: `3px solid ${tint}`,
            borderRadius: 10,
            padding: '7px 13px 7px 11px',
          }}
        >
          {text}
        </div>
        {/* tail — anchors the line to the speaker */}
        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: -5,
            width: 10,
            height: 10,
            background: '#ffffff',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }}
        />
      </div>
    </Html>
  )
}

function syncTag(tag: THREE.Group | null, f: Fighter, yOffset: number, ref: React.RefObject<string>, set: (s: string) => void): void {
  if (!tag) return
  // Scale with the speaker — on the Exec a fixed height put the bubble at his
  // chest instead of over his head.
  tag.position.set(f.x, BODY.height * f.heightScale + yOffset, 0)
  const say = f.calloutT > 0 ? f.callout : ''
  if (say !== ref.current) {
    ref.current = say
    set(say)
  }
}

function applyFighter(rig: Rig, f: Fighter): void {
  const { group, torso, bodyMesh, head, shF, elF, shB, elB, hipF, hipB } = rig
  if (!group || !torso || !bodyMesh || !head || !shF || !elF || !shB || !elB || !hipF || !hipB) return

  group.rotation.y = f.facing === 1 ? 0 : Math.PI
  // Boss size: the Exec looms larger-than-life. Scales from the feet (rig built
  // upward from y=0), so he just gets taller and broader — final-boss energy.
  group.scale.setScalar(f.id === 'opponent' ? currentBout().oppScale : 1)
  // A THROW visibly lunges further than a strike — even a whiff reads as a big
  // reach-and-grab-at-air, so pressing L always looks like *something*.
  const isThrow = f.move?.kind === 'throw'
  const lunge =
    f.state === 'active' ? (isThrow ? 0.5 : 0.22) : f.state === 'startup' ? (isThrow ? 0.22 : 0.06) : 0
  group.position.x = f.x + f.facing * lunge
  // Height: jump lifts the whole rig by f.y; knockdown drops it.
  group.position.y = f.airborne ? f.y : f.state === 'knockdown' ? -0.35 : 0

  // Colour the torso + head with the state colour; limbs stay dark.
  const c = colorFor(f)
  const bodyMat = bodyMesh.material as THREE.MeshStandardMaterial
  const headMat = head.material as THREE.MeshStandardMaterial
  bodyMat.color.set(c)
  headMat.color.set(c)
  const glow = f.state === 'startup' || f.state === 'active'
  bodyMat.emissive.set(glow ? c : '#000000')
  bodyMat.emissiveIntensity = f.state === 'startup' ? 0.5 : f.state === 'active' ? 0.32 : 0
  headMat.emissive.copy(bodyMat.emissive)
  headMat.emissiveIntensity = bodyMat.emissiveIntensity

  // Snap harder into an active hit than when settling back — gives weight.
  const L = f.state === 'active' ? 0.6 : 0.4
  const p = pose(f)
  torso.rotation.z += (p.lean - torso.rotation.z) * L
  shF.rotation.z += (p.shF - shF.rotation.z) * L
  elF.rotation.z += (p.elF - elF.rotation.z) * L
  shB.rotation.z += (p.shB - shB.rotation.z) * L
  elB.rotation.z += (p.elB - elB.rotation.z) * L
  hipF.rotation.z += (p.hipF - hipF.rotation.z) * (L * 0.8)
  hipB.rotation.z += (p.hipB - hipB.rotation.z) * (L * 0.8)
}

// Whole-body pose per state/move. lean<0 tips the torso FORWARD toward the
// opponent; hip>0 swings that foot forward. Arm angles as before (z=0 forward).
type Pose = { lean: number; shF: number; elF: number; shB: number; elB: number; hipF: number; hipB: number }

function pose(f: Fighter): Pose {
  const k = f.move?.kind
  const heavy = f.move?.heavy
  // AIR: a jump-in slams the fist DOWN from overhead; a plain hop tucks the knees.
  if (f.airborne) {
    if (f.move?.air && (f.state === 'startup' || f.state === 'active')) {
      return { lean: -0.3, shF: 2.4, elF: -0.2, shB: -0.6, elB: -0.5, hipF: 0.5, hipB: 0.35 } // overhead strike, tucked
    }
    return { lean: 0.05, shF: -0.6, elF: -1.7, shB: -0.6, elB: -1.7, hipF: 0.7, hipB: 0.5 } // tuck (knees up)
  }
  switch (f.state) {
    case 'startup':
      if (k === 'throw') return { lean: -0.06, shF: -0.4, elF: -1.0, shB: -0.4, elB: -1.0, hipF: 0.2, hipB: -0.16 }
      if (k === 'counter') return { lean: 0.05, shF: 0.7, elF: 0.2, shB: -2.2, elB: 0.2, hipF: 0.14, hipB: -0.18 }
      if (heavy) return { lean: 0.16, shF: 1.9, elF: -1.7, shB: -1.1, elB: -0.3, hipF: 0.1, hipB: -0.28 } // wind BACK
      return { lean: -0.04, shF: -0.35, elF: -1.6, shB: -1.1, elB: -0.4, hipF: 0.2, hipB: -0.15 } // jab cock
    case 'active':
      if (k === 'throw') return { lean: -0.16, shF: 0.05, elF: -0.5, shB: 0.05, elB: -0.5, hipF: 0.34, hipB: -0.24 }
      if (k === 'counter') return { lean: 0.05, shF: 0.7, elF: 0.2, shB: -2.2, elB: 0.2, hipF: 0.14, hipB: -0.18 }
      if (k === 'special') return { lean: -0.14, shF: 0.1, elF: 0.0, shB: 0.1, elB: 0.0, hipF: 0.3, hipB: -0.22 }
      if (heavy) return { lean: -0.28, shF: 0.15, elF: -0.05, shB: -1.05, elB: -0.3, hipF: 0.4, hipB: -0.3 } // LUNGE through
      return { lean: -0.18, shF: 0.0, elF: 0.0, shB: -1.05, elB: -0.4, hipF: 0.32, hipB: -0.22 } // jab out
    case 'recovery':
      return { lean: -0.02, shF: -0.5, elF: -1.0, shB: -1.15, elB: -0.4, hipF: 0.18, hipB: -0.16 }
    case 'blockstun':
      return { lean: 0.14, shF: 0.5, elF: -1.9, shB: 0.6, elB: -1.9, hipF: 0.12, hipB: -0.24 }
    case 'hitstun':
      return { lean: 0.34, shF: -2.2, elF: -0.6, shB: 2.0, elB: -0.6, hipF: -0.06, hipB: -0.3 } // snap back
    case 'knockdown':
      return { lean: 0.9, shF: -2.4, elF: 0.2, shB: 2.4, elB: 0.2, hipF: 0.5, hipB: 0.3 } // sprawled
    case 'dash':
      return { lean: 0.22, shF: 0.4, elF: -1.6, shB: 0.5, elB: -1.6, hipF: -0.05, hipB: -0.28 } // lean away, guard up
    default:
      if (f.blocking) return { lean: 0.12, shF: 0.5, elF: -1.9, shB: 0.6, elB: -1.9, hipF: 0.12, hipB: -0.24 } // GUARD
      return { lean: 0, shF: -1.25, elF: -0.35, shB: -1.3, elB: -0.35, hipF: 0.18, hipB: -0.15 } // stance
  }
}

function colorFor(f: Fighter): string {
  if (f.flash > 0 && (f.state === 'hitstun' || f.state === 'knockdown')) return COLORS.hurt
  const kind = f.move?.kind
  if (f.state === 'startup' || f.state === 'active') {
    if (kind === 'counter') return COLORS.counter
    if (kind === 'throw') return COLORS.throw
    if (kind === 'special') return COLORS.special
    if (f.state === 'startup') return COLORS.startup
    return COLORS.active
  }
  if (f.blocking || f.state === 'blockstun') return COLORS.block
  return f.id === 'leonard' ? COLORS.leonard : COLORS.opponent
}
