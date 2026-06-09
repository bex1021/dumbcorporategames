// Lunch Dash world — a varied graybox city of recognizable districts (NYC/SF/
// Boston/Austin/LA) plus office parks, landmarks, and countryside. Buildings &
// park trees render as InstancedMesh (one draw call each). See cityLayout.

import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Text, Billboard } from '@react-three/drei'
import { Object3D, Color, InstancedMesh, PlaneGeometry, Float32BufferAttribute, BufferGeometry, DoubleSide } from 'three'
import { terrainHeight } from './terrain'
import { DRIVE_WORLD } from './driveConfig'
import { DESTINATIONS, type Destination } from './destinations'
import {
  BUILDINGS,
  HQ_BUILDING,
  BARNS,
  WATER,
  TREES,
  PALMS,
  COUNTRY_FIELDS,
  COUNTRY_TREES,
  BRIDGES,
  AVENUES,
  TUNNEL,
  PARKING,
  LANDMARKS,
  DOCKS,
  OVERPASS,
  ROADS,
  roadWidth,
  paintGaps,
  GREEN_AREAS,
  DISTRICT_REGIONS,
  SIGNALS,
  type Rect,
  type Landmark,
  type Road,
} from './cityLayout'
import { useLunchStore } from './lunchStore'
import { TrafficCars } from './Traffic'
import { Pedestrians } from './Pedestrians'

// Sink each building so its flat base doesn't float on a slope: sample terrain
// at the footprint corners, set the bottom below the lowest corner and the top
// the building's height above the highest, then scale to span that.
const BOX_ITEMS = [...BUILDINGS, HQ_BUILDING, ...BARNS].map((b) => {
  const hw = b.w / 2
  const hd = b.d / 2
  const corners = [
    terrainHeight(b.x - hw, b.z - hd),
    terrainHeight(b.x + hw, b.z - hd),
    terrainHeight(b.x - hw, b.z + hd),
    terrainHeight(b.x + hw, b.z + hd),
    terrainHeight(b.x, b.z),
  ]
  const minH = Math.min(...corners)
  const maxH = Math.max(...corners)
  const top = maxH + b.h
  const bottom = minH - 1.5 // bury the base below the lowest corner
  return { x: b.x, y: (top + bottom) / 2, z: b.z, w: b.w, h: top - bottom, d: b.d, color: b.color }
})
const TREE_ITEMS = [...TREES, ...COUNTRY_TREES]

export function DriveWorld() {
  return (
    <>
      <DriveLights />
      <Ground />
      <Patches rects={COUNTRY_FIELDS} y={0.015} color="#7e8a55" />
      <ParkingLots />
      <Avenues />
      <Roads />
      <SignalMarkings />
      <Bridges />
      <TrafficLights />
      <Docks />
      <Tunnel />
      <Overpass />
      <InstancedBoxes items={BOX_ITEMS} />
      <InstancedTrees />
      <Palms />
      <Landmarks />
      <TrafficCars />
      <Pedestrians />
      <Beacons />
    </>
  )
}

function DriveLights() {
  return (
    <>
      <ambientLight intensity={0.6} color="#f0eee8" />
      <hemisphereLight args={['#dfe3e6', '#9a978f', 0.35]} />
      <directionalLight position={[140, 180, 90]} intensity={0.95} color="#f3ecdd" />
    </>
  )
}

function Ground() {
  // Displaced, vertex-colored ground: flat grey asphalt across the city, rising
  // into green hills in the north. The plane is built in local XY then rotated
  // -90° about X, so local (x, y) → world (x, height, -y); we set local Z to the
  // terrain height and sample terrainHeight at (x, -y) = (worldX, worldZ).
  const geo = useMemo(() => {
    const size = DRIVE_WORLD.half * 2
    const seg = 320 // finer ground so hills are smoother (less poke-through under roads)
    const g = new PlaneGeometry(size, size, seg, seg)
    const pos = g.attributes.position
    const grey = new Color('#5e6268')
    const grass = new Color('#5f7d52')
    const water = new Color('#3f6f8c')
    const col = new Color()
    const colors = new Float32Array(pos.count * 3)
    const inAny = (x: number, z: number, rects: Rect[]) =>
      rects.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const wz = -y
      const t = terrainHeight(x, wz)
      pos.setZ(i, t)
      if (inAny(x, wz, WATER)) col.copy(water) // river + pond, painted blue
      else if (inAny(x, wz, GREEN_AREAS)) col.copy(grass) // parks, golf, cemetery
      else if (inAny(x, wz, DISTRICT_REGIONS)) col.copy(grey) // paved city block — grey even on a hill
      else col.copy(grey).lerp(grass, Math.min(t / 7, 1)) // asphalt → grass on the open hills
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3))
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial vertexColors />
    </mesh>
  )
}

