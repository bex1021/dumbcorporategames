// Lunch Dash world — a varied graybox city of recognizable districts (NYC/SF/
// Boston/Austin/LA) plus office parks, landmarks, and countryside. Buildings &
// park trees render as InstancedMesh (one draw call each). See cityLayout.

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Text, Billboard, Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three-stdlib'
import {
  Object3D,
  Color,
  InstancedMesh,
  PlaneGeometry,
  SphereGeometry,
  Float32BufferAttribute,
  BufferGeometry,
  DoubleSide,
  BackSide,
  MeshStandardMaterial,
  DirectionalLight,
  CylinderGeometry,
  BoxGeometry,
} from 'three'
import { terrainHeight } from './terrain'
import { signalState } from './signalState'
import { carPosition } from './carState'
import { DRIVE_WORLD } from './driveConfig'
import { DESTINATIONS, type Destination } from './destinations'
import {
  BUILDINGS,
  HQ_BUILDING,
  STOREFRONTS,
  DEST_POINTS,
  BARNS,
  WATER,
  TREES,
  PALMS,
  COUNTRY_FIELDS,
  COUNTRY_TREES,
  BRIDGES,
  AVENUE_LINES,
  TUNNEL,
  PARKING,
  LANDMARKS,
  DOCKS,
  OVERPASS,
  ROADS,
  roadWidth,
  onRoad,
  onPaved,
  paintGaps,
  GREEN_AREAS,
  DISTRICT_REGIONS,
  ALLEYS,
  ALLEY_W,
  ALLEY_PROPS,
  ALLEY_FENCES,
  SIGNALS,
  type Rect,
  type Landmark,
  type Road,
} from './cityLayout'
import { useLunchStore, stopStateFor } from './lunchStore'
import { TrafficCars } from './Traffic'
import { Pedestrians } from './Pedestrians'
import { Parade } from './Parade'

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
// Belt-and-suspenders: drop any tree that landed on pavement (roads/avenues/
// bridges/lots) so none end up standing in the middle of the road.
const TREE_ITEMS = [...TREES, ...COUNTRY_TREES].filter((t) => !onPaved(t.x, t.z, 2.5))

// ---- building detail (Phase B) — all derived once, rendered in ONE instanced draw ----
function shade(hex: string, f: number): string {
  return '#' + new Color(hex).multiplyScalar(f).getHexString()
}

// Tall buildings become 2–3 stacked tiers with setbacks (real towers step in as
// they rise); ROOFS tracks each building's final top for rooftop clutter.
const TIER_ITEMS: BoxItem[] = []
const ROOFS: { x: number; z: number; w: number; d: number; topY: number; srcH: number }[] = []
BOX_ITEMS.forEach((b) => {
  let top = b.y + b.h / 2
  let tw = b.w
  let td = b.d
  if (b.h > 30) {
    const t2 = b.h * 0.24
    tw *= 0.78
    td *= 0.78
    TIER_ITEMS.push({ x: b.x, y: top + t2 / 2, z: b.z, w: tw, h: t2, d: td, color: shade(b.color, 0.93) })
    top += t2
    if (b.h > 52) {
      const t3 = b.h * 0.16
      tw *= 0.72
      td *= 0.72
      TIER_ITEMS.push({ x: b.x, y: top + t3 / 2, z: b.z, w: tw, h: t3, d: td, color: shade(b.color, 0.86) })
      top += t3
    }
  }
  ROOFS.push({ x: b.x, z: b.z, w: tw, d: td, topY: top, srcH: b.h })
})

// Horizontal window bands every floor-ish — the single thing that makes a box
// read as a building. Slightly proud of the facade so they catch the light.
const BAND_ITEMS: BoxItem[] = []
for (const it of [...BOX_ITEMS, ...TIER_ITEMS]) {
  if (it.h < 9) continue
  const bot = it.y - it.h / 2
  for (let y = bot + 5; y < it.y + it.h / 2 - 2; y += 3.4) {
    BAND_ITEMS.push({ x: it.x, y, z: it.z, w: it.w + 0.1, h: 1.05, d: it.d + 0.1, color: '#2c333d' })
  }
}

// Darker glass storefront band at street level (flat city blocks only — hill
// houses keep their clean faces).
const STORE_ITEMS: BoxItem[] = BOX_ITEMS.filter((b) => b.h >= 10 && terrainHeight(b.x, b.z) < 1.5).map((b) => ({
  x: b.x,
  y: b.y - b.h / 2 + 3,
  z: b.z,
  w: b.w + 0.14,
  h: 3,
  d: b.d + 0.14,
  color: '#24272c',
}))

// Rooftop AC units — 1–2 small boxes per mid/large roof, hashed placement.
const AC_ITEMS: BoxItem[] = []
ROOFS.forEach((r, i) => {
  if (r.srcH < 14 || r.w < 6) return
  const n = 1 + Math.floor(bh(i, 91) * 2)
  for (let k = 0; k < n; k++) {
    const ox = (bh(i, 92 + k) - 0.5) * (r.w - 3)
    const oz = (bh(i, 95 + k) - 0.5) * (r.d - 3)
    AC_ITEMS.push({ x: r.x + ox, y: r.topY + 0.55, z: r.z + oz, w: 1.6, h: 1.1, d: 1.3, color: '#8e9298' })
  }
})

// Split into matte structure vs. glass: the opaque building masses/roofs/AC
// units render flat, while the window bands + storefront glass go into their
// own instanced draw with a glossy, sky-reflecting material (see InstancedBoxes
// `glass` + the <Environment> in DriveWorld). This is what makes the city
// shimmer instead of reading as painted stripes.
const CITY_OPAQUE: BoxItem[] = [...BOX_ITEMS, ...TIER_ITEMS, ...AC_ITEMS]
const CITY_GLASS: BoxItem[] = [...BAND_ITEMS, ...STORE_ITEMS]

// Wooden water towers — the NYC silhouette — on brownstone + Manhattan roofs.
const WT_RECTS: Rect[] = [
  { minX: -300, maxX: -120, minZ: -188, maxZ: -48 }, // brownstones
  { minX: -92, maxX: 20, minZ: -120, maxZ: 46 }, // Manhattan core
]
const WATER_TOWERS = ROOFS.filter(
  (r, i) =>
    r.srcH > 10 &&
    r.srcH < 48 &&
    bh(i, 77) < 0.32 &&
    WT_RECTS.some((q) => r.x >= q.minX && r.x <= q.maxX && r.z >= q.minZ && r.z <= q.maxZ),
)

