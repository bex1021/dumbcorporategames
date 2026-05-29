import { Suspense, useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group, Object3D, MeshStandardMaterial } from 'three'
import { NPCS, OBJECT_INTERACTIONS } from '../config/constants'
import { useGameStore, type Effects } from '../state/gameStore'
import { playerPosition } from '../state/playerState'
import { slapState } from '../state/slapState'
import { audio } from '../audio/AudioManager'
import { GLBHumanoid } from './GLBHumanoid'
import { Workstation } from './Furniture'

// Head-turn tuning: NPCs notice the player when they're within this many
// meters (squared so we can skip a sqrt). 4m² (≈ 2m radius around the desk)
// is the proximity ring used for the InteractPrompt too, but we expand to
// 4m radius (16m²) for awareness so heads turn before E-prompts appear.
const HEAD_TURN_RANGE_SQ = 16
// Max yaw a Mixamo head bone can hold before it starts to look unnatural.
// Real necks reach ~70° comfortably; clamp to 1.22 rad so the head doesn't
// rotate past believable range when player walks behind a seated NPC.
const HEAD_TURN_MAX_YAW = 1.22
// Smoothing factor per frame for head rotation toward target. Lower = lazier
// glance; higher = snappier double-take. 0.08 reads as "noticing you".
const HEAD_TURN_LERP = 0.08
// Lerp back to neutral when player leaves the proximity ring.
const HEAD_RELAX_LERP = 0.06

// When an NPC enters dialogue, they swap to the standing-idle variant of
// their base mesh (e.g., Male1_idle / Female1_idle) and rotate to face the PM.
function getStandingGlb(glb: string | null): string | null {
  if (!glb) return null
  if (glb.includes('Female')) return '/models/Female1_idle.glb'
  if (glb.includes('Male')) return '/models/Male1_idle.glb'
  return glb
}

// Orientation convention:
//   - Seated NPCs face world -Z (toward their desk against the back wall).
//     The PM enters from +Z, so PM sees their backs first.
//   - Standing NPCs (Diane in HR office) face world +Z (toward the doorway).
//   - Object NPCs (printer, plant) have no facing.
//
// GLBs are pre-processed (see scripts/merge-mixamo-glb.mjs) so:
//   - scale + Mixamo→Three.js orientation is baked into the root node
//   - clips are named "Idle" / "Walk" / "Sitting" — no more "mixamo.com"
// We pass the clip name into GLBHumanoid; everything else just works.

// Per-character sit lift. Male1 looked right visually at 0.5 (per user).
// Female1 sits at -0.03 (her animation hip is already at chair-seat level).
const SIT_LIFT_MALE = 0.5
const SIT_LIFT_FEMALE = 0.05

export function NPCs() {
  // Drei <Html> labels live in the 3D scene but render real DOM, which can
  // poke through overlay UI (intro / ending screens). We only show name
  // labels, ! indicators, and bark bubbles during active gameplay.
  const showLabels = useGameStore((s) => s.phase === 'playing')
  return (
    <group>
      {NPCS.map((npc) => (
        <NPC key={npc.id} {...npc} showLabels={showLabels} />
      ))}
      {/* Workstations rendered separately so they stay put when NPCs stand up
          and move to the side of the chair. */}
      {NPCS.filter((n) => n.pose === 'sit').map((npc) => (
        <NPCWorkstation
          key={`ws-${npc.id}`}
          id={npc.id}
          x={npc.x}
          z={npc.z}
        />
      ))}
    </group>
  )
}