function Patches({ rects, y, color }: { rects: Rect[]; y: number; color: string }) {
  return (
    <>
      {rects.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2]}>
          <planeGeometry args={[r.maxX - r.minX, r.maxZ - r.minZ]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}

function ParkingLots() {
  return (
    <>
      {PARKING.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(r.minX + r.maxX) / 2, 0.03, (r.minZ + r.maxZ) / 2]}>
          <planeGeometry args={[r.maxX - r.minX, r.maxZ - r.minZ]} />
          <meshStandardMaterial color="#4f5256" />
        </mesh>
      ))}
    </>
  )
}

function Avenues() {
  return (
    <>
      {AVENUES.map((a, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, a.rotY]} position={[a.x, 0.05, a.z]}>
          <planeGeometry args={[a.width, a.len]} />
          <meshStandardMaterial color="#585b60" />
        </mesh>
      ))}
    </>
  )
}

// Research-informed road network: wide double-yellow arterials, single-yellow
// collectors, white lane dividers + edges. Painted as thin quads just above the
// asphalt. (Local streets stay unmarked — they're the gaps between buildings.)
function Roads() {
  return (
    <>
      {ROADS.map((r, i) => (
        <RoadSeg key={i} road={r} />
      ))}
    </>
  )
}

const RD_YELLOW = '#e8c13a' // golden centerline (research: real paint, not lemon)
const RD_WHITE = '#eef0ef'
const RD_ASPHALT = '#3b3d41'
const RD_CURB = '#8d8f91'
const RD_PAINT = '#e8e6df' // off-white crosswalk / stop-bar paint