// ---- street furniture (Phase C) — lamps alternate sides of every road; the
// arm reaches out over the lanes. Hydrants dot the opposite sidewalk. ----
const LAMP_POSTS: { x: number; z: number; rot: number }[] = []
const HYDRANTS: { x: number; z: number }[] = []
ROADS.forEach((r, ri) => {
  const dx = r.b.x - r.a.x
  const dz = r.b.z - r.a.z
  const len = Math.hypot(dx, dz) || 1
  const ux = dx / len
  const uz = dz / len
  const px = -uz
  const pz = ux
  const W = roadWidth(r.type)
  for (let d = 22; d < len - 22; d += 38) {
    const side = Math.floor(d / 38) % 2 === 0 ? 1 : -1
    const x = r.a.x + ux * d + px * (W / 2 + 1.6) * side
    const z = r.a.z + uz * d + pz * (W / 2 + 1.6) * side
    if (SIGNALS.some((s) => Math.hypot(s.x - x, s.z - z) < 16)) continue
    if (onRoad(x, z, -1)) continue // never plant a lamp on a crossing road's asphalt
    LAMP_POSTS.push({ x, z, rot: Math.atan2(-px * side, -pz * side) }) // arm faces the road
    if (d + 12 < len - 16 && bh(ri, Math.round(d)) < 0.3) {
      const hx = r.a.x + ux * (d + 12) + px * (W / 2 + 2.1) * -side
      const hz = r.a.z + uz * (d + 12) + pz * (W / 2 + 2.1) * -side
      if (!onRoad(hx, hz, -1)) HYDRANTS.push({ x: hx, z: hz })
    }
  }
})

// Stop signs at every unsignalized road crossing (the 8 majors have lights).
// Two signs per junction on opposite corners.
const STOP_SIGNS: { x: number; z: number }[] = []
{
  const seen = new Set<string>()
  for (const v of ROADS) {
    if (v.a.x !== v.b.x) continue
    for (const h of ROADS) {
      if (h.a.z !== h.b.z) continue
      const cx = v.a.x
      const cz = h.a.z
      if (cz < Math.min(v.a.z, v.b.z) || cz > Math.max(v.a.z, v.b.z)) continue
      if (cx < Math.min(h.a.x, h.b.x) || cx > Math.max(h.a.x, h.b.x)) continue
      const key = `${cx},${cz}`
      if (seen.has(key)) continue
      seen.add(key)
      if (SIGNALS.some((s) => Math.hypot(s.x - cx, s.z - cz) < 12)) continue
      const vw = roadWidth(v.type) / 2 + 1.3
      const hw = roadWidth(h.type) / 2 + 1.3
      STOP_SIGNS.push({ x: cx + vw, z: cz + hw }, { x: cx - vw, z: cz - hw })
    }
  }
}

// Satire billboards — placed in the cleared bridge-approach / countryside
// strips so they never clip a building. The ads ARE the world-building: a wall
// of nonsense AI-startup pitches you can't drive away from, SF-style — every
// one confidently vague, none of them explaining what the company actually does.
const BILLBOARDS: { x: number; z: number; ry: number; top: string; sub: string }[] = [
  { x: -58, z: 90, ry: 0, top: 'SYNERGY.AI', sub: 'agentic alignment for your alignment™' },
  { x: 100, z: 90, ry: 0, top: 'DELVE', sub: 'Series F · still pre-revenue™' },
  { x: -58, z: 206, ry: Math.PI, top: 'LATENT', sub: "we don't know what it does either™" },
  { x: 100, z: 206, ry: Math.PI, top: 'PROMPTLY', sub: 'the AI that attends your meetings for you™' },
  { x: -55, z: -260, ry: Math.PI / 2, top: 'FRICTIONLESS', sub: 'remove the human from human resources™' },
  { x: 123, z: -250, ry: -Math.PI / 2, top: 'TRUSTFALL AI', sub: 'your data is safe with us*™' },
]

// Nonsense AI-startup ad bank for the ROOFTOP billboards — the corporate grip
// you can't escape even mid-lunch. Every tagline is plausible-sounding and
// completely hollow; the accent color just makes each sign glow at dusk.
const ROOFTOP_ADS: { top: string; sub: string; accent: string }[] = [
  { top: 'HYPERSCALE', sub: 'boil the ocean, faster™', accent: '#ff3a6e' },
  { top: 'RECURSIVE', sub: 'we put AI in your AI™', accent: '#8b5cf6' },
  { top: 'NORTH STAR', sub: 'a metric for your metrics™', accent: '#3aa0ff' },
  { top: 'PARSE', sub: 'turns your PDFs into other PDFs™', accent: '#f5c518' },
  { top: 'STAKEHOLDER', sub: 'the app that CCs everyone™', accent: '#ff6f3a' },
  { top: 'VELOCITY', sub: 'ideate · iterate · offboard™', accent: '#22c39a' },
  { top: 'CIRCLE BACK', sub: 'async synergy, realized™', accent: '#3aa0ff' },
  { top: 'SLOPCORP', sub: 'now hiring 400 prompt engineers™', accent: '#ff6f3a' },
  { top: 'WAGMI CAPITAL', sub: 'we tokenized lunch™', accent: '#8b5cf6' },
  { top: 'PARADIGM', sub: 'shifting, indefinitely™', accent: '#ff3a6e' },
  { top: 'RECLAIM', sub: 'a platform for platforms™', accent: '#22c39a' },
  { top: 'ONWARD.AI', sub: 'disrupting disruption™', accent: '#f5c518' },
  { top: 'MENLO', sub: 'pre-seed · post-truth™', accent: '#3aa0ff' },
  { top: 'ENTERPRISE', sub: 'solutions for solutions™', accent: '#ff6f3a' },
  { top: 'PIVOTAL', sub: 'we found product-market myth™', accent: '#8b5cf6' },
  { top: 'GROWTHLOOP', sub: 'up and to the right™', accent: '#ff3a6e' },
  { top: 'COGNITION', sub: 'thinks so you don’t have to™', accent: '#22c39a' },
  { top: 'BLUESKY', sub: 'ideating at scale™', accent: '#3aa0ff' },
]

