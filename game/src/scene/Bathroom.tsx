// A real bathroom carved into the front-right corner of the office.
//
// Layout (top-down):
//
//     z=10                          z=13
//       ┌──────────────────────────────┐   <- office front wall (bathroom back wall)
//       │ [Mirror][Sink]               │   <- right wall x=18 (office wall)
//       │                              │
//       │                              │
//       │                       [Toilet]│
//       └ ─ ─ (door 1m gap) ─ ─ ───────┘
//      x=14                         x=18
//      ^- left partition with z=11-12 gap
//
// The bathroom uses the office's existing front wall (z=+13) and right
// wall (x=+18) as two of its four walls. The other two are partitions we
// render here:
//   - Front partition at z=10 (separates bathroom from main office floor)
//   - Left partition at x=14, with a 1m doorway gap at z=11-12
//
// Wall colliders for this geometry live in constants.ts ROOM_COLLIDERS.
// "Cry in Bathroom" coping action teleports the PM to (16, 0, 11.5) — the
// bathroom center — facing +X (toward the mirror).

import { Text } from '@react-three/drei'
import { OFFICE } from '../config/constants'

// Color palette — slightly cooler / cleaner than the main office so the
// bathroom reads as a separate, clinical room.
const C = {
  wall: '#e8eaec', // off-white tile-like
  floor: '#d4d6d9', // pale gray tile
  fixture: '#fafbfc', // pure white porcelain
  fixtureShadow: '#dcdee0', // for shaded sides of porcelain
  chrome: '#b8bcc0', // tap, drain
  mirror: '#a8c8e0', // emissive glass
  toiletSeat: '#1a1a1a', // gloss black seat ring
  signTeal: '#4fa9a3',
  signText: '#15191c',
}

// Bathroom interior bounds — used to position both the floor tile and
// the fixtures. Pulled out as constants so the teleport target in
// CopingBar.tsx (16, 11.5) matches the geometric center here.
const BATH_MIN_X = 14
const BATH_MAX_X = 18
const BATH_MIN_Z = 10
const BATH_MAX_Z = 13
const BATH_CENTER_X = (BATH_MIN_X + BATH_MAX_X) / 2 // 16
const BATH_CENTER_Z = (BATH_MIN_Z + BATH_MAX_Z) / 2 // 11.5
const BATH_WIDTH = BATH_MAX_X - BATH_MIN_X // 4
const BATH_DEPTH = BATH_MAX_Z - BATH_MIN_Z // 3

// Doorway gap on the left partition wall (x=14), 1m tall opening from
// z=11 to z=12. Must match ROOM_COLLIDERS bathroom split walls.
const DOOR_MIN_Z = 11
const DOOR_MAX_Z = 12