function NPC({
  id,
  name,
  role,
  color,
  glb,
  x,
  z,
  pose,
  required,
  bark,
  showLabels,
}: {
  id: string
  name: string
  role: string
  color: string
  glb: string | null
  x: number
  z: number
  pose: 'sit' | 'stand' | 'object'
  required: boolean
  bark?: string
  showLabels: boolean
}) {
  // Track whether this NPC is currently being talked to. We avoid a per-frame
  // re-render by selecting only the boolean (true/false) instead of the id.
  const isTalking = useGameStore((s) => s.activeDialogue === id)

  if (pose === 'object') {
    return (
      <ObjectNPC
        id={id}
        role={role}
        color={color}
        name={name}
        x={x}
        z={z}
        bark={bark}
        showLabels={showLabels}
      />
    )
  }

  // BarkBubble defined inline below — uses isTalking to know when this NPC
  // is the recent-bark target.

  const isFemale = glb?.includes('Female') ?? false
  const isStanding = pose === 'stand' || isTalking // talking NPCs stand up

  // Sideways offset applied when a seated NPC stands up to talk — defined
  // up here so the facing-angle calc can use the *talking* world position.
  const sideOffsetX = isTalking && pose === 'sit' ? 0.7 : 0

  // Capture the angle to PM the moment dialogue opens. PM is movement-locked
  // during dialogue, so a snapshot at open-time is sufficient — no per-frame
  // tracking needed. atan2(dx, dz) gives the angle whose forward direction
  // is +Z, which matches Mixamo's character-forward after our inner-π wrapper.
  // Subtract Math.PI because the inner group already applies a π rotation,
  // so we need: outer + inner == desired world angle  →  outer = θ - π.
  const [talkingFacingY, setTalkingFacingY] = useState<number | null>(null)
  useEffect(() => {
    if (isTalking) {
      const dx = playerPosition.x - (x + sideOffsetX)
      const dz = playerPosition.z - z
      const theta = Math.atan2(dx, dz)
      setTalkingFacingY(theta - Math.PI)
    } else {
      setTalkingFacingY(null)
    }
  }, [isTalking, x, z, sideOffsetX])

  // Outer group rotation:
  //   - talking: dynamic angle so the NPC actually faces wherever PM is
  //   - always-standing (Diane): hardcoded π (she's positioned in HR with
  //     PM entering from a fixed direction)
  //   - sitting (not talking): 0, which combined with inner π puts them
  //     facing -Z toward their desk against the back wall
  const facingY =
    talkingFacingY !== null ? talkingFacingY : isStanding ? Math.PI : 0
  // No lift for standing characters — their idle bind pose places feet at y=0.
  const liftY = isTalking || pose === 'stand'
    ? 0
    : isFemale
    ? SIT_LIFT_FEMALE
    : SIT_LIFT_MALE
  const renderedGlb = isTalking ? getStandingGlb(glb) : glb

  // sideOffsetX (defined above with the facing-angle math) moves a seated
  // NPC out from behind their desk when they stand up to talk, so they're
  // beside the chair, not on top of it.

  // ---- Head-turn refs ----
  // groupRef anchors us in the scene graph so we can traverse downward into
  // GLBHumanoid's cloned skeleton to find the head bone. headRef caches it
  // once located so subsequent frames just rotate, no traversal.
  const groupRef = useRef<Group>(null)
  const headRef = useRef<Object3D | null>(null)
  // GLBs load async via Suspense. The head bone won't exist for the first
  // few frames after mount; cap traversal attempts so we don't waste cycles
  // if a particular GLB never resolves (e.g., a 404 in the wild).
  const findAttemptsRef = useRef(0)

  useFrame(() => {
    if (!groupRef.current) return

    // Lazy-find the Mixamo head bone after the cloned skinned mesh mounts.
    // Bone name in our processed GLBs is `mixamorigHead` (sometimes
    // `mixamorig9Head` depending on the source file). The trailing `Head$`
    // anchor avoids matching `mixamorigHeadTop_End`, the tiny leaf bone
    // above the head that we DON'T want to rotate.
    // Cap at 1800 frames (~30s at 60fps) so a never-resolving GLB doesn't
    // waste cycles forever, but we have a generous window for cold-cache
    // loads on a slow connection.
    if (!headRef.current && findAttemptsRef.current < 1800) {
      findAttemptsRef.current++
      groupRef.current.traverse((obj) => {
        if (!headRef.current && /^mixamorig\d*Head$/.test(obj.name)) {
          headRef.current = obj
        }
      })
      if (!headRef.current) return
    }
    if (!headRef.current) return

    // During dialogue the whole body has already been rotated by the outer
    // group to face the PM (talkingFacingY), so additional head-turn would
    // double-rotate. Relax the head back to neutral instead.
    if (isTalking) {
      headRef.current.rotation.y *= 1 - HEAD_RELAX_LERP
      return
    }

    // World position of the NPC's head pivot is approximately the outer
    // group's XZ — close enough for proximity & angle math (the head bone
    // is ~1.5m above ground, but we're only doing horizontal yaw).
    const npcX = x + sideOffsetX
    const npcZ = z
    const dx = playerPosition.x - npcX
    const dz = playerPosition.z - npcZ
    const distSq = dx * dx + dz * dz

    if (distSq > HEAD_TURN_RANGE_SQ) {
      // Player out of range — drift head back to neutral.
      headRef.current.rotation.y *= 1 - HEAD_RELAX_LERP
      return
    }

    // World-frame angle from NPC toward player, measured from +Z toward +X
    // (matches the convention used by talkingFacingY math above).
    const playerAngleWorld = Math.atan2(dx, dz)
    // The body's world-facing direction is outer rotation + the inner-group
    // π wrapper that flips Mixamo's default -Z forward into +Z.
    const bodyWorldFacing = facingY + Math.PI
    // Desired head yaw, relative to the body's forward.
    let yaw = playerAngleWorld - bodyWorldFacing
    // Wrap into [-π, π] so the head takes the shorter rotational path.
    while (yaw > Math.PI) yaw -= Math.PI * 2
    while (yaw < -Math.PI) yaw += Math.PI * 2
    // Clamp so heads can't twist 180° to track a player behind them — they
    // hold a maxed-out side-glance instead, which reads as "I noticed you
    // and I'm too jaded to fully turn around."
    const clamped = Math.max(-HEAD_TURN_MAX_YAW, Math.min(HEAD_TURN_MAX_YAW, yaw))
    const cur = headRef.current.rotation.y
    headRef.current.rotation.y = cur + (clamped - cur) * HEAD_TURN_LERP
  })

  return (
    <group
      ref={groupRef}
      position={[x + sideOffsetX, 0, z]}
      rotation={[0, facingY, 0]}
    >
      {renderedGlb && (
        <Suspense fallback={null}>
          <group
            position={[0, liftY, !isTalking && pose === 'sit' ? 0.15 : 0]}
            rotation={[0, Math.PI, 0]}
          >
            <GLBHumanoid url={renderedGlb} />
          </group>
        </Suspense>
      )}
      {showLabels && (
        <>
          <Label name={name} role={role} y={isStanding ? 2.1 : 1.7} />
          {required && <StatusIndicator id={id} y={isStanding ? 2.4 : 2.0} />}
          {bark && <BarkBubble id={id} text={bark} y={isStanding ? 2.7 : 2.3} />}
        </>
      )}
    </group>
  )
}

