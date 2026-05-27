// Round Severance-style wall clock. Reads `timeMinutes` from the game store
// every frame and rotates two hands. No second hand — the game clock advances
// in 5/10/15-minute chunks per player action, not continuously, so a ticking
// second hand would look fake.
//
// Geometry note (v2): the rim is a TorusGeometry, NOT a solid cylinder. The
// previous version used a solid cylinder for the rim, which occluded the
// white face cylinder behind it — the clock appeared as a black dot. A torus
// is a donut shape, so the face is visible through the central hole.

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { useGameStore } from '../state/gameStore'

const FACE_COLOR = '#f4f5f7'
const RIM_COLOR = '#1a1f23'
const HAND_COLOR = '#15191c'
const TICK_COLOR = '#15191c'

// Visible footprint (bigger than v1 — reads better from across the room).
// Face is the white disc seen through the rim. Torus rim is a thin ring on
// top of the face.
const FACE_RADIUS = 0.42
const TORUS_RING_RADIUS = 0.44 // distance from clock center to tube centerline
const TORUS_TUBE_RADIUS = 0.028 // half-thickness of the ring "pipe"

// Z layering — looking from +Z toward -Z (player POV), larger Z is closer.
// Face sits slightly proud of the rim so it's clearly the main surface.
// Hands stack in front of face with hair-thin offsets to prevent z-fighting.
const FACE_Z = 0.012 // face cylinder center
const FACE_DEPTH = 0.006
const TICK_Z = FACE_Z + FACE_DEPTH / 2 + 0.002
const HOUR_HAND_Z = TICK_Z + 0.004
const MINUTE_HAND_Z = HOUR_HAND_Z + 0.004
const CAP_Z = MINUTE_HAND_Z + 0.003

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
      {/* Face — white disc, seen through the rim's central hole. Slightly
          proud of the rim so it reads as the main surface. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, FACE_Z]}>
        <cylinderGeometry args={[FACE_RADIUS, FACE_RADIUS, FACE_DEPTH, 48]} />
        <meshStandardMaterial color={FACE_COLOR} roughness={0.7} />
      </mesh>

      {/* Rim — TorusGeometry, NOT a solid cylinder. Default orientation has
          the ring lying in the XY plane (axis along Z), which is exactly
          what we want for a wall-mounted clock viewed from +Z. */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry
          args={[TORUS_RING_RADIUS, TORUS_TUBE_RADIUS, 12, 48]}
        />
        <meshStandardMaterial color={RIM_COLOR} roughness={0.4} />
      </mesh>

      {/* 12 tick marks. Position around a circle of radius ~0.36; the box's
          default +Y axis points outward radially after the matched -angle
          rotation. Major ticks at 12/3/6/9 are thicker and longer. */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = 0.36
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
                isMajor ? 0.028 : 0.016,
                isMajor ? 0.072 : 0.048,
                0.005,
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
        <mesh position={[0, 0.105, 0]}>
          <boxGeometry args={[0.036, 0.21, 0.01]} />
          <meshStandardMaterial color={HAND_COLOR} />
        </mesh>
      </group>

      {/* Minute hand — longer, thinner */}
      <group ref={minuteHandRef} position={[0, 0, MINUTE_HAND_Z]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.022, 0.32, 0.01]} />
          <meshStandardMaterial color={HAND_COLOR} />
        </mesh>
      </group>

      {/* Center cap — small dark sphere covering the hand pivots */}
      <mesh position={[0, 0, CAP_Z]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={HAND_COLOR} />
      </mesh>
    </group>
  )
}
