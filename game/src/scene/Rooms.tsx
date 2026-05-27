// Furniture + decor for the two named rooms in the office:
//   - HR Office (center -10, -10, size 6×4): Diane's desk + chair + a trio
//     of disgustingly cheery, slightly ironic HR posters.
//   - SYNERGY 2A meeting room (center 10, -10, size 6×4): a long meeting
//     table with 6 chairs and a whiteboard on the back wall.
//
// World positions are hard-coded against the ZONES room definitions in
// constants.ts. The room walls themselves are still rendered by Office.tsx
// Room() — this file just adds the contents.

import { Text } from '@react-three/drei'
import { Chair, Desk } from './Furniture'

// ============================================================
//  HR Office
// ============================================================
//
// Layout (top-down, room bounds x=-13..-7, z=-12..-8, doorway at +Z=-8):
//
//     [BACK WALL z=-12]
//     ┌─────────────────────────────┐
//     │ [POSTER]    [POSTER]        │
//     │                             │
//     │    [chair]                  │
//     │    [DESK]   <- modesty side │
//     │                             │
//     │ ⊙ Diane (standing, faces +Z)│
//     │                             │
//     └ ─ ─ ─ (door, +Z=-8) ─ ─ ─ ─┘
//
// Diane stands at z=-10 facing +Z. Her desk sits BEHIND her (at z=-10.8,
// north toward the back wall) so visitors approaching from the door see
// her standing in front of her workspace. The chair tucks between the
// desk's back side and the back wall.
export function HROffice() {
  return (
    <group>
      {/* Desk — rotated π so its "sitter side" faces -Z (toward back wall).
          With this orientation, visitors approach the modesty-panel side
          from the door (+Z), which is the standard HR-desk vibe. */}
      <group position={[-10, 0, -10.8]} rotation={[0, Math.PI, 0]}>
        <Desk />
        {/* Small desk items — clipboard + tissue box. HR essentials. */}
        <DeskItems />
      </group>

      {/* Chair behind the desk (between desk back and back wall). Rotated
          π so the sitter would face +Z toward visitors. Diane is currently
          standing — the chair is just here for the scene. */}
      <group position={[-10, 0, -11.45]} rotation={[0, Math.PI, 0]}>
        <Chair />
      </group>

      {/* Three "Alignly Cares" posters — disgustingly cheery copy with
          slightly ironic asterisked fine print. Mounted on the walls. */}
      {/* Back wall, slight left of center */}
      <HRPoster
        position={[-11.5, 1.95, -11.91]}
        rotation={[0, 0, 0]}
        title="ALIGNLY CARES."
        subtitle="* — about your alignment"
      />
      {/* Back wall, slight right of center */}
      <HRPoster
        position={[-8.5, 1.95, -11.91]}
        rotation={[0, 0, 0]}
        title="WE'RE A FAMILY."
        subtitle="see Section 7.4 of the Handbook"
      />
      {/* Left side wall, facing into the room */}
      <HRPoster
        position={[-12.91, 1.95, -10]}
        rotation={[0, Math.PI / 2, 0]}
        title="BRING YOUR WHOLE SELF."
        subtitle="* — pending HR review"
      />
      {/* Right side wall, facing into the room */}
      <HRPoster
        position={[-7.09, 1.95, -10]}
        rotation={[0, -Math.PI / 2, 0]}
        title="FEEDBACK IS A GIFT."
        subtitle="one we can decline"
      />
    </group>
  )
}

