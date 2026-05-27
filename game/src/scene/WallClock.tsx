// Round Severance-style wall clock. Reads `timeMinutes` from the game store
// every frame and rotates two hands. No second hand — the game clock advances
// in 5/10/15-minute chunks per player action, not continuously, so a ticking
// second hand would look fake.
//
// Mounting: the back wall (z = -halfDepth) has windows at x=-12, 0, +12.
// The left segment between window -12 and window 0 holds the mission mural
// (centered x=-6). The right segment (x=+3..+9) is currently empty — that's
// where this clock goes, centered at x=+6.
//
// Visual reference: stark white face, thin black hands, 12 minimal tick
// marks (slightly longer at 12/3/6/9). Reads at-a-glance from anywhere in
// the room, but doesn't shout.

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { useGameStore } from '../state/gameStore'

const FACE_COLOR = '#f4f5f7'
const RIM_COLOR = '#1a1f23'
const HAND_COLOR = '#15191c'
const TICK_COLOR = '#15191c'

const FACE_RADIUS = 0.36
const RIM_RADIUS = 0.40
const RIM_DEPTH = 0.06
const FACE_DEPTH = 0.012

// Z offsets within the clock's local frame. The rim sits centered (extends
// ± RIM_DEPTH/2 from origin). The face is recessed slightly so the rim
// reads as a frame around it. Hands float just in front of the face.
const FACE_Z = RIM_DEPTH / 2 - FACE_DEPTH / 2 - 0.001
const TICK_Z = FACE_Z + FACE_DEPTH / 2 + 0.002
const HOUR_HAND_Z = TICK_Z + 0.003
const MINUTE_HAND_Z = HOUR_HAND_Z + 0.003
const CAP_Z = MINUTE_HAND_Z + 0.002

export function WallClock({ position }: { position: [number, number, number] }) {
  const hourHandRef = useRef<Group>(null)
  const minuteHandRef = useRef<Group>(null)

  useFrame(() => {
    if (!hourHandRef.current || !minuteHandRef.current) return
    // Pull straight from the store via getState — no React subscription needed
    // since the hands are useFrame-driven anyway, and we don't want a render
    // pass every time timeMinutes ticks.
    const timeMinutes = useGameStore.getState().timeMinutes
    const totalMin = 9 * 60 + timeMinutes
    const hours = totalMin / 60
    const minutes = totalMin % 60
    // Three.js positive rotation.z rotates +X toward +Y (counterclockwise
    // viewed from +Z). Clocks rotate clockwise (12 → 3 → 6 → 9), so we
    // negate. Hands point along +Y in their default mesh orientation, which
    // is "12 o'clock" — rotation.z = 0.
    hourHandRef.current.rotation.z = -((hours % 12) / 12) * Math.PI * 2
    minuteHandRef.current.rotation.z = -(minutes / 60) * Math.PI * 2
  })

  return (
    <group position={position}>
      {/* Rim — dark cylinder forming the watch-bezel frame */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[RIM_RADIUS, RIM_RADIUS, RIM_DEPTH, 32]} />
        <meshStandardMaterial color={RIM_COLOR} roughness={0.4} />
      </mesh>

      {/* Face — white disc recessed inside the rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, FACE_Z]}>
        <cylinderGeometry args={[FACE_RADIUS, FACE_RADIUS, FACE_DEPTH, 32]} />
        <meshStandardMaterial color={FACE_COLOR} roughness={0.7} />
      </mesh>

      {/* 12 tick marks. Position around a circle of radius 0.30; the box's
          default +Y axis points outward radially after the matched -angle
          rotation. Major ticks at 12/3/6/9 are thicker and longer. */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = 0.305
        const tx = Math.sin(angle) * r
        const ty = Math.cos(angle) * r
        const isMajor = i % 3 === 0
        return (
          <mesh
            key={i}
            position={[tx, ty, TICK_Z]}
            rotation={[0, 0, -angle]}
          >
            <boxGeometry
              args={[
                isMajor ? 0.024 : 0.014,
                isMajor ? 0.06 : 0.04,
                0.004,
              ]}
            />
            <meshStandardMaterial color={TICK_COLOR} />
          </mesh>
        )
      })}

      {/* Hour hand — shorter, thicker. Pivot at center; the box is offset
          upward by half its length so the bottom sits at the clock center
          and rotation pivots about the center. */}
      <group ref={hourHandRef} position={[0, 0, HOUR_HAND_Z]}>
        <mesh position={[0, 0.085, 0]}>
          <boxGeometry args={[0.032, 0.17, 0.008]} />
          <meshStandardMaterial color={HAND_COLOR} />
        </mesh>
      </group>

      {/* Minute hand — longer, thinner */}
      <group ref={minuteHandRef} position={[0, 0, MINUTE_HAND_Z]}>
        <mesh position={[0, 0.135, 0]}>
          <boxGeometry args={[0.02, 0.27, 0.008]} />
          <meshStandardMaterial color={HAND_COLOR} />
        </mesh>
      </group>

      {/* Center cap — small dark sphere covering the hand pivots */}
      <mesh position={[0, 0, CAP_Z]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={HAND_COLOR} />
      </mesh>
    </group>
  )
}
