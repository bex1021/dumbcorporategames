// Bout 3 — The Exec: "Corner office at golden hour".
// The different one: a real set, built for beauty. Floor-to-ceiling glass, the
// sun setting OFF-CENTER (camera-right, per Rebecca), layered city silhouettes
// with lit windows, the sun's glint path on the water.
//
// DEPTH is three REAL planes at different z (same treatment as the Grid):
//   far  — sky, sun, water with the glint path (the light source layer)
//   mid  — distant city, hazy and low-contrast (aerial perspective)
//   near — closer towers, darker and sharper, sparse lit windows
// The interior (mullions, table, chairs) is real 3D and acts as the nearest
// parallax layer for free. FightCamera tracks the fighters, so the planes
// slide against each other through genuine perspective.
import * as THREE from 'three'
import { ARENA } from '../fightConfig'
import { useBackdropTexture, prand, drawAlignlyMark } from './stageKit'
import { FloatingPosters, type PosterPlacement } from './OfficeProps'

// Even the corner office has the posters. Kept low and wide so they never
// cross the sunset or the fight.
const EXEC_POSTERS: readonly PosterPlacement[] = [
  { variant: 'ownership', pos: [-6.2, 1.4, -1.2], rotY: 0.6, scale: 1.3, period: 12.5 },
  { variant: 'synergy', pos: [6.4, 1.5, -1.6], rotY: -0.55, scale: 1.35, period: 10.5, phase: 3 },
]

// The company plaque by the glass — 1:1 with the mark used everywhere else.
const PLAQUE_W = 512
const PLAQUE_H = 160
function drawPlaque(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, PLAQUE_W, PLAQUE_H)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillRect(0, 0, PLAQUE_W, PLAQUE_H)
  ctx.strokeStyle = 'rgba(23,43,77,0.25)'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, PLAQUE_W - 4, PLAQUE_H - 4)
  drawAlignlyMark(ctx, 40, 34, 62, { wordmark: true })
  ctx.fillStyle = '#5e6c84'
  ctx.font = '22px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Executive Floor · 44', 42, 138)
}

const W = 1024
const H = 512
// Waterline height in WORLD metres — eye level, which is what sells "you are
// on a high floor". Shared by every layer so their horizons align exactly.
const HORIZON_Y = 1.5
// The sun sits off-centre right in WORLD space; each layer converts to its own
// canvas x so the disc and its glint stay in the same screen column.
const SUN_WORLD_X = 4.2

const LAYERS = {
  far: { z: -16, w: 56, h: 22, cy: 7.0 },
  mid: { z: -11, w: 40, h: 15, cy: 5.2 },
  near: { z: -7, w: 28, h: 10, cy: 3.6 },
} as const

function horizonRow(L: { h: number; cy: number }): number {
  return ((L.cy + L.h / 2 - HORIZON_Y) / L.h) * H
}
function worldXToCanvas(L: { w: number }, x: number): number {
  return (x / L.w + 0.5) * W
}