export function Bathroom() {
  return (
    <group>
      {/* Tile floor — slightly raised above main floor to z-bias and shows
          a distinct color. */}
      <mesh
        position={[BATH_CENTER_X, 0.012, BATH_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[BATH_WIDTH - 0.05, BATH_DEPTH - 0.05]} />
        <meshStandardMaterial color={C.floor} roughness={0.7} />
      </mesh>

      {/* Mood light — cool blue-gray point light inside the bathroom bounds.
          The narrative point of "Cry in Bathroom" is *escape* from the
          fluorescent office — so the room should feel different when the
          PM teleports in. Low intensity + tight distance keeps it
          contained to the bathroom; the cool color contrasts with the
          warmer office ambient. */}
      <pointLight
        position={[BATH_CENTER_X, OFFICE.wallHeight - 0.8, BATH_CENTER_Z]}
        intensity={0.55}
        color="#9ab2c4"
        distance={5.5}
        decay={1.6}
      />
      {/* Subtle ceiling source — a small darker patch above the bathroom
          that occludes a bit of the office's overhead ceiling-panel glow
          and underlines the "clinical, not cheery" vibe. */}
      <mesh
        position={[BATH_CENTER_X, OFFICE.wallHeight - 0.04, BATH_CENTER_Z]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[BATH_WIDTH - 0.1, BATH_DEPTH - 0.1]} />
        <meshStandardMaterial color="#cdd5dc" roughness={0.4} />
      </mesh>

      {/* ---------- Partition walls ---------- */}
      {/* Front partition at z=10, full width across bathroom */}
      <PartitionWall
        cx={BATH_CENTER_X}
        cz={BATH_MIN_Z}
        width={BATH_WIDTH}
        axis="x"
      />
      {/* Left partition at x=14, split into two segments around the doorway gap */}
      <PartitionWall
        cx={BATH_MIN_X}
        cz={(BATH_MIN_Z + DOOR_MIN_Z) / 2}
        width={DOOR_MIN_Z - BATH_MIN_Z}
        axis="z"
      />
      <PartitionWall
        cx={BATH_MIN_X}
        cz={(DOOR_MAX_Z + BATH_MAX_Z) / 2}
        width={BATH_MAX_Z - DOOR_MAX_Z}
        axis="z"
      />

      {/* "Bathroom" doorway sign — small label above the door opening. */}
      <Text
        position={[BATH_MIN_X - 0.06, 2.4, (DOOR_MIN_Z + DOOR_MAX_Z) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.16}
        color={C.signText}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.005}
        outlineColor={C.wall}
      >
        BATHROOM
      </Text>

      {/* Doorway frame — thin teal strip above the doorway gap, mimics the
          dept-sign band so it reads as a "room entrance". */}
      <mesh
        position={[BATH_MIN_X, 2.55, (DOOR_MIN_Z + DOOR_MAX_Z) / 2]}
      >
        <boxGeometry args={[0.085, 0.06, DOOR_MAX_Z - DOOR_MIN_Z]} />
        <meshStandardMaterial
          color={C.signTeal}
          emissive={C.signTeal}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* ---------- Toilet (against bathroom back wall = office front wall z=13) ---------- */}
      <Toilet x={15} z={12.6} />

      {/* ---------- Sink + mirror (against right wall x=18) ---------- */}
      <Sink x={17.55} z={11} />
      <Mirror x={17.93} z={11} />

      {/* ---------- Small extras for flavor ---------- */}
      {/* Toilet paper roll on the wall next to the toilet */}
      <mesh position={[14.3, 0.9, 12.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
        <meshStandardMaterial color={C.fixture} roughness={0.85} />
      </mesh>
      {/* Tile motif: a subtle horizontal line at chair-rail height around
          the interior. Just on the back wall for now (cheapest cue). */}
      <mesh position={[BATH_CENTER_X, 1.1, OFFICE.halfDepth - 0.12]}>
        <boxGeometry args={[BATH_WIDTH - 0.1, 0.015, 0.005]} />
        <meshStandardMaterial color={C.signTeal} emissive={C.signTeal} emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}

// Generic partition wall — a vertical slab. `axis` is the direction the
// wall runs along ('x' means it lies in the X direction at constant z;
// 'z' means it runs along Z at constant x).
function PartitionWall({
  cx,
  cz,
  width,
  axis,
}: {
  cx: number
  cz: number
  width: number
  axis: 'x' | 'z'
}) {
  const wallH = OFFICE.wallHeight
  const wallThickness = 0.08
  const args: [number, number, number] =
    axis === 'x'
      ? [width, wallH, wallThickness]
      : [wallThickness, wallH, width]
  return (
    <mesh position={[cx, wallH / 2, cz]} receiveShadow castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#e8eaec" roughness={0.6} />
    </mesh>
  )
}

function Toilet({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Tank — taller rectangular box against the back wall (z+) */}
      <mesh position={[0, 0.85, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.55, 0.18]} />
        <meshStandardMaterial color="#fafbfc" roughness={0.4} />
      </mesh>
      {/* Tank lid — slightly darker top */}
      <mesh position={[0, 1.135, 0.15]}>
        <boxGeometry args={[0.44, 0.025, 0.2]} />
        <meshStandardMaterial color="#e8eaec" roughness={0.5} />
      </mesh>
      {/* Bowl — pedestal block */}
      <mesh position={[0, 0.27, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.45, 0.5]} />
        <meshStandardMaterial color="#fafbfc" roughness={0.4} />
      </mesh>
      {/* Seat ring — flattened cylinder, gloss black */}
      <mesh position={[0, 0.51, -0.05]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>
      {/* Hole in seat — sunken slightly */}
      <mesh position={[0, 0.5, -0.05]}>
        <cylinderGeometry args={[0.12, 0.12, 0.01, 20]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Flush handle — small chrome lever on tank side */}
      <mesh position={[-0.2, 0.95, 0.18]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.07, 0.018, 0.02]} />
        <meshStandardMaterial color="#b8bcc0" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Sink({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Counter slab — under-mount style, sticks out from right wall */}
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.05, 0.65]} />
        <meshStandardMaterial color="#dcdee0" roughness={0.5} />
      </mesh>
      {/* Basin — recessed bowl. Use a darker thin cylinder to give depth illusion. */}
      <mesh position={[0, 0.808, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        <meshStandardMaterial color="#bcc0c4" roughness={0.7} />
      </mesh>
      {/* Drain */}
      <mesh position={[0, 0.795, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.005, 12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Tap base + spout */}
      <mesh position={[0.16, 0.86, -0.18]}>
        <cylinderGeometry args={[0.022, 0.022, 0.04, 12]} />
        <meshStandardMaterial color="#b8bcc0" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Tap stem — vertical chrome cylinder */}
      <mesh position={[0.16, 0.96, -0.18]}>
        <cylinderGeometry args={[0.014, 0.014, 0.16, 12]} />
        <meshStandardMaterial color="#b8bcc0" metalness={0.85} roughness={0.18} />
      </mesh>
      {/* Tap spout — angled forward toward basin */}
      <mesh position={[0.16, 1.02, -0.08]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
        <meshStandardMaterial color="#b8bcc0" metalness={0.85} roughness={0.18} />
      </mesh>
      {/* Cabinet under the counter — boxy dark base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.78, 0.55]} />
        <meshStandardMaterial color="#3a3530" roughness={0.7} />
      </mesh>
    </group>
  )
}

function Mirror({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Frame — black border, mounted on the right wall */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[0.65, 0.85, 0.025]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Mirror surface — emissive cyan-blue suggesting reflection */}
      <mesh position={[0, 1.7, 0.014]}>
        <planeGeometry args={[0.58, 0.78]} />
        <meshStandardMaterial
          color="#a8c8e0"
          emissive="#a8c8e0"
          emissiveIntensity={0.35}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </group>
  )
}
