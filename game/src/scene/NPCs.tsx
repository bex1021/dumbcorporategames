import { Suspense, useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { NPCS, OBJECT_INTERACTIONS } from '../config/constants'
import { useGameStore, type Effects } from '../state/gameStore'
import { playerPosition } from '../state/playerState'
import { GLBHumanoid } from './GLBHumanoid'
import { Workstation } from './Furniture'

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
        <NPCWorkstation key={`ws-${npc.id}`} x={npc.x} z={npc.z} />
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
  const badgeY = isStanding ? 1.3 : 1.0
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

  return (
    <group position={[x + sideOffsetX, 0, z]} rotation={[0, facingY, 0]}>
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
      <ChestBadge color={color} y={badgeY} />
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

// Workstation (chair + desk + monitor) needs to stay at the original NPC
// position even when the NPC has stood up and moved aside. So we render it
// outside the NPC group, at the original (x, z) coords.
function NPCWorkstation({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Workstation showChair />
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

function ChestBadge({ color, y }: { color: string; y: number }) {
  return (
    <mesh position={[0, y, -0.14]} castShadow>
      <boxGeometry args={[0.18, 0.1, 0.02]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        roughness={0.5}
      />
    </mesh>
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
  return (
    <group position={[x, 0, z]}>
      {role === 'Plant' ? (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.25, 0.6, 16]} />
            <meshStandardMaterial color="#7a5a3a" />
          </mesh>
          <mesh position={[0, 0.95, 0]} castShadow>
            <sphereGeometry args={[0.5, 14, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.15, 1.2, 0.1]} castShadow>
            <sphereGeometry args={[0.3, 12, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[-0.18, 1.15, -0.05]} castShadow>
            <sphereGeometry args={[0.25, 12, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 1.0, 0.7]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 1.05, 0.36]}>
            <boxGeometry args={[0.5, 0.2, 0.04]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          <mesh position={[0, 0.7, 0.36]}>
            <boxGeometry args={[0.7, 0.04, 0.02]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      )}
      {showLabels && (
        <>
          <Label name={name} role={role} y={role === 'Plant' ? 1.9 : 1.6} />
          {/* Bark bubble for object interactions (Printer / Phyllis).
              `bark` is the FALLBACK; the store's recentBarkText overrides
              it for the rotating per-press lines from OBJECT_INTERACTIONS. */}
          {bark && (
            <BarkBubble
              id={id}
              text={bark}
              y={role === 'Plant' ? 2.5 : 2.1}
            />
          )}
        </>
      )}
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