// ── FAR: the sky, the sun, and the water — the whole light source ───────────
function drawFar(ctx: CanvasRenderingContext2D, t: number): void {
  const hz = horizonRow(LAYERS.far)
  const sunX = worldXToCanvas(LAYERS.far, SUN_WORLD_X)

  const sky = ctx.createLinearGradient(0, 0, 0, hz)
  sky.addColorStop(0, '#2b1a4a')
  sky.addColorStop(0.45, '#a33d55')
  sky.addColorStop(0.8, '#ff8c42')
  sky.addColorStop(1, '#ffd07b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, hz)

  const glow = ctx.createRadialGradient(sunX, hz - 14, 8, sunX, hz - 14, 130)
  glow.addColorStop(0, 'rgba(255,240,196,0.95)')
  glow.addColorStop(0.35, 'rgba(255,190,110,0.4)')
  glow.addColorStop(1, 'rgba(255,190,110,0)')
  ctx.fillStyle = glow
  ctx.fillRect(sunX - 130, hz - 144, 260, 144)
  ctx.fillStyle = '#fff3cf'
  ctx.beginPath()
  ctx.arc(sunX, hz - 14, 34, 0, Math.PI * 2)
  ctx.fill()

  // Water: dusk mirror falling away below the horizon.
  const sea = ctx.createLinearGradient(0, hz, 0, H)
  sea.addColorStop(0, '#9a4a5e')
  sea.addColorStop(0.35, '#5c3050')
  sea.addColorStop(1, '#2c1a36')
  ctx.fillStyle = sea
  ctx.fillRect(0, hz, W, H - hz)

  // The glint path, directly under the sun. Slow deterministic breath
  // (reduced motion ⇒ t = 0, static). Bright enough to catch bloom.
  for (let i = 0; i < 24; i++) {
    const y = hz + 4 + i * ((H - hz - 8) / 24)
    const depth = i / 24
    const breathe = 1 + 0.14 * Math.sin(t * 0.6 + i * 1.3)
    const len = (14 + depth * 120) * breathe * (0.5 + prand(i * 2.9) * 0.8)
    const off = (prand(i * 5.7) - 0.5) * 46 * depth
    ctx.globalAlpha = 0.6 - depth * 0.3
    ctx.fillStyle = i % 3 === 0 ? '#ffe9bc' : '#ffb87e'
    ctx.fillRect(sunX + off - len / 2, y, len, 2)
  }
  // sparse faint glints away from the path
  for (let i = 0; i < 12; i++) {
    const y = hz + 10 + prand(i * 8.3) * (H - hz - 18)
    const x = prand(i * 4.9) * W
    ctx.globalAlpha = 0.1
    ctx.fillStyle = '#ffd8a0'
    ctx.fillRect(x, y, 22 + prand(i) * 34, 1.4)
  }
  ctx.globalAlpha = 1
}

// ── MID: the far shore — hazy, warm-tinted silhouettes, aerial perspective ──
function drawMid(ctx: CanvasRenderingContext2D): void {
  const hz = horizonRow(LAYERS.mid)
  const sunX = worldXToCanvas(LAYERS.mid, SUN_WORLD_X)
  ctx.clearRect(0, 0, W, H)
  let x = -20
  let i = 0
  while (x < W) {
    const bw = 20 + prand(i * 3.7) * 34
    let bh = 24 + prand(i * 1.9) * 66
    // the sun disc itself stays unobstructed even by the hazy far shore
    if (x < sunX + 50 && x + bw > sunX - 50) bh = Math.min(bh, 18)
    // barely darker than the sky behind it — reads as miles away
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#4a2450'
    ctx.fillRect(x, hz - bh, bw, bh)
    ctx.globalAlpha = 0.25
    ctx.fillStyle = '#ffb87e'
    ctx.fillRect(x, hz - bh, bw, 1)
    ctx.globalAlpha = 0.3
    for (let k = 0; k < bw * bh * 0.0012; k++) {
      const wx = x + 3 + prand(i * 51 + k * 7.3) * (bw - 6)
      const wy = hz - bh + 5 + prand(i * 97 + k * 3.1) * (bh - 10)
      ctx.fillStyle = '#ffd07b'
      ctx.fillRect(wx, wy, 2, 2)
    }
    x += bw + 2 + prand(i * 9.1) * 16
    i++
  }
  ctx.globalAlpha = 1
}

// ── NEAR: the close towers — darkest, sharpest, the fight's backdrop.
//    SQUAT by design: the sunset band is the hero of this stage, so the near
//    skyline mostly stays below the glow, with a couple of tall towers only at
//    the frame edges, and the sun's column is kept completely clear. ────────
function drawNear(ctx: CanvasRenderingContext2D): void {
  const hz = horizonRow(LAYERS.near)
  const sunX = worldXToCanvas(LAYERS.near, SUN_WORLD_X)
  ctx.clearRect(0, 0, W, H)
  let x = -30
  let i = 0
  while (x < W) {
    const bw = 40 + prand(i * 3.7) * 60
    const nearEdge = x < 170 || x + bw > W - 170
    let bh = 26 + prand(i * 1.9) * 60
    if (nearEdge && prand(i * 4.3) > 0.45) bh = 120 + prand(i * 2.7) * 110 // edge towers frame the shot
    // keep the sun's column clear — nothing tall may cross the glint axis
    const overlapsSun = x < sunX + 80 && x + bw > sunX - 80
    if (overlapsSun) bh = Math.min(bh, 34)
    ctx.globalAlpha = 0.96
    ctx.fillStyle = '#1c1233'
    ctx.fillRect(x, hz - bh, bw, bh)
    // warm rooftop edge facing the sun
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#ff9a5a'
    ctx.fillRect(x, hz - bh, bw, 1.6)
    // lit windows — sparse, warm, brighter than the mid layer's
    ctx.globalAlpha = 0.75
    for (let k = 0; k < bw * bh * 0.0016; k++) {
      const wx = x + 4 + prand(i * 51 + k * 7.3) * (bw - 9)
      const wy = hz - bh + 7 + prand(i * 97 + k * 3.1) * (bh - 14)
      ctx.fillStyle = prand(i + k * 1.3) > 0.8 ? '#fff0c4' : '#ffd07b'
      ctx.fillRect(wx, wy, 3, 3)
    }
    x += bw + 16 + prand(i * 9.1) * 44
    i++
  }
  ctx.globalAlpha = 1
}

const CHAIR_X = [-1.35, -0.45, 0.45, 1.35]

export function BoardroomStage() {
  const far = useBackdropTexture(W, H, drawFar)
  const mid = useBackdropTexture(W, H, drawMid)
  const near = useBackdropTexture(W, H, drawNear)
  const plaque = useBackdropTexture(PLAQUE_W, PLAQUE_H, drawPlaque)
  const wallW = ARENA.halfWidth * 2 + 8
  return (
    <group>
      {/* dark hardwood floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -3.2]} receiveShadow>
        <planeGeometry args={[wallW, 10]} />
        <meshStandardMaterial color="#221318" roughness={0.65} />
      </mesh>

      {/* ── PARALLAX LAYERS behind the glass ───────────────────────────────
          far (sky/sun/water) ignores fog — it IS the light; the two city
          layers take fog, which adds atmospheric separation on top of their
          painted haze. */}
      <mesh position={[0, LAYERS.far.cy, LAYERS.far.z]}>
        <planeGeometry args={[LAYERS.far.w, LAYERS.far.h]} />
        <meshBasicMaterial map={far} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, LAYERS.mid.cy, LAYERS.mid.z]}>
        <planeGeometry args={[LAYERS.mid.w, LAYERS.mid.h]} />
        <meshBasicMaterial map={mid} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, LAYERS.near.cy, LAYERS.near.z]}>
        <planeGeometry args={[LAYERS.near.w, LAYERS.near.h]} />
        <meshBasicMaterial map={near} transparent toneMapped={false} />
      </mesh>

      {/* window mullions — the interior IS the nearest parallax layer.
          Never dead-centre; the sun path stays clean. */}
      {[-5.4, -1.8, 1.8, 5.4].map((x) => (
        <mesh key={x} position={[x, 2.1, -2.42]}>
          <boxGeometry args={[0.09, 5.6, 0.06]} />
          <meshStandardMaterial color="#0e0a14" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 4.35, -2.42]}>
        <boxGeometry args={[wallW, 0.09, 0.06]} />
        <meshStandardMaterial color="#0e0a14" roughness={0.6} />
      </mesh>

      {/* Boardroom table. The top is GLASS-SHEEN (low roughness + metalness)
          so it catches the sunset — the single cue that turns graybox furniture
          into "executive". Chamfered edge band + slab legs read as a real
          conference table in silhouette. */}
      <group position={[0, 0, -1.55]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.045, 1.05]} />
          <meshStandardMaterial color="#2a1a16" roughness={0.12} metalness={0.55} />
        </mesh>
        {/* edge band under the glass — gives the top thickness */}
        <mesh position={[0, 0.705, 0]}>
          <boxGeometry args={[3.36, 0.035, 1.01]} />
          <meshStandardMaterial color="#140c0a" roughness={0.7} />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.35, 0]} castShadow>
              <boxGeometry args={[0.1, 0.7, 0.72]} />
              <meshStandardMaterial color="#120a09" roughness={0.6} />
            </mesh>
            <mesh position={[x, 0.02, 0]}>
              <boxGeometry args={[0.34, 0.04, 0.86]} />
              <meshStandardMaterial color="#0e0807" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Executive chairs: rounded back, armrests, a post and a star base —
          the silhouette is what sells them at this distance. */}
      {CHAIR_X.map((x) => (
        <group key={x} position={[x, 0, -2.05]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.44, 0.08, 0.44]} />
            <meshStandardMaterial color="#1a1220" roughness={0.45} />
          </mesh>
          {/* back — slightly reclined, rounded top */}
          <mesh position={[0, 0.85, -0.19]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[0.44, 0.6, 0.07]} />
            <meshStandardMaterial color="#1a1220" roughness={0.45} />
          </mesh>
          <mesh position={[0, 1.14, -0.22]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.44, 8]} />
            <meshStandardMaterial color="#241830" roughness={0.4} />
          </mesh>
          {/* armrests */}
          {[-0.25, 0.25].map((ax) => (
            <mesh key={ax} position={[ax, 0.66, -0.02]}>
              <boxGeometry args={[0.05, 0.05, 0.34]} />
              <meshStandardMaterial color="#241830" roughness={0.4} />
            </mesh>
          ))}
          {/* post + base */}
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.46, 8]} />
            <meshStandardMaterial color="#0f0a14" roughness={0.55} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.045, 10]} />
            <meshStandardMaterial color="#0f0a14" roughness={0.55} metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* GLASS PRESENCE: two faint diagonal sheen streaks across the panes.
          Additive, ~4% white, static — the cue that says "there is glass here"
          rather than an open balcony. depthWrite off so they never occlude. */}
      {[
        [-3.6, 1.0],
        [2.9, -0.7],
      ].map(([sx, rot]) => (
        <mesh key={sx} position={[sx, 2.3, -2.38]} rotation={[0, 0, rot]}>
          <planeGeometry args={[0.3, 6]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            // 0.012, not 0.045: additive + bloom multiplies these hard, and at
            // the higher value they stopped reading as glass and became light
            // bars across the whole room.
            opacity={0.012}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      <FloatingPosters items={EXEC_POSTERS} />
      {/* branded plaque on the pier between window bays */}
      <mesh position={[-4.9, 1.35, -2.36]} rotation={[0, 0.14, 0]}>
        <planeGeometry args={[0.95, 0.95 * (PLAQUE_H / PLAQUE_W)]} />
        <meshBasicMaterial map={plaque} transparent toneMapped={false} />
      </mesh>

      {/* ── LIGHTING: golden hour, but the fighters must still READ ─────────
          Strong rim from the sun side to carve their edges, a softer cool
          bounce from the opposite side (sky fill), a warm key from the camera
          so faces hold detail against the bright window. */}
      <directionalLight position={[5, 2.6, -6]} intensity={1.9} color="#ffa060" />
      <directionalLight position={[-5, 3, -4]} intensity={0.8} color="#8fa6d8" />
      <directionalLight position={[0.5, 3.4, 5.5]} intensity={1.15} color="#ffd2a8" />
      <ambientLight intensity={0.55} color="#c9a3b8" />
    </group>
  )
}
