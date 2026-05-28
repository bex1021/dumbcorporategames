// Desks, chairs, monitors — built from primitives. All face -Z in local space
// (front of the desk faces -Z; chair backrest is at +Z side so a seated person
// facing -Z has their back against it).

export function Desk({
  width = 1.6,
  depth = 0.8,
  color = '#7a6a48',
}: {
  width?: number
  depth?: number
  color?: string
}) {
  return (
    <group>
      {/* Top */}
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Modesty panel — on the FAR side of the desk (away from the sitter)
          so their knees fit under the desk top. */}
      <mesh position={[0, 0.4, -depth / 2 + 0.04]} castShadow>
        <boxGeometry args={[width - 0.1, 0.7, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Legs at 4 corners */}
      <DeskLeg x={-width / 2 + 0.05} z={-depth / 2 + 0.05} />
      <DeskLeg x={width / 2 - 0.05} z={-depth / 2 + 0.05} />
      <DeskLeg x={-width / 2 + 0.05} z={depth / 2 - 0.05} />
      <DeskLeg x={width / 2 - 0.05} z={depth / 2 - 0.05} />
    </group>
  )
}

function DeskLeg({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.38, z]} castShadow>
      <boxGeometry args={[0.05, 0.74, 0.05]} />
      <meshStandardMaterial color="#4a4035" />
    </mesh>
  )
}

export function Chair() {
  return (
    <group>
      {/* Base — 5-star simplified to a flat disc */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 16]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Gas-lift stem */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.4, 12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color="#3a3a40" />
      </mesh>
      {/* Backrest — at +Z side so a sitter facing -Z has their back against it */}
      <mesh position={[0, 0.85, 0.22]} castShadow>
        <boxGeometry args={[0.5, 0.55, 0.06]} />
        <meshStandardMaterial color="#3a3a40" />
      </mesh>
    </group>
  )
}

export function Monitor() {
  return (
    <group>
      {/* Stand base */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.25, 0.02, 0.18]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Stand post */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.06, 0.25, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Screen — slight tilt back */}
      <group position={[0, 1.12, 0]} rotation={[-0.08, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.36, 0.04]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        {/* Screen glow (front face) */}
        <mesh position={[0, 0, 0.021]}>
          <planeGeometry args={[0.56, 0.32]} />
          <meshStandardMaterial color="#1f2a3a" emissive="#1f2a3a" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  )
}

// A complete workstation: chair (at NPC position) + desk + monitor behind.
// Assumes parent sets rotation so chair backrest is between NPC and desk.
// `id` is optional; if provided, adds NPC-specific personality items
// (Brent's mug collection, Tasha's Wacom, Priya's sticky-note pile, etc).
export function Workstation({
  showChair = true,
  id,
}: {
  showChair?: boolean
  id?: string
}) {
  return (
    <group>
      {showChair && <Chair />}
      {/* Desk in front of the sitter (at -Z in local frame, since sitter
          faces -Z). Closer than before so knees fit under the desk top. */}
      <group position={[0, 0, -0.7]}>
        <Desk />
        <Monitor />
        <DeskItems id={id} />
      </group>
    </group>
  )
}