// HR posters — a teal-banded white panel with a big cheery slogan and a
// small darker subtitle that recontextualizes it as menacing.
function HRPoster({
  position,
  rotation,
  title,
  subtitle,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  title: string
  subtitle: string
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Backing panel — off-white */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.3, 0.75, 0.03]} />
        <meshStandardMaterial color="#f6f8f8" roughness={0.6} />
      </mesh>
      {/* Teal top band — Lumon-style header */}
      <mesh position={[0, 0.34, 0.018]}>
        <boxGeometry args={[1.3, 0.07, 0.02]} />
        <meshStandardMaterial
          color="#4fa9a3"
          emissive="#4fa9a3"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Tiny ALIGNLY label inside the band */}
      <Text
        position={[0, 0.34, 0.03]}
        fontSize={0.04}
        color="#f6f8f8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.25}
        outlineWidth={0.002}
        outlineColor="#2d6e6a"
      >
        ALIGNLY EMPATHY DIVISION
      </Text>
      {/* Hero title */}
      <Text
        position={[0, 0.07, 0.025]}
        fontSize={0.12}
        color="#15191c"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.2}
        textAlign="center"
        fontWeight={700}
        letterSpacing={0.04}
        outlineWidth={0.002}
        outlineColor="#f6f8f8"
      >
        {title}
      </Text>
      {/* Subtitle — the satirical reveal */}
      <Text
        position={[0, -0.16, 0.025]}
        fontSize={0.058}
        color="#2d6e6a"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.15}
        textAlign="center"
        letterSpacing={0.08}
      >
        {subtitle}
      </Text>
    </group>
  )
}

// Desk items for Diane — minimalist HR desk: a clipboard, a tissue box,
// and a single pen. She doesn't sit here much.
function DeskItems() {
  return (
    <group>
      {/* Clipboard with thin paper on top */}
      <mesh position={[0.25, 0.79, 0.0]} castShadow>
        <boxGeometry args={[0.22, 0.012, 0.3]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.7} />
      </mesh>
      <mesh position={[0.25, 0.798, 0.0]}>
        <boxGeometry args={[0.2, 0.003, 0.27]} />
        <meshStandardMaterial color="#fafbfc" />
      </mesh>
      {/* Tissue box — cube with a slit on top */}
      <mesh position={[-0.5, 0.83, -0.1]} castShadow>
        <boxGeometry args={[0.15, 0.13, 0.13]} />
        <meshStandardMaterial color="#f0eee8" roughness={0.7} />
      </mesh>
      <mesh position={[-0.5, 0.9, -0.1]}>
        <boxGeometry args={[0.09, 0.005, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Pen */}
      <mesh
        position={[-0.05, 0.788, 0.12]}
        rotation={[0, 0.4, 0]}
        castShadow
      >
        <boxGeometry args={[0.13, 0.012, 0.012]} />
        <meshStandardMaterial color="#3a4f7a" />
      </mesh>
    </group>
  )
}

// ============================================================
//  SYNERGY 2A meeting room
// ============================================================
//
// Layout (top-down, room bounds x=7..13, z=-12..-8):
//
//     [BACK WALL z=-12]
//     ┌─────────────────────────────┐
//     │       [WHITEBOARD]          │
//     │  ◇         ◇         ◇      │  <- 2 chairs north + 1 east
//     │     ┌─────────────┐         │
//     │  ◇  │   TABLE     │  ◇      │  <- 2 east/west chairs
//     │     └─────────────┘         │
//     │       ◇       ◇             │  <- 2 chairs south
//     │                             │
//     └ ─ ─ ─ (door, +Z=-8) ─ ─ ─ ─┘
//
// Table is 2m × 1.2m centered at (10, -10). 6 chairs surround it.
export function MeetingRoom() {
  return (
    <group>
      {/* Long meeting table */}
      <MeetingTable position={[10, 0, -10]} />

      {/* 2 chairs on the NORTH side (back of room). Default chair faces -Z,
          which from these positions means facing the table. */}
      <group position={[9.4, 0, -9.0]}>
        <Chair />
      </group>
      <group position={[10.6, 0, -9.0]}>
        <Chair />
      </group>

      {/* 2 chairs on the SOUTH side (door side). Rotated π so they face +Z
          toward the table. */}
      <group position={[9.4, 0, -10.95]} rotation={[0, Math.PI, 0]}>
        <Chair />
      </group>
      <group position={[10.6, 0, -10.95]} rotation={[0, Math.PI, 0]}>
        <Chair />
      </group>

      {/* East chair — facing -X (toward table). rotation.y = +π/2 turns
          default -Z forward into -X. */}
      <group position={[11.55, 0, -10]} rotation={[0, Math.PI / 2, 0]}>
        <Chair />
      </group>
      {/* West chair — facing +X (toward table). rotation.y = -π/2. */}
      <group position={[8.45, 0, -10]} rotation={[0, -Math.PI / 2, 0]}>
        <Chair />
      </group>

      {/* Whiteboard on the back wall (z=-11.95) with some scribble */}
      <Whiteboard position={[10, 1.7, -11.91]} />
    </group>
  )
}

// Meeting table — 2m × 1.2m surface, dark wood top + 4 legs + small
// centerpiece (a stack of papers and a teal LED puck for "the meeting
// is in session" energy).
function MeetingTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tabletop */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.05, 1.2]} />
        <meshStandardMaterial color="#3a2c1e" roughness={0.65} />
      </mesh>
      {/* 4 legs near the corners (inset slightly) */}
      {[
        [-0.85, -0.45],
        [0.85, -0.45],
        [-0.85, 0.45],
        [0.85, 0.45],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.37, lz]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Centerpiece: a small stack of meeting handouts + a teal LED puck */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.22, 0.018, 0.28]} />
        <meshStandardMaterial color="#fff8e8" />
      </mesh>
      <mesh position={[0.35, 0.775, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.012, 16]} />
        <meshStandardMaterial
          color="#4fa9a3"
          emissive="#4fa9a3"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* A pen on the table */}
      <mesh
        position={[-0.3, 0.77, -0.15]}
        rotation={[0, 0.7, 0]}
        castShadow
      >
        <boxGeometry args={[0.14, 0.012, 0.012]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
      {/* Mug (someone left it) */}
      <mesh position={[-0.6, 0.79, 0.3]} castShadow>
        <cylinderGeometry args={[0.038, 0.034, 0.075, 12]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.6} />
      </mesh>
      <mesh position={[-0.557, 0.79, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.017, 0.005, 6, 12]} />
        <meshStandardMaterial color="#d8c8a8" />
      </mesh>
    </group>
  )
}