// Build a terrain-draped ribbon geometry along a centerline (shifted sideways
// by latOffset), so roads + lane lines conform to hills instead of floating.
function ribbonGeo(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  latOffset: number,
  width: number,
  yOff: number,
  gaps?: [number, number][],
) {
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz) || 1
  const px = dz / len // unit perpendicular
  const pz = -dx / len
  const steps = Math.max(2, Math.ceil(len / 2.5)) // fine enough to hug hills (no grass poking through)
  const pos = new Float32Array((steps + 1) * 6)
  const idx: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = ax + dx * t + px * latOffset
    const cz = az + dz * t + pz * latOffset
    const lx = cx - px * (width / 2)
    const lz = cz - pz * (width / 2)
    const rx = cx + px * (width / 2)
    const rz = cz + pz * (width / 2)
    const o = i * 6
    pos[o] = lx
    pos[o + 1] = terrainHeight(lx, lz) + yOff
    pos[o + 2] = lz
    pos[o + 3] = rx
    pos[o + 4] = terrainHeight(rx, rz) + yOff
    pos[o + 5] = rz
  }
  for (let i = 0; i < steps; i++) {
    // skip this quad if its midpoint falls in a gap (intersection box / dash gap)
    if (gaps) {
      const tMid = (i + 0.5) / steps
      if (gaps.some((g) => tMid > g[0] && tMid < g[1])) continue
    }
    const a0 = i * 2
    const a1 = i * 2 + 1
    const a2 = (i + 1) * 2
    const a3 = (i + 1) * 2 + 1
    idx.push(a0, a2, a1, a1, a2, a3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function RoadSeg({ road }: { road: Road }) {
  const W = roadWidth(road.type)
  const arterial = road.type === 'arterial'
  const { asphalt, walks, lines } = useMemo(() => {
    const a = road.a
    const b = road.b
    // paint + sidewalks stop at each crossing (bare-asphalt intersection box);
    // sidewalks break a touch wider so they clear the corner cleanly.
    const gaps = paintGaps(road)
    const swGaps = paintGaps(road, 5)
    const ln: { geo: BufferGeometry; color: string }[] = []
    const add = (off: number, w: number, color: string) =>
      ln.push({ geo: ribbonGeo(a.x, a.z, b.x, b.z, off, w, 0.12, gaps), color })
    if (arterial) {
      add(-0.38, 0.22, RD_YELLOW) // double-yellow center
      add(0.38, 0.22, RD_YELLOW)
      add(-W / 4, 0.16, RD_WHITE) // white lane dividers
      add(W / 4, 0.16, RD_WHITE)
    } else {
      add(0, 0.22, RD_YELLOW) // single yellow center
    }
    add(-(W / 2 - 0.5), 0.18, RD_WHITE) // white edges
    add(W / 2 - 0.5, 0.18, RD_WHITE)
    const sw = W / 2 + 2 // sidewalks just outside each edge
    return {
      asphalt: ribbonGeo(a.x, a.z, b.x, b.z, 0, W, 0.08), // continuous — paving runs through the box
      walks: [ribbonGeo(a.x, a.z, b.x, b.z, -sw, 4, 0.14, swGaps), ribbonGeo(a.x, a.z, b.x, b.z, sw, 4, 0.14, swGaps)],
      lines: ln,
    }
  }, [road, W, arterial])
  return (
    <group>
      <mesh geometry={asphalt}>
        <meshStandardMaterial color={RD_ASPHALT} side={DoubleSide} />
      </mesh>
      {walks.map((g, i) => (
        <mesh key={`w${i}`} geometry={g}>
          <meshStandardMaterial color={RD_CURB} side={DoubleSide} />
        </mesh>
      ))}
      {/* lane paint is UNLIT (meshBasic) so it stays bright like real paint */}
      {lines.map((l, i) => (
        <mesh key={i} geometry={l.geo}>
          <meshBasicMaterial color={l.color} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function Bridges() {
  return (
    <>
      {BRIDGES.map((b, i) => {
        const w = b.maxX - b.minX
        const d = b.maxZ - b.minZ
        const cx = (b.minX + b.maxX) / 2
        const cz = (b.minZ + b.maxZ) / 2
        return (
          <group key={i}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.08, cz]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#8b9097" />
            </mesh>
            {/* railings down the roadway edges (match the BRIDGE_RAILS colliders) */}
            <mesh position={[cx - 9.6, 0.95, cz]}>
              <boxGeometry args={[0.6, 1.9, d]} />
              <meshStandardMaterial color="#b6bcc2" />
            </mesh>
            <mesh position={[cx + 9.6, 0.95, cz]}>
              <boxGeometry args={[0.6, 1.9, d]} />
              <meshStandardMaterial color="#b6bcc2" />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// Overhead traffic signals (mast-arm poles) at the major intersections.
function TrafficLights() {
  return (
    <>
      {SIGNALS.map((s, i) => (
        <TrafficLight key={i} x={s.x} z={s.z} />
      ))}
    </>
  )
}

function TrafficLight({ x, z }: { x: number; z: number }) {
  const py = terrainHeight(x - 12, z)
  const armY = py + 7
  return (
    <group>
      <mesh position={[x - 12, py + 3.5, z]}>
        <cylinderGeometry args={[0.22, 0.28, 7, 8]} />
        <meshStandardMaterial color="#2f3236" />
      </mesh>
      <mesh position={[x - 6, armY, z]}>
        <boxGeometry args={[12, 0.22, 0.22]} />
        <meshStandardMaterial color="#2f3236" />
      </mesh>
      <group position={[x, armY - 1.1, z]}>
        <mesh>
          <boxGeometry args={[0.7, 1.7, 0.6]} />
          <meshStandardMaterial color="#17191b" />
        </mesh>
        <mesh position={[0, 0.5, 0.33]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color="#d23b2b" emissive="#d23b2b" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.33]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color="#3a3318" />
        </mesh>
        <mesh position={[0, -0.5, 0.33]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color="#1f3a22" />
        </mesh>
      </group>
    </group>
  )
}

// Clean intersection markings at the signalized crossings: continental (zebra)
// crosswalks framing each box + a fat stop bar set back behind each. The lane
// paint is already clipped to leave the box bare, so these read crisp instead of
// tangling with through-lines. All signals sit on flat ground (y≈0), so the
// markings are flat quads at a fixed height. Merged into one geometry = 1 draw.
function buildSignalGeo() {
  const Y = 0.13
  const pos: number[] = []
  const idx: number[] = []
  const quad = (cx: number, cz: number, hx: number, hz: number) => {
    const n = pos.length / 3
    pos.push(cx - hx, Y, cz - hz, cx + hx, Y, cz - hz, cx + hx, Y, cz + hz, cx - hx, Y, cz + hz)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  const D = 3 // crosswalk band depth (~10 ft)
  const bw = 0.55 // zebra bar width (~24 in incl. spacing)
  const period = 1.15 // bar + gap
  const sb = 1.4 // stop-bar setback beyond the crosswalk
  const sbHalf = 0.23 // stop-bar half-thickness (~18 in line)
  for (const s of SIGNALS) {
    const hv = 18 / 2 // N–S arterial half-width
    const he = (s.z === -22 || s.z === 215 ? 18 : 12) / 2 // E–W road half-width here
    // North & South crosswalks cross the N–S road → bars run in z (parallel to flow)
    for (const sign of [-1, 1]) {
      const zc = s.z + sign * (he + D / 2)
      for (let x = s.x - hv + bw; x <= s.x + hv - bw + 0.001; x += period) quad(x, zc, bw / 2, D / 2)
      quad(s.x, s.z + sign * (he + D + sb), hv, sbHalf) // stop bar
    }
    // East & West crosswalks cross the E–W road → bars run in x
    for (const sign of [-1, 1]) {
      const xc = s.x + sign * (hv + D / 2)
      for (let z = s.z - he + bw; z <= s.z + he - bw + 0.001; z += period) quad(xc, z, D / 2, bw / 2)
      quad(s.x + sign * (hv + D + sb), s.z, sbHalf, he) // stop bar
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  return g
}

function SignalMarkings() {
  const geo = useMemo(buildSignalGeo, [])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={RD_PAINT} side={DoubleSide} />
    </mesh>
  )
}

function Docks() {
  return (
    <>
      {DOCKS.map((dk, i) => (
        <group key={i}>
          <mesh position={[dk.x, 0.3, dk.z + dk.len / 2]}>
            <boxGeometry args={[4, 0.4, dk.len]} />
            <meshStandardMaterial color="#7a6a52" />
          </mesh>
          <mesh position={[dk.x, 0.6, dk.z + dk.len + 2]}>
            <boxGeometry args={[3, 1, 5]} />
            <meshStandardMaterial color="#c4cdd2" />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Tunnel() {
  const w = TUNNEL.maxX - TUNNEL.minX
  const d = TUNNEL.maxZ - TUNNEL.minZ
  return (
    <mesh position={[(TUNNEL.minX + TUNNEL.maxX) / 2, 4, (TUNNEL.minZ + TUNNEL.maxZ) / 2]}>
      <boxGeometry args={[w, 0.8, d]} />
      <meshStandardMaterial color="#3a3a3e" />
    </mesh>
  )
}

function Overpass() {
  const len = OVERPASS.maxX - OVERPASS.minX
  const cx = (OVERPASS.minX + OVERPASS.maxX) / 2
  const pillars: number[] = []
  for (let x = OVERPASS.minX + 12; x < OVERPASS.maxX; x += 36) pillars.push(x)
  return (
    <group>
      <mesh position={[cx, OVERPASS.y, OVERPASS.z]}>
        <boxGeometry args={[len, 1, OVERPASS.width]} />
        <meshStandardMaterial color="#7c7f84" />
      </mesh>
      {pillars.map((x, i) => (
        <mesh key={i} position={[x, OVERPASS.y / 2, OVERPASS.z]}>
          <boxGeometry args={[2.5, OVERPASS.y, 2.5]} />
          <meshStandardMaterial color="#6a6d72" />
        </mesh>
      ))}
    </group>
  )
}

type BoxItem = { x: number; y: number; z: number; w: number; h: number; d: number; color: string }
function InstancedBoxes({ items }: { items: BoxItem[] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(b.color))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

function InstancedTrees() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    TREE_ITEMS.forEach((t, i) => {
      o.position.set(t.x, terrainHeight(t.x, t.z) + t.h * 0.6, t.z)
      o.scale.set(1.5, t.h * 1.2, 1.5)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      c.setHSL(0.27, 0.34, 0.3 + (i % 5) * 0.02)
      m.setColorAt(i, c)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, TREE_ITEMS.length]}>
      <coneGeometry args={[1, 1, 7]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

// LA palms — thin tall trunk + a small green crown
function Palms() {
  return (
    <>
      {PALMS.map((p, i) => (
        <group key={i} position={[p.x, terrainHeight(p.x, p.z), p.z]}>
          <mesh position={[0, p.h / 2, 0]}>
            <cylinderGeometry args={[0.18, 0.28, p.h, 6]} />
            <meshStandardMaterial color="#8a7150" />
          </mesh>
          <mesh position={[0, p.h, 0]}>
            <coneGeometry args={[2, 1.6, 6]} />
            <meshStandardMaterial color="#5f7f43" />
          </mesh>
        </group>
      ))}
    </>
  )
}

// --- landmarks ---
function Landmarks() {
  return (
    <>
      {LANDMARKS.map((l, i) => (
        <group key={i} position={[l.x, terrainHeight(l.x, l.z), l.z]}>
          <LandmarkMesh l={l} />
          <Suspense fallback={null}>
            <Billboard position={[0, l.kind === 'stadium' ? 18 : 16, 0]}>
              <Text fontSize={2.4} color="#1c1c1c" anchorX="center" anchorY="middle">
                {l.label}
              </Text>
            </Billboard>
          </Suspense>
        </group>
      ))}
    </>
  )
}

function LandmarkMesh({ l }: { l: Landmark }) {
  if (l.kind === 'stadium') {
    return (
      <group>
        <mesh position={[0, 7, 0]}>
          <cylinderGeometry args={[l.r, l.r, 14, 36, 1, true]} />
          <meshStandardMaterial color="#9aa0a6" side={2} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
          <circleGeometry args={[l.r - 4, 36]} />
          <meshStandardMaterial color="#4f7a45" />
        </mesh>
      </group>
    )
  }
  if (l.kind === 'mall') {
    return (
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[l.w, 12, l.d]} />
        <meshStandardMaterial color="#b0a89a" />
      </mesh>
    )
  }
  if (l.kind === 'golf') {
    const traps: [number, number][] = [
      [-l.w * 0.2, -l.d * 0.15],
      [l.w * 0.25, l.d * 0.1],
      [0, l.d * 0.3],
    ]
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[l.w, l.d]} />
          <meshStandardMaterial color="#6f9a55" />
        </mesh>
        {traps.map(([tx, tz], i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[tx, 0.05, tz]}>
            <circleGeometry args={[6, 20]} />
            <meshStandardMaterial color="#d8c89a" />
          </mesh>
        ))}
        <mesh position={[l.w * 0.35, 2.5, -l.d * 0.3]}>
          <boxGeometry args={[10, 5, 8]} />
          <meshStandardMaterial color="#d2c6ad" />
        </mesh>
      </group>
    )
  }
  if (l.kind === 'capitol') {
    return (
      <group>
        <mesh position={[0, 7, 0]}>
          <boxGeometry args={[20, 14, 20]} />
          <meshStandardMaterial color="#dad4c6" />
        </mesh>
        <mesh position={[0, 16, 0]}>
          <sphereGeometry args={[7, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c9c3b4" />
        </mesh>
      </group>
    )
  }
  // cemetery — green field + grid of little markers
  const markers: [number, number][] = []
  for (let mx = -l.w / 2 + 6; mx < l.w / 2 - 4; mx += 7) {
    for (let mz = -l.d / 2 + 6; mz < l.d / 2 - 4; mz += 9) markers.push([mx, mz])
  }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[l.w, l.d]} />
        <meshStandardMaterial color="#5f7d52" />
      </mesh>
      {markers.map(([mx, mz], i) => (
        <mesh key={i} position={[mx, 0.5, mz]}>
          <boxGeometry args={[0.8, 1, 0.3]} />
          <meshStandardMaterial color="#c4c8c2" />
        </mesh>
      ))}
    </group>
  )
}

// --- destination beacons ---
function Beacons() {
  const stepIndex = useLunchStore((s) => s.stepIndex)
  const done = useLunchStore((s) => s.done)
  return (
    <>
      {DESTINATIONS.map((d, i) => {
        const state: BeaconState = done || i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'future'
        return <Beacon key={d.id} d={d} state={state} />
      })}
    </>
  )
}

type BeaconState = 'active' | 'future' | 'done'

function Beacon({ d, state }: { d: Destination; state: BeaconState }) {
  const active = state === 'active'
  const labelColor = active ? '#111111' : state === 'done' ? '#6a6a6a' : '#555555'
  return (
    <group position={[d.x, terrainHeight(d.x, d.z), d.z]}>
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 10, 20]} />
        <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={active ? 0.6 : 0.15} />
      </mesh>
      {active && (
        <mesh position={[0, 38, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 76, 16, 1, true]} />
          <meshBasicMaterial color={d.color} transparent opacity={0.16} depthWrite={false} side={2} />
        </mesh>
      )}
      <Suspense fallback={null}>
        <Billboard position={[0, active ? 12 : 11, 0]}>
          <Text fontSize={active ? 2.6 : 1.7} color={labelColor} anchorX="center" anchorY="middle">
            {d.short}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  )
}