// Floating speech bubble that appears for ~3 seconds after the player closes
// dialogue with this NPC. Reads the recentBarkNPC slice from the store.
//
// `text` is the FALLBACK (the NPC's static bark from constants). If the
// store has a recentBarkText override (set by object interactions for
// rotating barks), that wins. This lets Printer / Phyllis cycle their
// scripts on repeated presses.
//
// Note: don't use whitespace:nowrap here — bark lines can be long and were
// overflowing the bubble background. Set a fixed width and wrap.
function BarkBubble({ id, text, y }: { id: string; text: string; y: number }) {
  const isActive = useGameStore((s) => s.recentBarkNPC === id)
  const override = useGameStore((s) => s.recentBarkText)
  if (!isActive) return null
  const displayText = override ?? text

  // For multi-use object interactions (printer / phyllis), show the meter
  // effects that just fired below the bark. Only when the displayed text
  // IS one of the rotating barks — not the exhausted-message bark, which
  // applies no effects.
  const objectConfig = OBJECT_INTERACTIONS[id]
  const showEffects =
    objectConfig != null && objectConfig.barks.includes(displayText)

  return (
    <Html
      position={[0, y, 0]}
      center
      distanceFactor={9}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        className="font-medium text-ink-900 text-sm px-3 py-2 rounded-lg shadow-lg leading-snug"
        style={{
          background: 'rgba(246,242,231,0.95)',
          border: '1px solid rgba(58,53,40,0.3)',
          width: 240,
          textAlign: 'center',
        }}
      >
        “{displayText}”
        {showEffects && objectConfig && (
          <BarkEffectChips effects={objectConfig.effects} />
        )}
      </div>
    </Html>
  )
}

// Compact effect chips rendered inside the bark bubble. Color-coded the
// same way as the DialoguePanel EffectChip — good = emerald, bad = rose,
// neutral (time) = gray.
function BarkEffectChips({ effects }: { effects: Effects }) {
  const entries: Array<{ label: string; value: number; tone: 'good' | 'bad' | 'neutral' }> = []
  if (effects.time !== undefined && effects.time !== 0) {
    entries.push({ label: 'm', value: effects.time, tone: 'neutral' })
  }
  if (effects.projectStatus !== undefined && effects.projectStatus !== 0) {
    entries.push({
      label: 'Project',
      value: effects.projectStatus,
      tone: effects.projectStatus > 0 ? 'good' : 'bad',
    })
  }
  if (effects.pissedOff !== undefined && effects.pissedOff !== 0) {
    entries.push({
      label: 'Pissed',
      value: effects.pissedOff,
      tone: effects.pissedOff < 0 ? 'good' : 'bad',
    })
  }
  if (effects.meetingLoad !== undefined && effects.meetingLoad !== 0) {
    entries.push({
      label: 'Mtg',
      value: effects.meetingLoad,
      tone: effects.meetingLoad < 0 ? 'good' : 'bad',
    })
  }
  if (effects.alignment !== undefined && effects.alignment !== 0) {
    entries.push({
      label: 'Align',
      value: effects.alignment,
      tone: effects.alignment > 0 ? 'good' : 'bad',
    })
  }
  if (entries.length === 0) return null
  const toneStyle = {
    good: { color: '#0c6b3d', bg: '#d8f0e1' },
    bad: { color: '#9a1a1a', bg: '#fbe0e0' },
    neutral: { color: '#3a352b', bg: '#e8e2d0' },
  } as const
  return (
    <div className="flex flex-wrap gap-1 justify-center mt-1.5">
      {entries.map((e, i) => {
        const s = toneStyle[e.tone]
        const sign = e.value > 0 ? '+' : ''
        return (
          <span
            key={i}
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
            style={{ color: s.color, backgroundColor: s.bg }}
          >
            {e.label === 'm' ? `${sign}${e.value}m` : `${e.label} ${sign}${e.value}`}
          </span>
        )
      })}
    </div>
  )
}