// The tallest downtown roofs that carry an ad — spread across the skyline so
// the ads read from every street. Static (derived once): sorted by height so
// the biggest towers get the signage.
const AD_ROOFS = [...ROOFS]
  .filter((r) => r.srcH > 34 && r.w >= 6)
  .sort((a, b) => b.srcH - a.srcH)
  .slice(0, ROOFTOP_ADS.length)

// tree variety — most park/country trees stay conifers; 2 in 5 become
// round-canopy deciduous so the greenery stops being identical cones
const CONE_TREES = TREE_ITEMS.filter((_, i) => i % 5 < 3)
const ROUND_TREES = TREE_ITEMS.filter((_, i) => i % 5 >= 3)

export function DriveWorld() {
  return (
    <>
      <SkyDome />
      <CityEnv />
      <DriveLights />
      <Ground />
      <Patches rects={COUNTRY_FIELDS} y={0.015} color="#7e8a55" />
      <ParkingLots />
      <Avenues />
      <Alleys />
      <AlleyFences />
      <Roads />
      <SignalMarkings />
      <Bridges />
      <TrafficLights />
      <StopSigns />
      <Docks />
      <Tunnel />
      <Overpass />
      <InstancedBoxes items={CITY_OPAQUE} />
      <InstancedBoxes items={CITY_GLASS} glass />
      <BasePlinths />
      <WaterTowers />
      <Trees />
      <StreetLights />
      <Hydrants />
      <Billboards />
      <RooftopAds />
      <Palms />
      <AlleyProps />
      <Storefronts />
      <OfficeDropoff />
      <Parade />
      <Landmarks />
      <TrafficCars />
      <Pedestrians />
      <Beacons />
    </>
  )
}

function DriveLights() {
  // Lower fill so the sun's shadows actually read; the sun carries the scene.
  return (
    <>
      <ambientLight intensity={0.5} color="#eef1f4" />
      <hemisphereLight args={['#e2ebf2', '#9aa08c', 0.4]} />
      <SunLight />
    </>
  )
}

// The sun: one shadow-casting directional light whose shadow window FOLLOWS the
// car (the standard open-world trick — crisp shadows near the camera, none paid
// for across the whole 1.1 km world). Snapped to a coarse grid so the shadow
// texels don't shimmer while driving.
function SunLight() {
  const ref = useRef<DirectionalLight>(null)
  const target = useMemo(() => new Object3D(), [])
  useEffect(() => {
    if (ref.current) ref.current.target = target
  }, [target])
  useFrame(() => {
    const l = ref.current
    if (!l) return
    const ax = Math.round(carPosition.x / 8) * 8
    const az = Math.round(carPosition.z / 8) * 8
    // High noon: sun nearly overhead (slightly angled so buildings still cast a
    // readable shadow), for flat midday light — it's 12:00, not golden hour.
    l.position.set(ax + 46, 195, az + 34)
    target.position.set(ax, 0, az)
    target.updateMatrixWorld()
  })
  return (
    <>
      <directionalLight
        ref={ref}
        castShadow
        intensity={1.2}
        color="#fff6ea"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-95}
        shadow-camera-right={95}
        shadow-camera-top={95}
        shadow-camera-bottom={-95}
        shadow-camera-near={20}
        shadow-camera-far={430}
        shadow-bias={-0.0005}
        shadow-normalBias={1.0}
      />
      <primitive object={target} />
    </>
  )
}

// Gradient sky dome — pale haze at the horizon rising to a soft noon blue, so
// the world stops ending in a flat grey wall. Fog is tuned to the horizon band
// so distant blocks melt into it.
function SkyDome() {
  const geo = useMemo(() => {
    const g = new SphereGeometry(880, 24, 12)
    const pos = g.attributes.position
    const zen = new Color('#79a6d6') // midday blue overhead
    const hor = new Color('#cdd9e2') // pale haze at the horizon
    const low = new Color('#dde5ea') // light ground haze below
    const c = new Color()
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 880
      if (t >= 0) c.copy(hor).lerp(zen, Math.min(1, t * 1.5))
      else c.copy(hor).lerp(low, Math.min(1, -t * 3))
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return g
  }, [])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
    </mesh>
  )
}

// tiny deterministic hash for per-block tint variety (same recipe as cityLayout)
function bh(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
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
      else if (inAny(x, wz, DISTRICT_REGIONS))
        col.copy(grey).multiplyScalar(0.95 + bh(Math.floor(x / 36), Math.floor(wz / 36)) * 0.1) // paved block — tint varies block to block
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
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors />
    </mesh>
  )
}

function Patches({ rects, y, color }: { rects: Rect[]; y: number; color: string }) {
  return (
    <>
      {rects.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2]} receiveShadow>
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
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(r.minX + r.maxX) / 2, 0.03, (r.minZ + r.maxZ) / 2]} receiveShadow>
          <planeGeometry args={[r.maxX - r.minX, r.maxZ - r.minZ]} />
          <meshStandardMaterial color="#4f5256" />
        </mesh>
      ))}
    </>
  )
}

