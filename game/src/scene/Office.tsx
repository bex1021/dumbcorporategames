import { Text } from '@react-three/drei'
import { OFFICE, ZONES, WINDOWS } from '../config/constants'
import { WallClock } from './WallClock'

// ---- Office palette ----
// Severance bones (white walls, fluorescent ceiling) softened with warm
// wood plank floors and a single accent wall in the brand teal. The
// architectural elements stay clinical; the warm floor + accent wall do
// the work of making the room feel inhabited.
const C = {
  floor: '#c8a878', // light blonde wood plank
  floorPlank: '#8a6a44', // darker line for plank seams
  wall: '#eef0f1', // off-white
  accentWall: '#5e9a96', // muted brand teal — used on the front wall only
  ceiling: '#e6e9ec', // slightly cooler than walls
  roomFloor: '#d4dadf',
  roomWall: '#e4e8eb',
  windowFrame: '#2a2f33',
  fixture: '#8a9499', // for coffee, doors — cool gray instead of warm wood
  fixtureAccent: '#3d4549',
  teal: '#4fa9a3', // Lumon-ish accent
  text: '#15191c',
  textOutline: '#f6f7f8',
} as const

export function Office() {
  return (
    <group>
      {/* Floor — light oak wood plank base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[OFFICE.width, OFFICE.depth]} />
        <meshStandardMaterial color={C.floor} roughness={0.85} />
      </mesh>

      {/* Plank seams — thin dark strips running along Z, suggesting boards
          oriented north-south. Spacing 1.2m gives a believable wide-plank
          look without making the floor visually busy. */}
      <PlankSeams />

      {/* Faint cross-direction lines so the floor still reads as gridded
          near the camera (not totally bare oak). Subtle wood-tone, not teal. */}
      <gridHelper
        args={[Math.max(OFFICE.width, OFFICE.depth), 12, C.floorPlank, C.floorPlank]}
        position={[0, 0.012, 0]}
      />

      {/* Walls */}
      <FrontWall />
      <BackWallWithWindows />
      <SideWall x={-OFFICE.halfWidth} />
      <SideWall x={OFFICE.halfWidth} />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, OFFICE.wallHeight, 0]}>
        <planeGeometry args={[OFFICE.width, OFFICE.depth]} />
        <meshStandardMaterial color={C.ceiling} side={2} />
      </mesh>

      {/* Zones — floor markers + signs */}
      {ZONES.map((z) => (
        <Zone key={z.id} {...z} />
      ))}

      {/* Severance-style wall clock on the back wall, right-segment.
          Reads the gameStore's timeMinutes so the standup deadline is *felt*
          in the world, not just labeled in the HUD chip. Position offset
          0.12m forward of the wall plane to avoid z-fighting with the wall
          and any mounted signage on the same plane. */}
      <WallClock
        position={[6, OFFICE.wallHeight - 0.65, -OFFICE.halfDepth + 0.12]}
      />
    </group>
  )
}

function FrontWall() {
  // Accent wall — brand teal. Visible when the PM turns around at spawn
  // or walks back toward the bathroom; defines the entrance side.
  return (
    <mesh position={[0, OFFICE.wallHeight / 2, OFFICE.halfDepth]} receiveShadow>
      <boxGeometry args={[OFFICE.width, OFFICE.wallHeight, 0.2]} />
      <meshStandardMaterial color={C.accentWall} />
    </mesh>
  )
}