// Workstation (chair + desk + monitor + per-NPC desk personality) needs to
// stay at the original NPC position even when the NPC has stood up and
// moved aside. So we render it outside the NPC group, at the original
// (x, z) coords. `id` is passed through to Workstation so the desk gets
// NPC-specific accents (Brent's mug collection, Tasha's Wacom, etc).
function NPCWorkstation({ id, x, z }: { id: string; x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Workstation showChair id={id} />
    </group>
  )
}

// Pulsing ! over unhandled required NPCs; grayed ✓ once handled.
function StatusIndicator({ id, y }: { id: string; y: number }) {
  const isHandled = useGameStore((s) => s.handledNPCs.has(id))
  return (
    <Html
      position={[0, y, 0]}
      center
      distanceFactor={9}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {isHandled ? (
        <div className="text-2xl font-bold text-beige-300/60 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
          ✓
        </div>
      ) : (
        <div className="text-3xl font-bold text-yellow-300 animate-pulse drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
          !
        </div>
      )}
    </Html>
  )
}


function ObjectNPC({
  id,
  role,
  color,
  name,
  x,
  z,
  bark,
  showLabels,
}: {
  id: string
  role: string
  color: string
  name: string
  x: number
  z: number
  bark?: string
  showLabels: boolean
}) {
  // Per-role label heights — labels float above the tallest geometry.
  const labelY =
    role === 'Plant' ? 1.9 : role === 'Coffee' ? 1.7 : 1.6
  const barkY =
    role === 'Plant' ? 2.5 : role === 'Coffee' ? 2.3 : 2.1

  return (
    <group position={[x, 0, z]}>
      {role === 'Plant' && (
        <group>
          {/* Pot — static, never sways */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.25, 0.6, 16]} />
            <meshStandardMaterial color="#7a5a3a" />
          </mesh>
          {/* Foliage — sways gently when player is nearby. Pivot is at the
              top of the pot (y=0.6) so the leaves rock at the soil line,
              like a real plant disturbed by someone brushing past. */}
          <SwayingFoliage worldX={x} worldZ={z} color={color} />
        </group>
      )}
      {role === 'Coffee' && <CoffeeMachine />}
      {role !== 'Plant' && role !== 'Coffee' && (
        <PrinterMesh color={color} isPrinter={id === 'printer'} />
      )}

      {/* Printer ambient audio — random Xerox-style noises when PM is
          nearby. Kept in its own component so the useFrame only mounts
          for the printer NPC, not every ObjectNPC. */}
      {id === 'printer' && <PrinterProximityAudio worldX={x} worldZ={z} />}

      {/* Coffee bubbling — percolator pops fire at short intervals when
          PM is near the coffee station. */}
      {id === 'coffee' && <CoffeeProximityAudio worldX={x} worldZ={z} />}

      {/* Phyllis leaf rustle — dry-leaf shsh sounds at random intervals
          when PM is near, pairing with the existing leaf sway visual. */}
      {id === 'phyllis' && <PhyllisProximityAudio worldX={x} worldZ={z} />}

      {showLabels && (
        <>
          <Label name={name} role={role} y={labelY} />
          {bark && <BarkBubble id={id} text={bark} y={barkY} />}
        </>
      )}
    </group>
  )
}