// Whiteboard mounted on the back wall. White panel with a black frame
// and a few colored scribble rectangles to suggest someone's been
// drawing on it.
function Whiteboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Black frame */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.7, 0.95, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* White surface */}
      <mesh position={[0, 0, 0.018]}>
        <boxGeometry args={[1.6, 0.85, 0.005]} />
        <meshStandardMaterial color="#fafbfc" roughness={0.4} />
      </mesh>
      {/* A few "scribbles" — colored rectangles suggesting half-erased
          marker work. Plus one slightly tilted axis line. */}
      <mesh position={[-0.4, 0.15, 0.022]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.28, 0.015, 0.001]} />
        <meshStandardMaterial color="#3a4f7a" />
      </mesh>
      <mesh position={[-0.25, 0.05, 0.022]}>
        <boxGeometry args={[0.5, 0.012, 0.001]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
      <mesh position={[0.3, -0.05, 0.022]}>
        <boxGeometry args={[0.16, 0.13, 0.001]} />
        <meshStandardMaterial color="#c44a4a" />
      </mesh>
      <mesh position={[0.5, -0.2, 0.022]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.22, 0.015, 0.001]} />
        <meshStandardMaterial color="#4fa9a3" />
      </mesh>
      {/* Tiny "QUARTERLY OKRS" title block to suggest content */}
      <Text
        position={[0, 0.35, 0.022]}
        fontSize={0.06}
        color="#15191c"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        QUARTERLY OKRS
      </Text>
    </group>
  )
}