// Items on the desk surface — keyboard, mouse, mug, papers, pen, sticky.
// `id` selects per-NPC accents on top of the shared base. Coordinate frame
// is the desk's local frame (centered at workstation z=-0.7):
//   - z=-0.4 is back edge (modesty panel)
//   - z=+0.4 is front edge (sitter side)
//   - y=0.78 is desk surface height (items sit slightly above)
function DeskItems({ id }: { id?: string }) {
  return (
    <group>
      {/* Keyboard — in front of monitor, slight raised key panel on top */}
      <mesh position={[0, 0.79, -0.05]} castShadow>
        <boxGeometry args={[0.42, 0.018, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.802, -0.05]}>
        <boxGeometry args={[0.4, 0.005, 0.12]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mouse — right of keyboard */}
      <mesh position={[0.3, 0.79, -0.05]} castShadow>
        <boxGeometry args={[0.055, 0.022, 0.085]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>

      {/* Coffee mug — right side, behind keyboard */}
      <Mug pos={[0.5, 0.81, -0.25]} color="#d8c8a8" />

      {/* Papers stack — left side, 2 sheets slightly offset */}
      <mesh position={[-0.45, 0.785, -0.2]} castShadow>
        <boxGeometry args={[0.18, 0.005, 0.22]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>
      <mesh
        position={[-0.46, 0.79, -0.215]}
        rotation={[0, 0.12, 0]}
        castShadow
      >
        <boxGeometry args={[0.18, 0.005, 0.22]} />
        <meshStandardMaterial color="#fff8d8" />
      </mesh>

      {/* Pen — horizontal, angled across the desk near the keyboard */}
      <mesh position={[-0.18, 0.788, 0.05]} rotation={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.13, 0.012, 0.012]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>

      {/* Single sticky note — yellow, back-left of monitor */}
      <mesh position={[-0.22, 0.795, -0.32]}>
        <boxGeometry args={[0.055, 0.002, 0.055]} />
        <meshStandardMaterial color="#fce97a" />
      </mesh>

      {/* Per-NPC personality accents */}
      {id === 'brent' && <BrentAccents />}
      {id === 'tasha' && <TashaAccents />}
      {id === 'priya' && <PriyaAccents />}
      {id === 'chad' && <ChadAccents />}
    </group>
  )
}

// Small ceramic mug — cylindrical body + torus handle on the side.
function Mug({
  pos,
  color,
}: {
  pos: [number, number, number]
  color: string
}) {
  return (
    <group position={pos}>
      <mesh castShadow>
        <cylinderGeometry args={[0.038, 0.034, 0.075, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Coffee inside (visible from above) */}
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.005, 10]} />
        <meshStandardMaterial color="#3a2010" />
      </mesh>
      {/* Handle */}
      <mesh position={[0.045, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.017, 0.005, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

// Brent (Eng): the engineer-with-too-many-mugs cliché — 3 extra mugs
// scattered, all unwashed.
function BrentAccents() {
  return (
    <>
      <Mug pos={[0.42, 0.81, -0.32]} color="#c8b89a" />
      <Mug pos={[0.58, 0.81, -0.13]} color="#a8c4d8" />
      <Mug pos={[-0.62, 0.81, -0.05]} color="#a89c8a" />
      {/* Empty energy drink can — small dark cylinder */}
      <mesh position={[0.62, 0.815, 0.05]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 12]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
    </>
  )
}

// Tasha (Design): Wacom tablet + stylus + a strip of color swatches.
function TashaAccents() {
  return (
    <>
      {/* Wacom tablet — dark slab with subtle inset surface */}
      <mesh position={[0.05, 0.79, 0.13]} castShadow>
        <boxGeometry args={[0.28, 0.014, 0.18]} />
        <meshStandardMaterial color="#15191c" roughness={0.5} />
      </mesh>
      {/* Active drawing area inset */}
      <mesh position={[0.05, 0.798, 0.13]}>
        <boxGeometry args={[0.22, 0.003, 0.14]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>
      {/* Stylus — thin rod next to the tablet */}
      <mesh
        position={[0.27, 0.787, 0.18]}
        rotation={[0, 0.6, 0]}
        castShadow
      >
        <boxGeometry args={[0.12, 0.01, 0.01]} />
        <meshStandardMaterial color="#3a3a40" />
      </mesh>
      {/* Color swatch strip — chips. Green chip removed per playtest (the
          green box read as an out-of-place debug object). */}
      {['#e8a8a8', '#a8c8e0', '#fce97a'].map((c, i) => (
        <mesh
          key={i}
          position={[-0.45 + i * 0.045, 0.792, -0.34]}
          castShadow
        >
          <boxGeometry args={[0.035, 0.004, 0.05]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </>
  )
}

// Priya (Product): the PM with a stack of sticky notes for every "tiny
// thought" and a navy notebook (Jira backlog journal).
function PriyaAccents() {
  return (
    <>
      {/* Extra sticky notes in 3 colors, scattered */}
      <mesh position={[-0.35, 0.797, -0.27]}>
        <boxGeometry args={[0.06, 0.002, 0.06]} />
        <meshStandardMaterial color="#f5b6b6" />
      </mesh>
      <mesh position={[-0.28, 0.799, -0.36]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.055, 0.002, 0.055]} />
        <meshStandardMaterial color="#a8c8e0" />
      </mesh>
      {/* (Removed the third, green sticky note — playtest flagged the green
          box reading as an out-of-place debug object against the palette.) */}
      {/* Bound notebook — navy with a thin red band */}
      <mesh position={[0.42, 0.795, 0.12]} castShadow>
        <boxGeometry args={[0.18, 0.022, 0.23]} />
        <meshStandardMaterial color="#3a4f7a" roughness={0.7} />
      </mesh>
      <mesh position={[0.42, 0.806, 0.0]}>
        <boxGeometry args={[0.18, 0.001, 0.02]} />
        <meshStandardMaterial color="#c44a4a" />
      </mesh>
      {/* Highlighter pen — bright orange */}
      <mesh
        position={[0.15, 0.79, 0.15]}
        rotation={[0, 0.8, 0]}
        castShadow
      >
        <boxGeometry args={[0.11, 0.015, 0.015]} />
        <meshStandardMaterial color="#f08020" />
      </mesh>
    </>
  )
}

// Chad (Sales): Bluetooth headset + branded water bottle + face-down phone.
function ChadAccents() {
  return (
    <>
      {/* Bluetooth headset — small black thing on the desk */}
      <mesh position={[0.4, 0.795, 0.1]} castShadow>
        <boxGeometry args={[0.07, 0.025, 0.04]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
      {/* Headset boom arm */}
      <mesh
        position={[0.42, 0.81, 0.06]}
        rotation={[0, 0, 0.4]}
        castShadow
      >
        <cylinderGeometry args={[0.005, 0.005, 0.07, 6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Branded water bottle — tall blue cylinder + dark cap */}
      <mesh position={[-0.6, 0.92, 0.05]} castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.28, 14]} />
        <meshStandardMaterial color="#3a4f7a" roughness={0.4} />
      </mesh>
      <mesh position={[-0.6, 1.075, 0.05]}>
        <cylinderGeometry args={[0.038, 0.038, 0.025, 12]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
      {/* "ALIGNLY" band around the bottle — small teal stripe */}
      <mesh position={[-0.6, 0.9, 0.05]}>
        <cylinderGeometry args={[0.041, 0.041, 0.025, 14]} />
        <meshStandardMaterial
          color="#4fa9a3"
          emissive="#4fa9a3"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Phone face-down on the desk */}
      <mesh position={[0.55, 0.787, -0.22]} castShadow>
        <boxGeometry args={[0.07, 0.008, 0.13]} />
        <meshStandardMaterial color="#15191c" />
      </mesh>
    </>
  )
}