// Coffee station — a proper barista-style espresso bar. Replaces the
// previous "two boxes stacked" placeholder with a recognizable counter +
// machine + accessories silhouette: counter base with dark wood top, a
// brushed-metal espresso machine body with group head + portafilter +
// drip tray, a bean hopper on top, a steam wand sticking out to the side,
// a small pressure gauge, a coffee pot on a heat plate, and a few mugs.
//
// All meshes are local to the parent ObjectNPC group, which sits at the
// coffee station's world position (constants.ts NPCS 'coffee' entry).
function CoffeeMachine() {
  return (
    <group>
      {/* ---------- Counter ---------- */}
      {/* Gray base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.8, 0.55]} />
        <meshStandardMaterial color="#8a9499" roughness={0.6} />
      </mesh>
      {/* Wood-grain dark top */}
      <mesh position={[0, 0.825, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.05, 0.6]} />
        <meshStandardMaterial color="#3a2c1e" roughness={0.7} />
      </mesh>

      {/* ---------- Espresso machine body ---------- */}
      {/* Main brushed-metal body, sitting left of center on the counter */}
      <mesh position={[-0.2, 1.13, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.55, 0.36]} />
        <meshStandardMaterial color="#aab2ba" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* Dark cap on top of body */}
      <mesh position={[-0.2, 1.42, -0.02]} castShadow>
        <boxGeometry args={[0.62, 0.05, 0.36]} />
        <meshStandardMaterial color="#1f2226" roughness={0.4} />
      </mesh>
      {/* Bean hopper — translucent brown cylinder on top */}
      <mesh position={[-0.2, 1.55, -0.08]}>
        <cylinderGeometry args={[0.07, 0.07, 0.2, 16]} />
        <meshStandardMaterial
          color="#3a2410"
          roughness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Hopper cap */}
      <mesh position={[-0.2, 1.66, -0.08]}>
        <cylinderGeometry args={[0.08, 0.08, 0.025, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* ---------- Group head + portafilter (where coffee comes out) ---------- */}
      <mesh position={[-0.2, 1.05, 0.21]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.09, 14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Portafilter stem — short black handle protruding down-out */}
      <mesh
        position={[-0.2, 0.985, 0.32]}
        rotation={[Math.PI / 3.2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.022, 0.022, 0.18, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Portafilter handle cap */}
      <mesh position={[-0.2, 0.94, 0.41]} rotation={[Math.PI / 3.2, 0, 0]}>
        <boxGeometry args={[0.06, 0.025, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* Drip tray — thin slotted rectangle under the group head */}
      <mesh position={[-0.2, 0.865, 0.15]}>
        <boxGeometry args={[0.18, 0.018, 0.16]} />
        <meshStandardMaterial color="#15191c" metalness={0.4} />
      </mesh>

      {/* ---------- Steam wand ---------- */}
      {/* Chrome cylinder angling out to the right */}
      <mesh
        position={[0.15, 1.12, 0.06]}
        rotation={[0, 0, -Math.PI / 3.5]}
        castShadow
      >
        <cylinderGeometry args={[0.012, 0.012, 0.34, 8]} />
        <meshStandardMaterial color="#c0c5cc" metalness={0.85} roughness={0.18} />
      </mesh>
      {/* Steam tip nozzle */}
      <mesh position={[0.31, 1.18, 0.06]} castShadow>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color="#a0a4aa" metalness={0.85} />
      </mesh>

      {/* ---------- Pressure gauge ---------- */}
      <mesh
        position={[0.08, 1.18, 0.19]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.038, 0.038, 0.015, 18]} />
        <meshStandardMaterial color="#f4f5f7" roughness={0.4} />
      </mesh>
      {/* Gauge needle — small red bar pointing slightly past upright */}
      <mesh position={[0.085, 1.195, 0.198]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.005, 0.028, 0.002]} />
        <meshStandardMaterial color="#c44a4a" emissive="#c44a4a" emissiveIntensity={0.4} />
      </mesh>

      {/* ---------- Status LED — teal Lumon detail ---------- */}
      <mesh position={[0.22, 1.32, 0.18]}>
        <boxGeometry args={[0.04, 0.018, 0.006]} />
        <meshStandardMaterial
          color="#4fa9a3"
          emissive="#4fa9a3"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* ---------- Coffee pot on heat plate (right of espresso machine) ---------- */}
      {/* Heat plate */}
      <mesh position={[0.45, 0.86, -0.02]} castShadow>
        <boxGeometry args={[0.22, 0.025, 0.22]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
      {/* Pot body — slightly tapered cylinder */}
      <mesh position={[0.45, 1.0, -0.02]} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.24, 16]} />
        <meshStandardMaterial color="#222428" metalness={0.3} roughness={0.55} />
      </mesh>
      {/* Coffee inside, peeking out the top */}
      <mesh position={[0.45, 1.1, -0.02]}>
        <cylinderGeometry args={[0.062, 0.062, 0.04, 14]} />
        <meshStandardMaterial
          color="#3d2010"
          emissive="#2a1408"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Pot handle — short rectangular grip on the side */}
      <mesh position={[0.56, 1.0, -0.02]} castShadow>
        <boxGeometry args={[0.05, 0.16, 0.025]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>

      {/* ---------- Mugs ---------- */}
      {/* Mug A — left of espresso machine on counter top */}
      <mesh position={[-0.62, 0.89, -0.02]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.085, 14]} />
        <meshStandardMaterial color="#f0eee8" roughness={0.5} />
      </mesh>
      {/* Mug A handle — small ring on the side */}
      <mesh position={[-0.555, 0.89, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 8, 16]} />
        <meshStandardMaterial color="#f0eee8" />
      </mesh>
      {/* Mug B — stacked on top of Mug A */}
      <mesh position={[-0.62, 0.98, -0.02]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.085, 14]} />
        <meshStandardMaterial color="#f0eee8" roughness={0.5} />
      </mesh>
      {/* Mug C — beige variant on counter, slightly forward */}
      <mesh position={[-0.5, 0.89, 0.13]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.085, 14]} />
        <meshStandardMaterial color="#c8b89a" roughness={0.6} />
      </mesh>
    </group>
  )
}

