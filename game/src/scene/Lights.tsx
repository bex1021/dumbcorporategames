// Lumon-coded fluorescent lighting: flat cool ambient + a regular grid of
// EMISSIVE ceiling panels for the visual look. Actual room illumination
// comes from ambient + hemisphere + a small number of room-level point
// lights (not one per panel — that would exceed Three.js's per-material
// light slot limit and break shader compilation).

import { OFFICE } from '../config/constants'

const PANEL_ROWS = 3
const PANEL_COLS = 5
const PANEL_W = 1.6
const PANEL_D = 0.6
const PANEL_Y = OFFICE.wallHeight - 0.05

function panelPositions(): { x: number; z: number }[] {
  const xs: number[] = []
  for (let i = 0; i < PANEL_COLS; i++) {
    const t = (i + 1) / (PANEL_COLS + 1)
    xs.push(-OFFICE.halfWidth + t * OFFICE.width)
  }
  const zs: number[] = []
  for (let j = 0; j < PANEL_ROWS; j++) {
    const t = (j + 1) / (PANEL_ROWS + 1)
    zs.push(-OFFICE.halfDepth + t * OFFICE.depth)
  }
  const out: { x: number; z: number }[] = []
  for (const z of zs) for (const x of xs) out.push({ x, z })
  return out
}

const PANELS = panelPositions()

const ROOM_LIGHTS: { x: number; y: number; z: number }[] = [
  { x: -10, y: OFFICE.wallHeight - 0.5, z: 0 },
  { x: 10, y: OFFICE.wallHeight - 0.5, z: 0 },
  { x: 0, y: OFFICE.wallHeight - 0.5, z: -6 },
]

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.95} color="#eef2f5" />
      <hemisphereLight args={['#e2eaef', '#9aa7ad', 0.5]} />
      <directionalLight
        position={[4, 8, -OFFICE.halfDepth]}
        intensity={0.45}
        color="#d6e4ec"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-OFFICE.halfWidth}
        shadow-camera-right={OFFICE.halfWidth}
        shadow-camera-top={OFFICE.halfDepth}
        shadow-camera-bottom={-OFFICE.halfDepth}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      {ROOM_LIGHTS.map((p, i) => (
        <pointLight
          key={`room-${i}`}
          position={[p.x, p.y, p.z]}
          intensity={0.4}
          color="#e8eef2"
          distance={14}
          decay={1.3}
        />
      ))}
      {PANELS.map(({ x, z }, i) => (
        <CeilingPanel key={`panel-${i}`} x={x} z={z} />
      ))}
    </>
  )
}

function CeilingPanel({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <mesh position={[x, PANEL_Y - 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PANEL_W + 0.12, PANEL_D + 0.12]} />
        <meshStandardMaterial color="#4fa9a3" side={2} />
      </mesh>
      <mesh position={[x, PANEL_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PANEL_W, PANEL_D]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1.4}
          side={2}
        />
      </mesh>
    </group>
  )
}