// Diagonal avenues — real roads now: terrain-draped asphalt ribbon + a yellow
// centerline + white edges, with the paint gapped at every crossing (and
// trimmed at the junction ends) just like the axis-aligned streets.
function Avenues() {
  const data = useMemo(
    () =>
      AVENUE_LINES.map(({ a, b }) => {
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1
        const gaps: [number, number][] = [
          [0, 11 / len],
          [1 - 11 / len, 1],
        ]
        for (const r of ROADS) {
          const vert = r.a.x === r.b.x
          if (vert) {
            if ((r.a.x - a.x) * (r.a.x - b.x) >= 0) continue // not strictly between
            const t = (r.a.x - a.x) / (b.x - a.x)
            const z = a.z + (b.z - a.z) * t
            if (z < Math.min(r.a.z, r.b.z) || z > Math.max(r.a.z, r.b.z)) continue
            const half = (roadWidth(r.type) / 2 + 2.5) / len
            gaps.push([t - half, t + half])
          } else {
            if ((r.a.z - a.z) * (r.a.z - b.z) >= 0) continue
            const t = (r.a.z - a.z) / (b.z - a.z)
            const x = a.x + (b.x - a.x) * t
            if (x < Math.min(r.a.x, r.b.x) || x > Math.max(r.a.x, r.b.x)) continue
            const half = (roadWidth(r.type) / 2 + 2.5) / len
            gaps.push([t - half, t + half])
          }
        }
        return {
          asphalt: ribbonGeo(a.x, a.z, b.x, b.z, 0, 12, 0.07), // under the main roads at crossings
          center: ribbonGeo(a.x, a.z, b.x, b.z, 0, 0.22, 0.11, gaps),
          edges: [ribbonGeo(a.x, a.z, b.x, b.z, -5.4, 0.18, 0.11, gaps), ribbonGeo(a.x, a.z, b.x, b.z, 5.4, 0.18, 0.11, gaps)],
        }
      }),
    [],
  )
  return (
    <>
      {data.map((d, i) => (
        <group key={i}>
          <mesh geometry={d.asphalt} receiveShadow>
            <meshStandardMaterial color={RD_ASPHALT} side={DoubleSide} />
          </mesh>
          <mesh geometry={d.center}>
            <meshBasicMaterial color={RD_YELLOW} side={DoubleSide} />
          </mesh>
          {d.edges.map((g, j) => (
            <mesh key={j} geometry={g}>
              <meshBasicMaterial color={RD_WHITE} side={DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

// Back-lot fences capping the alley stubs that genuinely dead-end — the alley
// ends AT something (and the fence is solid, matching its collider).
function AlleyFences() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    ALLEY_FENCES.forEach((f, i) => {
      const cx = (f.minX + f.maxX) / 2
      const cz = (f.minZ + f.maxZ) / 2
      o.position.set(cx, terrainHeight(cx, cz) + 0.95, cz)
      o.scale.set(f.maxX - f.minX, 1.9, f.maxZ - f.minZ)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, ALLEY_FENCES.length]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#5a544a" />
    </instancedMesh>
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
const RD_WALK = '#a6a8a4' // concrete sidewalk — lighter than asphalt for value pop
const RD_CURBSTONE = '#b4b6b2' // the curb line between asphalt and walk
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
  step = 2.5,
) {
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz) || 1
  const px = dz / len // unit perpendicular
  const pz = -dx / len
  const steps = Math.max(2, Math.ceil(len / step)) // fine enough to hug hills (no grass poking through)
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

// Add a 3 m-dash / 9 m-gap pattern (the real 10:30 ft standard) on top of the
// intersection gaps, so inner lane dividers read as dashed instead of solid.
function dashGaps(len: number, base: [number, number][]): [number, number][] {
  const gaps: [number, number][] = [...base]
  for (let s = 3; s < len; s += 12) gaps.push([s / len, Math.min((s + 9) / len, 1)])
  return gaps
}

function RoadSeg({ road }: { road: Road }) {
  const W = roadWidth(road.type)
  const arterial = road.type === 'arterial'
  const { asphalt, walks, curbs, lines } = useMemo(() => {
    const a = road.a
    const b = road.b
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    // paint + sidewalks stop at each crossing (bare-asphalt intersection box);
    // sidewalks break a touch wider so they clear the corner cleanly.
    const gaps = paintGaps(road)
    const swGaps = paintGaps(road, 5)
    const dashed = dashGaps(len, gaps)
    const ln: { geo: BufferGeometry; color: string }[] = []
    const add = (off: number, w: number, color: string, g: [number, number][] = gaps, step = 2.5) =>
      ln.push({ geo: ribbonGeo(a.x, a.z, b.x, b.z, off, w, 0.12, g, step), color })
    if (arterial) {
      add(-0.38, 0.22, RD_YELLOW) // double-yellow center
      add(0.38, 0.22, RD_YELLOW)
      add(-W / 4, 0.16, RD_WHITE, dashed, 1.5) // dashed white lane dividers
      add(W / 4, 0.16, RD_WHITE, dashed, 1.5)
    } else {
      add(0, 0.22, RD_YELLOW) // single yellow center
    }
    add(-(W / 2 - 0.5), 0.18, RD_WHITE) // white edges (solid, per the real standard)
    add(W / 2 - 0.5, 0.18, RD_WHITE)
    const sw = W / 2 + 2 // sidewalks just outside each edge
    return {
      asphalt: ribbonGeo(a.x, a.z, b.x, b.z, 0, W, 0.08), // continuous — paving runs through the box
      // sidewalks ride a touch higher + a light curb strip at the road edge
      walks: [ribbonGeo(a.x, a.z, b.x, b.z, -sw, 4, 0.2, swGaps), ribbonGeo(a.x, a.z, b.x, b.z, sw, 4, 0.2, swGaps)],
      curbs: [
        ribbonGeo(a.x, a.z, b.x, b.z, -(W / 2 - 0.05), 0.7, 0.165, swGaps),
        ribbonGeo(a.x, a.z, b.x, b.z, W / 2 - 0.05, 0.7, 0.165, swGaps),
      ],
      lines: ln,
    }
  }, [road, W, arterial])
  return (
    <group>
      <mesh geometry={asphalt} receiveShadow>
        <meshStandardMaterial color={RD_ASPHALT} side={DoubleSide} />
      </mesh>
      {walks.map((g, i) => (
        <mesh key={`w${i}`} geometry={g} receiveShadow>
          <meshStandardMaterial color={RD_WALK} side={DoubleSide} />
        </mesh>
      ))}
      {curbs.map((g, i) => (
        <mesh key={`c${i}`} geometry={g} receiveShadow>
          <meshStandardMaterial color={RD_CURBSTONE} side={DoubleSide} />
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
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.08, cz]} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#8b9097" />
            </mesh>
            {/* railings down the roadway edges (match the BRIDGE_RAILS colliders) */}
            <mesh position={[cx - 9.6, 0.95, cz]} castShadow>
              <boxGeometry args={[0.6, 1.9, d]} />
              <meshStandardMaterial color="#b6bcc2" />
            </mesh>
            <mesh position={[cx + 9.6, 0.95, cz]} castShadow>
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
  // Plant the pole on the CORNER, clear of both roadways — offset in x by the
  // N–S arterial half-width and in z by the cross-road half-width — then reach a
  // mast arm out over the arterial so the head hangs above the lanes (not in the
  // middle of the intersection).
  const halfV = 9 // N–S arterial half-width
  const halfE = z === -22 || z === 215 ? 9 : 6 // cross-road half-width at this signal
  const cx = x - halfV - 2.5
  const cz = z - halfE - 2.5
  const py = terrainHeight(cx, cz)
  const armLen = halfV + 4
  const headX = cx + armLen
  const armY = py + 7
  return (
    <group>
      <mesh position={[cx, py + 3.5, cz]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 7, 8]} />
        <meshStandardMaterial color="#2f3236" />
      </mesh>
      <mesh position={[cx + armLen / 2, armY, cz]}>
        <boxGeometry args={[armLen, 0.22, 0.22]} />
        <meshStandardMaterial color="#2f3236" />
      </mesh>
      <TrafficLightHead position={[headX, armY - 1.1, cz]} />
    </group>
  )
}

// The signal head — three lamps whose glow tracks the live N–S signal (the mast
// arm hangs over the arterial, so it shows the arterial's light).
function TrafficLightHead({ position }: { position: [number, number, number] }) {
  const red = useRef<MeshStandardMaterial>(null)
  const yellow = useRef<MeshStandardMaterial>(null)
  const green = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    const st = signalState('ns')
    if (red.current) red.current.emissiveIntensity = st === 'red' ? 1.3 : 0.05
    if (yellow.current) yellow.current.emissiveIntensity = st === 'yellow' ? 1.3 : 0.05
    if (green.current) green.current.emissiveIntensity = st === 'green' ? 1.3 : 0.05
  })
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.7, 1.7, 0.6]} />
        <meshStandardMaterial color="#17191b" />
      </mesh>
      <mesh position={[0, 0.5, 0.33]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial ref={red} color="#d23b2b" emissive="#d23b2b" emissiveIntensity={1.3} />
      </mesh>
      <mesh position={[0, 0, 0.33]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial ref={yellow} color="#e0b23a" emissive="#e0b23a" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, -0.5, 0.33]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial ref={green} color="#3fae54" emissive="#3fae54" emissiveIntensity={0.05} />
      </mesh>
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

// Alleyways — the whole grid as ONE terrain-draped dark-asphalt ribbon (1 draw
// call). Sits just above the ground; the main roads draw over it at crossings.
function Alleys() {
  const geo = useMemo(() => {
    const pos: number[] = []
    const idx: number[] = []
    const hw = ALLEY_W / 2
    for (const s of ALLEYS) {
      const dx = s.b.x - s.a.x
      const dz = s.b.z - s.a.z
      const len = Math.hypot(dx, dz) || 1
      const px = (dz / len) * hw
      const pz = (-dx / len) * hw
      const steps = Math.max(2, Math.ceil(len / 4))
      const base = pos.length / 3
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const cx = s.a.x + dx * t
        const cz = s.a.z + dz * t
        pos.push(cx - px, terrainHeight(cx - px, cz - pz) + 0.06, cz - pz, cx + px, terrainHeight(cx + px, cz + pz) + 0.06, cz + pz)
      }
      for (let i = 0; i < steps; i++) {
        const a0 = base + i * 2
        idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(pos), 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#33353a" side={DoubleSide} />
    </mesh>
  )
}

// Trash cans + dumpsters along the alleys — two InstancedMeshes.
function AlleyProps() {
  const canRef = useRef<InstancedMesh>(null)
  const dumpRef = useRef<InstancedMesh>(null)
  const cans = useMemo(() => ALLEY_PROPS.filter((p) => p.kind === 'can'), [])
  const dumps = useMemo(() => ALLEY_PROPS.filter((p) => p.kind === 'dumpster'), [])
  useLayoutEffect(() => {
    const o = new Object3D()
    cans.forEach((p, i) => {
      o.position.set(p.x, terrainHeight(p.x, p.z) + 0.45, p.z)
      o.rotation.set(0, p.rot, 0)
      o.updateMatrix()
      canRef.current?.setMatrixAt(i, o.matrix)
    })
    if (canRef.current) canRef.current.instanceMatrix.needsUpdate = true
    dumps.forEach((p, i) => {
      o.position.set(p.x, terrainHeight(p.x, p.z) + 0.5, p.z)
      o.rotation.set(0, p.rot, 0)
      o.updateMatrix()
      dumpRef.current?.setMatrixAt(i, o.matrix)
    })
    if (dumpRef.current) dumpRef.current.instanceMatrix.needsUpdate = true
  }, [cans, dumps])
  return (
    <>
      <instancedMesh ref={canRef} args={[undefined, undefined, cans.length]}>
        <cylinderGeometry args={[0.32, 0.36, 0.9, 8]} />
        <meshStandardMaterial color="#474a40" />
      </instancedMesh>
      <instancedMesh ref={dumpRef} args={[undefined, undefined, dumps.length]}>
        <boxGeometry args={[2, 1, 1.2]} />
        <meshStandardMaterial color="#3f5e47" />
      </instancedMesh>
    </>
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
// A single unit RoundedBoxGeometry, shared by every instanced box in the city.
// The tiny 0.055 corner radius is the whole trick behind "less blocky": the sun
// now catches a soft highlight along every edge instead of a razor-sharp line,
// so a plain cuboid reads as a moulded object. It's one geometry reused across
// thousands of instances, so it costs one draw call, same as before.
let _roundedUnitBox: RoundedBoxGeometry | null = null
function roundedUnitBox(): RoundedBoxGeometry {
  if (!_roundedUnitBox) _roundedUnitBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.055)
  return _roundedUnitBox
}

function InstancedBoxes({ items, glass = false }: { items: BoxItem[]; glass?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => roundedUnitBox(), [])
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
    <instancedMesh ref={ref} args={[geo, undefined, items.length]} castShadow receiveShadow>
      {glass ? (
        // Window glass: smooth + metallic so it mirrors the midday sky from the
        // <Environment>. A whisper of cool emissive keeps the deepest shadow-side
        // panes from going fully black, without reading as "lights on" at noon.
        <meshStandardMaterial metalness={0.88} roughness={0.18} envMapIntensity={1.2} emissive="#c9d6e2" emissiveIntensity={0.05} />
      ) : (
        // Matte structure: keep reflections almost off so masonry stays masonry.
        <meshStandardMaterial roughness={0.85} metalness={0.0} envMapIntensity={0.18} />
      )}
    </instancedMesh>
  )
}

// The reflected environment the window glass samples. Built entirely in-engine
// from a few bright panels (no HDR download), evoking a clear MIDDAY sky: a
// strong white light overhead and pale blue on the horizon, so glass mirrors a
// noon sky rather than a sunset. `frames={1}` bakes it once — static scenery,
// so it costs nothing per frame.
function CityEnv() {
  return (
    <Environment resolution={128} frames={1}>
      {/* bright overhead sun/sky — the dominant midday reflection */}
      <Lightformer form="rect" intensity={2.4} color="#ffffff" scale={[90, 90, 1]} position={[10, 70, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* pale blue horizon band on all sides */}
      <Lightformer form="rect" intensity={1.0} color="#c4d6e8" scale={[70, 16, 1]} position={[0, 14, -60]} rotation={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.9} color="#bcd0e6" scale={[70, 16, 1]} position={[0, 14, 60]} rotation={[0, Math.PI, 0]} />
      <Lightformer form="rect" intensity={0.9} color="#c0d3e6" scale={[60, 16, 1]} position={[-60, 14, 0]} rotation={[0, Math.PI / 2, 0]} />
      {/* dim ground bounce so glass isn't black underneath */}
      <Lightformer form="rect" intensity={0.35} color="#7d7d78" scale={[100, 100, 1]} position={[0, -30, 0]} rotation={[-Math.PI / 2, 0, 0]} />
    </Environment>
  )
}

// A dark plinth band hugging each building's base — fake contact shadow +
// foundation line. This is what visually glues the boxes to the ground beyond
// the live shadow window (one instanced draw call).
function BasePlinths() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    BOX_ITEMS.forEach((b, i) => {
      const baseY = b.y - b.h / 2 + 1.5 // the building's lowest visible corner
      o.position.set(b.x, baseY + 0.22, b.z)
      o.scale.set(b.w + 1.6, 0.44, b.d + 1.6)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, BOX_ITEMS.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3a3d41" />
    </instancedMesh>
  )
}

// Wooden rooftop water towers (tank + conical lid), instanced — pure NYC.
function WaterTowers() {
  const tankRef = useRef<InstancedMesh>(null)
  const lidRef = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new Object3D()
    WATER_TOWERS.forEach((r, i) => {
      const wx = r.x + r.w * 0.18
      const wz = r.z - r.d * 0.15
      o.position.set(wx, r.topY + 1.5, wz)
      o.updateMatrix()
      tankRef.current?.setMatrixAt(i, o.matrix)
      o.position.set(wx, r.topY + 3.55, wz)
      o.updateMatrix()
      lidRef.current?.setMatrixAt(i, o.matrix)
    })
    if (tankRef.current) tankRef.current.instanceMatrix.needsUpdate = true
    if (lidRef.current) lidRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={tankRef} args={[undefined, undefined, WATER_TOWERS.length]} castShadow>
        <cylinderGeometry args={[1.15, 1.3, 3, 10]} />
        <meshStandardMaterial color="#6b5743" />
      </instancedMesh>
      <instancedMesh ref={lidRef} args={[undefined, undefined, WATER_TOWERS.length]} castShadow>
        <coneGeometry args={[1.45, 1.1, 10]} />
        <meshStandardMaterial color="#4a3f33" />
      </instancedMesh>
    </>
  )
}

// Trees — conifer cones (with width jitter) + round-canopy deciduous, so the
// greenery stops being a field of identical cones. Three instanced draws.
function Trees() {
  const coneRef = useRef<InstancedMesh>(null)
  const trunkRef = useRef<InstancedMesh>(null)
  const canopyRef = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new Object3D()
    const c = new Color()
    const cone = coneRef.current
    if (cone) {
      CONE_TREES.forEach((t, i) => {
        const w = 1.25 + (i % 4) * 0.14
        o.position.set(t.x, terrainHeight(t.x, t.z) + t.h * 0.6, t.z)
        o.scale.set(w, t.h * 1.2, w)
        o.updateMatrix()
        cone.setMatrixAt(i, o.matrix)
        c.setHSL(0.27, 0.34, 0.3 + (i % 5) * 0.02)
        cone.setColorAt(i, c)
      })
      cone.instanceMatrix.needsUpdate = true
      if (cone.instanceColor) cone.instanceColor.needsUpdate = true
    }
    const trunk = trunkRef.current
    const canopy = canopyRef.current
    if (trunk && canopy) {
      ROUND_TREES.forEach((t, i) => {
        const gy = terrainHeight(t.x, t.z)
        o.position.set(t.x, gy + 0.75, t.z)
        o.scale.set(1, 1, 1)
        o.updateMatrix()
        trunk.setMatrixAt(i, o.matrix)
        const s = 1.5 + (i % 5) * 0.2
        o.position.set(t.x, gy + 1.3 + t.h * 0.42, t.z)
        o.scale.set(s, t.h * 0.42 + 1.0, s)
        o.updateMatrix()
        canopy.setMatrixAt(i, o.matrix)
        c.setHSL(0.24, 0.32, 0.3 + (i % 4) * 0.025)
        canopy.setColorAt(i, c)
      })
      trunk.instanceMatrix.needsUpdate = true
      canopy.instanceMatrix.needsUpdate = true
      if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
    }
  }, [])
  return (
    <>
      <instancedMesh ref={coneRef} args={[undefined, undefined, CONE_TREES.length]} castShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, ROUND_TREES.length]} castShadow>
        <cylinderGeometry args={[0.13, 0.18, 1.5, 5]} />
        <meshStandardMaterial color="#7a5f48" />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, ROUND_TREES.length]} castShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial />
      </instancedMesh>
    </>
  )
}

// Street lights — pole + arm reaching over the lanes + a warm lamp head.
// Three instanced draws for ~200 lamps.
function StreetLights() {
  const poleRef = useRef<InstancedMesh>(null)
  const armRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)
  const poleGeo = useMemo(() => new CylinderGeometry(0.09, 0.13, 5.6, 6).translate(0, 2.8, 0), [])
  const armGeo = useMemo(() => new BoxGeometry(0.12, 0.12, 1.8).translate(0, 5.5, 0.9), [])
  const headGeo = useMemo(() => new BoxGeometry(0.32, 0.16, 0.55).translate(0, 5.42, 1.7), [])
  useLayoutEffect(() => {
    const o = new Object3D()
    LAMP_POSTS.forEach((p, i) => {
      o.position.set(p.x, terrainHeight(p.x, p.z), p.z)
      o.rotation.set(0, p.rot, 0)
      o.updateMatrix()
      poleRef.current?.setMatrixAt(i, o.matrix)
      armRef.current?.setMatrixAt(i, o.matrix)
      headRef.current?.setMatrixAt(i, o.matrix)
    })
    for (const r of [poleRef, armRef, headRef]) if (r.current) r.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={poleRef} args={[poleGeo, undefined, LAMP_POSTS.length]} castShadow>
        <meshStandardMaterial color="#41454a" />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[armGeo, undefined, LAMP_POSTS.length]}>
        <meshStandardMaterial color="#41454a" />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[headGeo, undefined, LAMP_POSTS.length]}>
        <meshStandardMaterial color="#f2e3b8" emissive="#f2e3b8" emissiveIntensity={0.25} />
      </instancedMesh>
    </>
  )
}

// Stop signs — post + red octagon, instanced, angled so they read from both
// approaches.
function StopSigns() {
  const postRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)
  const postGeo = useMemo(() => new CylinderGeometry(0.05, 0.05, 2.4, 5).translate(0, 1.2, 0), [])
  const headGeo = useMemo(() => new CylinderGeometry(0.42, 0.42, 0.07, 8).rotateX(Math.PI / 2).translate(0, 2.25, 0), [])
  useLayoutEffect(() => {
    const o = new Object3D()
    STOP_SIGNS.forEach((p, i) => {
      o.position.set(p.x, terrainHeight(p.x, p.z), p.z)
      o.rotation.set(0, Math.PI / 4, 0)
      o.updateMatrix()
      postRef.current?.setMatrixAt(i, o.matrix)
      headRef.current?.setMatrixAt(i, o.matrix)
    })
    for (const r of [postRef, headRef]) if (r.current) r.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={postRef} args={[postGeo, undefined, STOP_SIGNS.length]} castShadow>
        <meshStandardMaterial color="#9aa0a4" />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[headGeo, undefined, STOP_SIGNS.length]}>
        <meshStandardMaterial color="#b5392c" />
      </instancedMesh>
    </>
  )
}

// Fire hydrants — squat muted-red posts on the sidewalks.
function Hydrants() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    HYDRANTS.forEach((p, i) => {
      o.position.set(p.x, terrainHeight(p.x, p.z) + 0.31, p.z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, HYDRANTS.length]} castShadow>
      <cylinderGeometry args={[0.17, 0.21, 0.62, 8]} />
      <meshStandardMaterial color="#a8442f" />
    </instancedMesh>
  )
}

