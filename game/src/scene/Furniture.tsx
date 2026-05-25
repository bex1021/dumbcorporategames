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
export function Workstation({
  showChair = true,
}: {
  showChair?: boolean
}) {
  return (
    <group>
      {showChair && <Chair />}
      {/* Desk in front of the sitter (at -Z in local frame, since sitter
          faces -Z). Closer than before so knees fit under the desk top. */}
      <group position={[0, 0, -0.7]}>
        <Desk />
        <Monitor />
      </group>
    </group>
  )
}