// Printer 3D mesh + slap-impact animation. The audit caught that Leonard's
// slap (audio + arm swing) didn't visually move the printer at all — most
// satisfying single moment in the build was audio-only.
//
// Watches `slapState.printerSlapTrigger` (incremented by gameStore.interactObject
// on E-key press). When it changes, runs a ~400ms damped-sine shake on the
// printer body group and pulses a warm-yellow emissive flash on the
// body material — reads as "the printer just took a hit."
function PrinterMesh({
  color,
  isPrinter,
}: {
  color: string
  isPrinter: boolean
}) {
  const groupRef = useRef<Group>(null)
  const bodyMatRef = useRef<MeshStandardMaterial>(null)
  // Last trigger value we acted on. Slap fires whenever the live trigger
  // diverges from this.
  const lastTriggerRef = useRef(slapState.printerSlapTrigger)
  // performance.now() of the active slap, or 0 when idle.
  const slapStartedAtRef = useRef(0)

  useFrame(() => {
    if (!isPrinter || !groupRef.current) return

    // New slap?
    if (slapState.printerSlapTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = slapState.printerSlapTrigger
      slapStartedAtRef.current = performance.now()
    }

    if (slapStartedAtRef.current === 0) return

    const SHAKE_MS = 400
    const elapsed = performance.now() - slapStartedAtRef.current
    if (elapsed > SHAKE_MS) {
      // Reset to rest, clear active slap.
      groupRef.current.position.x = 0
      groupRef.current.position.z = 0
      groupRef.current.rotation.z = 0
      if (bodyMatRef.current) {
        bodyMatRef.current.emissiveIntensity = 0
      }
      slapStartedAtRef.current = 0
      return
    }

    // Damped sine shake on the body + small tilt. Amplitude scales down with
    // elapsed time so the printer settles back to rest naturally.
    const t = elapsed / SHAKE_MS
    const damp = 1 - t
    groupRef.current.position.x = Math.sin(elapsed * 0.07) * damp * 0.05
    groupRef.current.position.z = Math.cos(elapsed * 0.055) * damp * 0.025
    groupRef.current.rotation.z = Math.sin(elapsed * 0.06) * damp * 0.04

    // Warm yellow emissive pulse — peaks at impact, fades to 0.
    if (bodyMatRef.current) {
      const flash = damp * 0.55
      bodyMatRef.current.emissive.setRGB(flash, flash * 0.85, flash * 0.2)
      bodyMatRef.current.emissiveIntensity = flash
    }
  })

  return (
    <group ref={groupRef}>
      {/* Body — gets the shake transform + emissive flash. */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 1.0, 0.7]} />
        <meshStandardMaterial ref={bodyMatRef} color={color} />
      </mesh>
      {/* Top monitor strip. */}
      <mesh position={[0, 1.05, 0.36]}>
        <boxGeometry args={[0.5, 0.2, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Paper output slot. */}
      <mesh position={[0, 0.7, 0.36]}>
        <boxGeometry args={[0.7, 0.04, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

// Plays a randomized printer-jam noise when the player is within ~4m of the
// printer, with closer = more frequent. Quiet enough to be background flavor
// — never overlaps with itself thanks to the per-firing interval reset.
function PrinterProximityAudio({
  worldX,
  worldZ,
}: {
  worldX: number
  worldZ: number
}) {
  // Initial cooldown so we don't fire the moment PM spawns even if they
  // happen to spawn near the printer. Subsequent intervals are picked
  // randomly inside the useFrame.
  const nextFireAtRef = useRef(performance.now() / 1000 + 4)
  useFrame(() => {
    const dx = playerPosition.x - worldX
    const dz = playerPosition.z - worldZ
    const distSq = dx * dx + dz * dz
    // 4m proximity ring — matches the dialogue-prompt distance, so the
    // printer "wakes up" right as the player gets close enough to interact.
    if (distSq > 16) return
    const now = performance.now() / 1000
    if (now < nextFireAtRef.current) return
    audio.playPrinterNoise()
    // Pick next interval: closer = more frequent (2.5–5s), farther (4–8s).
    const dist = Math.sqrt(distSq)
    const closeness = 1 - dist / 4 // 0..1
    const minGap = 2.5 + (1 - closeness) * 1.5
    const maxGap = 5 + (1 - closeness) * 3
    nextFireAtRef.current = now + minGap + Math.random() * (maxGap - minGap)
  })
  return null
}

// Phyllis leaf rustle — fires a short high-passed noise rustle at 1.5–3s
// intervals when PM is within ~3m. Pairs with the existing leaf-sway
// visual so the plant feels alive both audibly and visibly.
function PhyllisProximityAudio({
  worldX,
  worldZ,
}: {
  worldX: number
  worldZ: number
}) {
  const nextFireAtRef = useRef(performance.now() / 1000 + 2)
  useFrame(() => {
    const dx = playerPosition.x - worldX
    const dz = playerPosition.z - worldZ
    const distSq = dx * dx + dz * dz
    if (distSq > 9) return // 3m proximity ring
    const now = performance.now() / 1000
    if (now < nextFireAtRef.current) return
    audio.playLeafRustle()
    // Sparser than coffee — leaves don't talk much. 1.5–3.5s gaps.
    const dist = Math.sqrt(distSq)
    const closeness = 1 - dist / 3
    const minGap = 1.5 + (1 - closeness) * 0.8
    nextFireAtRef.current = now + minGap + Math.random() * 1.2
  })
  return null
}

// Coffee station bubbling — fires a short bubble pop on a tight interval
// (0.3–0.9s) when PM is within ~3.5m. Mimics a percolator brewing in the
// background of the room.
function CoffeeProximityAudio({
  worldX,
  worldZ,
}: {
  worldX: number
  worldZ: number
}) {
  const nextFireAtRef = useRef(performance.now() / 1000 + 1)
  useFrame(() => {
    const dx = playerPosition.x - worldX
    const dz = playerPosition.z - worldZ
    const distSq = dx * dx + dz * dz
    if (distSq > 12.25) return // 3.5m proximity ring
    const now = performance.now() / 1000
    if (now < nextFireAtRef.current) return
    audio.playCoffeeBubble()
    // Bubble interval: 0.3s (close & frequent) to 1.2s (farther & sparse).
    const dist = Math.sqrt(distSq)
    const closeness = 1 - dist / 3.5
    const baseGap = 0.4 + (1 - closeness) * 0.6
    nextFireAtRef.current = now + baseGap + Math.random() * 0.4
  })
  return null
}

// Phyllis's leaves rock gently when the player gets close. The pivot group
// sits at y=0.6 (top of the pot), so the foliage hinges at the soil line
// rather than rotating around its own center — looks like a real plant
// reacting to someone brushing past.
//
// Geometry: a cluster of 8 elongated ellipsoid "leaves" radiating outward
// at varied angles, with slight per-leaf color variation. This reads as a
// real houseplant (think pothos / mini palm) instead of the previous green
// sphere blob.
//
// Intensity ramps linearly from 1.0 at touch to 0 at 4m, then the rotation
// smoothly returns to neutral. We never snap; ramps are 0.15-step lerps so
// the sway has visible inertia (it keeps swaying briefly after you stop).
const PHYLLIS_LEAVES: Array<{
  pos: [number, number, number]
  scale: [number, number, number]
  rot: [number, number, number]
  tint: number // -1..1 darkness offset relative to base color
}> = [
  // Center, tallest leaf — base color
  { pos: [0, 0.55, 0], scale: [0.18, 0.55, 0.35], rot: [0, 0, 0], tint: 0 },
  // Right-front, slightly drooping
  { pos: [0.22, 0.4, 0.18], scale: [0.16, 0.45, 0.3], rot: [0.3, 0.8, 0.35], tint: 0.1 },
  // Left-front, drooping the other way
  { pos: [-0.22, 0.4, 0.15], scale: [0.16, 0.45, 0.3], rot: [0.25, -0.7, -0.35], tint: -0.05 },
  // Back-right
  { pos: [0.18, 0.35, -0.22], scale: [0.15, 0.42, 0.28], rot: [-0.4, 0.4, 0.4], tint: 0.05 },
  // Back-left
  { pos: [-0.18, 0.4, -0.2], scale: [0.15, 0.42, 0.28], rot: [-0.3, -0.5, -0.4], tint: -0.1 },
  // Mid-right, lower & curving out
  { pos: [0.3, 0.25, 0.0], scale: [0.13, 0.35, 0.25], rot: [0, 0.9, 0.7], tint: 0.15 },
  // Mid-left
  { pos: [-0.3, 0.28, -0.05], scale: [0.13, 0.35, 0.25], rot: [0, -0.9, -0.7], tint: 0.0 },
  // Front-low droopy leaf
  { pos: [0.05, 0.2, 0.25], scale: [0.13, 0.32, 0.22], rot: [0.7, 0.2, 0.1], tint: -0.05 },
]

// Mix a hex color toward black (negative tint) or toward white (positive tint).
// Used to give each leaf a slightly different green so the plant doesn't look
// monochrome.
function tintColor(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (c: number) => {
    const target = amount > 0 ? 255 : 0
    const blended = Math.round(c + (target - c) * Math.abs(amount))
    return Math.max(0, Math.min(255, blended))
  }
  return `#${mix(r).toString(16).padStart(2, '0')}${mix(g).toString(16).padStart(2, '0')}${mix(b).toString(16).padStart(2, '0')}`
}

function SwayingFoliage({
  worldX,
  worldZ,
  color,
}: {
  worldX: number
  worldZ: number
  color: string
}) {
  const swayRef = useRef<Group>(null)
  useFrame((state) => {
    if (!swayRef.current) return
    const dx = playerPosition.x - worldX
    const dz = playerPosition.z - worldZ
    const dist = Math.hypot(dx, dz)
    // 1.0 at touch, 0 at 4m+. PM interacts via E at ~1.5m, so sway is
    // visibly peaking when the interact prompt appears.
    const intensity = Math.max(0, 1 - dist / 4)
    const t = state.clock.elapsedTime
    // Two-axis sine wave with different frequencies on each axis so the
    // motion never feels like a clean wobble — reads as foliage, not a metronome.
    const targetX = Math.sin(t * 2.7) * 0.12 * intensity
    const targetZ = Math.cos(t * 2.3) * 0.08 * intensity
    swayRef.current.rotation.x =
      swayRef.current.rotation.x * 0.85 + targetX * 0.15
    swayRef.current.rotation.z =
      swayRef.current.rotation.z * 0.85 + targetZ * 0.15
  })
  return (
    <group ref={swayRef} position={[0, 0.6, 0]}>
      {PHYLLIS_LEAVES.map((leaf, i) => (
        <mesh
          key={i}
          position={leaf.pos}
          rotation={leaf.rot}
          scale={leaf.scale}
          castShadow
        >
          {/* Sphere is scaled into an ellipsoid by the parent mesh scale,
              giving an elongated leaf shape. 12×8 segments keep tris low. */}
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial
            color={tintColor(color, leaf.tint)}
            roughness={0.85}
          />
        </mesh>
      ))}
      {/* A few small "tip" highlights — tiny brighter spheres clustered at
          the top to suggest fresh young leaves catching light. */}
      <mesh position={[0.05, 0.85, 0]} scale={[0.06, 0.1, 0.06]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={tintColor(color, 0.25)} roughness={0.7} />
      </mesh>
      <mesh position={[-0.08, 0.82, -0.05]} scale={[0.05, 0.09, 0.05]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={tintColor(color, 0.2)} roughness={0.7} />
      </mesh>
    </group>
  )
}

// Camera-aligned label via Drei Html — no mirroring issue when the NPC group
// is rotated (which is what happened with Drei Text + group rotation π).
function Label({ name, role, y }: { name: string; role: string; y: number }) {
  return (
    <Html
      position={[0, y, 0]}
      center
      distanceFactor={9}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        className="font-medium text-ink-900 whitespace-nowrap text-base"
        style={{
          textShadow:
            '-1px -1px 0 #f6f2e7, 1px -1px 0 #f6f2e7, -1px 1px 0 #f6f2e7, 1px 1px 0 #f6f2e7, 0 0 8px rgba(246,242,231,0.6)',
        }}
      >
        {name === role ? name : `${name} · ${role}`}
      </div>
    </Html>
  )
}