// Satire billboards — two poles + a panel + the ad copy.
function Billboards() {
  return (
    <>
      {BILLBOARDS.map((b, i) => {
        const y = terrainHeight(b.x, b.z)
        return (
          <group key={i} position={[b.x, y, b.z]} rotation={[0, b.ry, 0]}>
            <mesh position={[-2.4, 2.6, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.18, 5.2, 6]} />
              <meshStandardMaterial color="#4a4d52" />
            </mesh>
            <mesh position={[2.4, 2.6, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.18, 5.2, 6]} />
              <meshStandardMaterial color="#4a4d52" />
            </mesh>
            <mesh position={[0, 6.6, 0]} castShadow>
              <boxGeometry args={[8, 3.6, 0.22]} />
              <meshStandardMaterial color="#ece7db" />
            </mesh>
            <Suspense fallback={null}>
              <Text position={[0, 7.25, 0.14]} fontSize={0.78} color="#23262b" anchorX="center" anchorY="middle" maxWidth={7.4}>
                {b.top}
              </Text>
              <Text position={[0, 5.85, 0.14]} fontSize={0.48} color="#8a4a3a" anchorX="center" anchorY="middle">
                {b.sub}
              </Text>
            </Suspense>
          </group>
        )
      })}
    </>
  )
}