// Plank seams: render N thin darker strips along the floor running parallel
// to the Z axis (so the "boards" run north-south). Each strip is a tiny
// box just above the main floor mesh so it sits on top.
function PlankSeams() {
  const plankWidth = 1.2
  const count = Math.ceil(OFFICE.width / plankWidth)
  const strips = []
  for (let i = 0; i <= count; i++) {
    const x = -OFFICE.halfWidth + i * plankWidth
    if (x > OFFICE.halfWidth) break
    strips.push(x)
  }
  return (
    <group position={[0, 0.011, 0]}>
      {strips.map((x, i) => (
        <mesh key={`plank-${i}`} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, OFFICE.depth]} />
          <meshStandardMaterial color={C.floorPlank} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function SideWall({ x }: { x: number }) {
  return (
    <mesh
      position={[x, OFFICE.wallHeight / 2, 0]}
      rotation={[0, Math.PI / 2, 0]}
      receiveShadow
    >
      <boxGeometry args={[OFFICE.depth, OFFICE.wallHeight, 0.2]} />
      <meshStandardMaterial color={C.wall} />
    </mesh>
  )
}

// Back wall split into wall segments around windows.
function BackWallWithWindows() {
  const z = -OFFICE.halfDepth
  const wallTop = OFFICE.wallHeight
  const windowBottomY = 1.0 // window sits from y=1.0 to y=3.0
  const windowTopY = 3.0

  // Build horizontal segments between windows + above/below each window.
  // Sort windows by x to compute the gaps cleanly.
  const sorted = [...WINDOWS].sort((a, b) => a.x - b.x)

  // X-boundaries of solid wall (everywhere except the window cutouts).
  // We'll render the back wall in pieces.
  const segments: { xStart: number; xEnd: number }[] = []
  let cursor = -OFFICE.halfWidth
  for (const w of sorted) {
    const wStart = w.x - w.w / 2
    const wEnd = w.x + w.w / 2
    if (wStart > cursor) segments.push({ xStart: cursor, xEnd: wStart })
    cursor = wEnd
  }
  if (cursor < OFFICE.halfWidth) segments.push({ xStart: cursor, xEnd: OFFICE.halfWidth })

  return (
    <group>
      {/* Full-height wall segments between windows */}
      {segments.map((s, i) => {
        const w = s.xEnd - s.xStart
        const cx = (s.xStart + s.xEnd) / 2
        return (
          <mesh key={`seg-${i}`} position={[cx, wallTop / 2, z]} receiveShadow>
            <boxGeometry args={[w, wallTop, 0.2]} />
            <meshStandardMaterial color={C.wall} />
          </mesh>
        )
      })}

      {/* Above/below window strips + glass + frame */}
      {sorted.map((w) => (
        <group key={`win-${w.x}`} position={[w.x, 0, z]}>
          {/* Strip below window */}
          <mesh position={[0, windowBottomY / 2, 0]} receiveShadow>
            <boxGeometry args={[w.w, windowBottomY, 0.2]} />
            <meshStandardMaterial color={C.wall} />
          </mesh>
          {/* Strip above window */}
          <mesh position={[0, (windowTopY + wallTop) / 2, 0]} receiveShadow>
            <boxGeometry args={[w.w, wallTop - windowTopY, 0.2]} />
            <meshStandardMaterial color={C.wall} />
          </mesh>
          {/* Window frame (4 thin bars around the glass) */}
          <mesh position={[0, windowBottomY, 0.0]}>
            <boxGeometry args={[w.w, 0.08, 0.22]} />
            <meshStandardMaterial color={C.windowFrame} />
          </mesh>
          <mesh position={[0, windowTopY, 0.0]}>
            <boxGeometry args={[w.w, 0.08, 0.22]} />
            <meshStandardMaterial color={C.windowFrame} />
          </mesh>
          <mesh position={[-w.w / 2, (windowBottomY + windowTopY) / 2, 0.0]}>
            <boxGeometry args={[0.08, windowTopY - windowBottomY, 0.22]} />
            <meshStandardMaterial color={C.windowFrame} />
          </mesh>
          <mesh position={[w.w / 2, (windowBottomY + windowTopY) / 2, 0.0]}>
            <boxGeometry args={[0.08, windowTopY - windowBottomY, 0.22]} />
            <meshStandardMaterial color={C.windowFrame} />
          </mesh>
          {/* Mullion (vertical center bar) */}
          <mesh position={[0, (windowBottomY + windowTopY) / 2, 0.0]}>
            <boxGeometry args={[0.05, windowTopY - windowBottomY, 0.22]} />
            <meshStandardMaterial color={C.windowFrame} />
          </mesh>
          {/* Glass — emissive sky color so it reads as daylight */}
          <mesh position={[0, (windowBottomY + windowTopY) / 2, 0.02]}>
            <planeGeometry args={[w.w - 0.16, windowTopY - windowBottomY - 0.16]} />
            <meshStandardMaterial
              color="#a8c8e0"
              emissive="#9fc4e8"
              emissiveIntensity={0.6}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Zone({
  label,
  kind,
  x,
  z,
  w,
  d,
}: {
  id: string
  label: string
  kind: string
  x: number
  z: number
  w?: number
  d?: number
}) {
  return (
    <group position={[x, 0, z]}>
      {kind === 'room' && w && d && <Room w={w} d={d} />}
      {kind === 'desk' && <DeskMarker />}
      {kind === 'coffee' && <CoffeeMachine />}
      {kind === 'door' && <BathroomDoor />}

      <Text
        position={[0, kind === 'room' ? 2.9 : 1.5, 0]}
        fontSize={kind === 'room' ? 0.34 : 0.24}
        color={C.text}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.014}
        outlineColor={C.textOutline}
      >
        {label}
      </Text>
    </group>
  )
}

function Room({ w, d }: { w: number; d: number }) {
  // Floor accent tile + 3-wall partition (back + sides, front open as doorway).
  // Slightly cooler tile than the main floor so the room reads as a "zone".
  const wallH = 2.4
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={C.roomFloor} />
      </mesh>
      {/* Back wall + teal accent stripe at top (Lumon doorway header band) */}
      <mesh position={[0, wallH / 2, -d / 2 + 0.04]} receiveShadow>
        <boxGeometry args={[w, wallH, 0.08]} />
        <meshStandardMaterial color={C.roomWall} />
      </mesh>
      <mesh position={[0, wallH - 0.05, -d / 2 + 0.045]}>
        <boxGeometry args={[w, 0.06, 0.085]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.15} />
      </mesh>
      {/* Left side */}
      <mesh position={[-w / 2 + 0.04, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.08, wallH, d]} />
        <meshStandardMaterial color={C.roomWall} />
      </mesh>
      {/* Right side */}
      <mesh position={[w / 2 - 0.04, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.08, wallH, d]} />
        <meshStandardMaterial color={C.roomWall} />
      </mesh>
    </group>
  )
}

function DeskMarker() {
  // PM's desk — cool gray surface instead of warm wood
  return (
    <group>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.04, 0.8]} />
        <meshStandardMaterial color={C.fixture} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.5, 0.7, 0.04]} />
        <meshStandardMaterial color={C.fixture} />
      </mesh>
    </group>
  )
}

function CoffeeMachine() {
  return (
    <group>
      {/* Counter — sterile gray */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.9, 0.6]} />
        <meshStandardMaterial color={C.fixture} />
      </mesh>
      {/* Coffee machine on top — gloss black still works, very Severance */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.4]} />
        <meshStandardMaterial color={C.fixtureAccent} />
      </mesh>
      {/* Spout */}
      <mesh position={[0, 0.95, 0.18]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Tiny teal status LED on the machine — Lumon-y detail */}
      <mesh position={[0.18, 1.18, 0.21]}>
        <boxGeometry args={[0.04, 0.02, 0.01]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function BathroomDoor() {
  return (
    <group>
      {/* Door frame against the front wall — sterile gray with teal accent */}
      <mesh position={[0, 1.05, -0.05]} castShadow>
        <boxGeometry args={[1.0, 2.1, 0.08]} />
        <meshStandardMaterial color={C.fixture} />
      </mesh>
      {/* Teal vertical accent stripe on the door */}
      <mesh position={[0, 1.05, -0.01]}>
        <boxGeometry args={[0.05, 2.0, 0.01]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.2} />
      </mesh>
      {/* Door handle */}
      <mesh position={[0.35, 1.0, 0.0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#c8c8c8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}