// Rooftop billboards — nonsense AI ads bolted to the tallest downtown towers,
// each facing the city centre so they read from the streets below. This is the
// "you can't escape the corporate grip" layer: even out for lunch, the skyline
// is still pitching you agentic synergy.
function RooftopAds() {
  return (
    <>
      {AD_ROOFS.map((r, i) => {
        const ad = ROOFTOP_ADS[i % ROOFTOP_ADS.length]
        const ry = Math.atan2(-r.x, -r.z) // face the map centre (the +Z panel front)
        const PW = Math.max(7, Math.min(15, Math.min(r.w, r.d) * 1.7))
        const PH = PW * 0.4
        const legH = 1.5
        return (
          <group key={i} position={[r.x, r.topY, r.z]} rotation={[0, ry, 0]}>
            {/* support legs */}
            {[-PW * 0.32, PW * 0.32].map((lx) => (
              <mesh key={lx} position={[lx, legH / 2, 0]} castShadow>
                <boxGeometry args={[0.2, legH, 0.2]} />
                <meshStandardMaterial color="#33363c" />
              </mesh>
            ))}
            {/* the sign panel */}
            <mesh position={[0, legH + PH / 2, 0]} castShadow>
              <boxGeometry args={[PW, PH, 0.22]} />
              <meshStandardMaterial color="#14161a" metalness={0.1} roughness={0.7} />
            </mesh>
            {/* glowing accent bar along the bottom (pops at dusk) */}
            <mesh position={[0, legH + 0.14, 0.13]}>
              <boxGeometry args={[PW, 0.26, 0.06]} />
              <meshStandardMaterial color={ad.accent} emissive={ad.accent} emissiveIntensity={1.1} toneMapped={false} />
            </mesh>
            <Suspense fallback={null}>
              <Text position={[0, legH + PH * 0.6, 0.14]} fontSize={PH * 0.32} color="#f4f6fa" anchorX="center" anchorY="middle" maxWidth={PW * 0.92} letterSpacing={0.02}>
                {ad.top}
              </Text>
              <Text position={[0, legH + PH * 0.26, 0.14]} fontSize={PH * 0.13} color={ad.accent} anchorX="center" anchorY="middle" maxWidth={PW * 0.9}>
                {ad.sub}
              </Text>
            </Suspense>
          </group>
        )
      })}
    </>
  )
}

// LA palms — thin tall trunk + a small green crown
const PALM_ITEMS = PALMS.filter((p) => !onPaved(p.x, p.z, 2.5)) // keep palms off pavement too
function Palms() {
  return (
    <>
      {PALM_ITEMS.map((p, i) => (
        <group key={i} position={[p.x, terrainHeight(p.x, p.z), p.z]}>
          <mesh position={[0, p.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, p.h, 6]} />
            <meshStandardMaterial color="#8a7150" />
          </mesh>
          <mesh position={[0, p.h, 0]} castShadow>
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
        <mesh position={[0, 7, 0]} castShadow>
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
      <mesh position={[0, 6, 0]} castShadow>
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

// --- drive-through storefronts ---
function Storefronts() {
  return (
    <>
      {STOREFRONTS.map((s) => {
        const hw = s.w / 2
        const hd = s.d / 2
        // Sink the building into the slope like the city towers: base below the
        // lowest footprint corner, top s.h above the highest — so it sits flush
        // on a hill instead of floating/tilting (fixes the crooked Slop Bowlz).
        const corners = [
          terrainHeight(s.x - hw, s.z - hd), terrainHeight(s.x + hw, s.z - hd),
          terrainHeight(s.x - hw, s.z + hd), terrainHeight(s.x + hw, s.z + hd),
        ]
        const minH = Math.min(...corners)
        const maxH = Math.max(...corners)
        const baseY = minH - 1.2
        const topY = maxH + s.h
        const midY = (baseY + topY) / 2
        const boxH = topY - baseY
        // unit vector from the building toward its pull-in window = the "front"
        const fx = s.zx - s.x
        const fz = s.zz - s.z
        const fl = Math.hypot(fx, fz) || 1
        const nx = fx / fl
        const nz = fz / fl
        const yaw = Math.atan2(nx, nz)
        // ground the front-face detail + the drive-thru at THEIR own terrain
        // heights (the window sits out on the flatter road), not the center's.
        const frontGY = terrainHeight(s.x + nx * hd, s.z + nz * hd)
        const winGY = terrainHeight(s.zx, s.zz)
        return (
          <group key={s.id}>
            {/* main building — sunk to span the footprint's slope */}
            <mesh position={[s.x, midY, s.z]} castShadow receiveShadow>
              <boxGeometry args={[s.w, boxH, s.d]} />
              <meshStandardMaterial color={s.color} />
            </mesh>
            {/* window strip on the front face */}
            <mesh position={[s.x + nx * (hd + 0.06), frontGY + 1.7, s.z + nz * (hd + 0.06)]} rotation={[0, yaw, 0]}>
              <boxGeometry args={[s.w * 0.55, 1.6, 0.12]} />
              <meshStandardMaterial color="#23262b" metalness={0.2} roughness={0.3} />
            </mesh>
            {/* sign band above the visible top */}
            <group position={[s.x + nx * (hd + 0.12), topY + 0.9, s.z + nz * (hd + 0.12)]} rotation={[0, yaw, 0]}>
              <mesh castShadow>
                <boxGeometry args={[s.w * 0.92, 2.5, 0.35]} />
                <meshStandardMaterial color="#f2efe6" />
              </mesh>
              <Suspense fallback={null}>
                <Text position={[0, 0, 0.22]} fontSize={0.92} maxWidth={s.w * 0.86} color={s.color} anchorX="center" anchorY="middle" textAlign="center">
                  {s.sign}
                </Text>
              </Suspense>
            </group>
            {/* drive-thru canopy over the window + 4 posts — grounded at the window */}
            <mesh position={[s.zx, winGY + 3.5, s.zz]} castShadow>
              <boxGeometry args={[7, 0.35, 7]} />
              <meshStandardMaterial color={s.color} />
            </mesh>
            {[
              [-3, -3],
              [3, -3],
              [-3, 3],
              [3, 3],
            ].map(([ox, oz], i) => (
              <mesh key={i} position={[s.zx + ox, winGY + 1.7, s.zz + oz]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 3.4, 6]} />
                <meshStandardMaterial color="#54585d" />
              </mesh>
            ))}
            {/* lane pad under the window */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s.zx, winGY + 0.05, s.zz]} receiveShadow>
              <planeGeometry args={[10, 8]} />
              <meshStandardMaterial color="#34363a" />
            </mesh>
            {/* menu board beside the lane */}
            <mesh position={[s.zx - nz * 4, winGY + 1.2, s.zz + nx * 4]} rotation={[0, yaw + 0.4, 0]} castShadow>
              <boxGeometry args={[1.4, 1.8, 0.18]} />
              <meshStandardMaterial color="#22251f" />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// Alignly HQ drop-off — a sign + entrance canopy on the tower's south face and
// a parking pad at the return zone (the bug fix: a reachable arrival outside the
// building, where the beacon also now sits).
function OfficeDropoff() {
  const ox = DEST_POINTS.office.x
  const oz = DEST_POINTS.office.z
  const gy = terrainHeight(ox, oz + 12)
  return (
    <group>
      <Suspense fallback={null}>
        <Billboard position={[ox, 34, oz + 8.3]}>
          <Text fontSize={3.4} color="#cfd8ea" anchorX="center" anchorY="middle">
            ALIGNLY
          </Text>
        </Billboard>
      </Suspense>
      {/* entrance canopy on the south face */}
      <mesh position={[ox, gy + 4, oz + 9]} castShadow>
        <boxGeometry args={[11, 0.4, 4]} />
        <meshStandardMaterial color="#2f3b57" />
      </mesh>
      {[-4.5, 4.5].map((sx) => (
        <mesh key={sx} position={[ox + sx, gy + 2, oz + 10.6]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 4, 6]} />
          <meshStandardMaterial color="#54585d" />
        </mesh>
      ))}
      {/* drop-off pad at the return zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, gy + 0.05, oz + 12]} receiveShadow>
        <planeGeometry args={[13, 9]} />
        <meshStandardMaterial color="#3a3d41" />
      </mesh>
    </group>
  )
}

// --- destination beacons ---
function Beacons() {
  const stepIndex = useLunchStore((s) => s.stepIndex)
  const mustRebowl = useLunchStore((s) => s.mustRebowl)
  const done = useLunchStore((s) => s.done)
  return (
    <>
      {DESTINATIONS.map((d, i) => {
        const state: BeaconState = stopStateFor(i, stepIndex, mustRebowl, done)
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
