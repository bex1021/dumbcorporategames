// Bout 1 — Brent K. / Engineering: "The Grid".
// Tron-blue, not black. Built around one hard constraint: Leonard wears BLACK,
// so the stage must give his silhouette something to read against. Three
// techniques do that, and they are why the palette is what it is:
//   1. HORIZON GLOW — a bright cyan band sits exactly at fighter height, so the
//      dark silhouette reads against light instead of black-on-black.
//   2. RIM LIGHT — cyan lights from BEHIND edge-light both fighters (the
//      standard fighting-game fix; brightening the key light instead would just
//      flatten everyone).
//   3. VALUE SEPARATION — everything near the fight plane is compressed into a
//      narrow dark-blue band; the bright stuff lives far away, behind fog.
//
// DEPTH is three REAL planes at different z, not layers painted on one wall.
// FightCamera tracks the fighters' midpoint in x and dollies in z, so genuine
// perspective parallax falls out for free — no scroll-rate faking. Each layer
// also gets aerial perspective (far = hazier, lower contrast, less saturated),
// which is the strongest depth cue available in a fixed-camera stage.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import { ARENA } from '../fightConfig'
import {
  useBackdropTexture,
  prand,
  REDUCED_MOTION,
  useStageClock,
  useStageIntensity,
  drawAlignlyMark,
} from './stageKit'
import { FloatingPosters, type PosterPlacement } from './OfficeProps'

// Office posters drifting outside the fight band — eng-flavoured for this bout.
// Placed LOW and WIDE: high posters collided with the HUD bars, and anything
// near centre would sit behind the fight.
const GRID_POSTERS: readonly PosterPlacement[] = [
  { variant: 'shipit', pos: [-6.3, 1.5, -4.2], rotY: 0.55, scale: 1.35, period: 11 },
  { variant: 'velocity', pos: [6.5, 1.7, -4.8], rotY: -0.5, scale: 1.4, period: 13, phase: 2 },
  { variant: 'ownership', pos: [-7.6, 1.1, -6.6], rotY: 0.38, scale: 1.2, period: 9.5, phase: 4 },
  { variant: 'synergy', pos: [7.9, 1.2, -6.9], rotY: -0.34, scale: 1.2, period: 12, phase: 5 },
]

const W = 1024
const H = 512
// World height the horizon sits at — chest/head height, so a dark silhouette
// reads against the glow. Shared by every layer so they line up exactly.
const HORIZON_Y = 1.1

// Each layer's plane. Farther layers are larger to subtend the same angle.
const LAYERS = {
  far: { z: -15, w: 52, h: 20, cy: 6.6 },
  mid: { z: -9.5, w: 36, h: 14, cy: 4.8 },
  near: { z: -5.5, w: 25, h: 10, cy: 3.4 },
} as const

/** Canvas row where a given layer's horizon must be drawn so every layer's
 *  horizon lands on the SAME world height. */
function horizonRow(L: { h: number; cy: number }): number {
  return ((L.cy + L.h / 2 - HORIZON_Y) / L.h) * H
}

const COLS = 44
const CELL = W / COLS
const SPEED = Array.from({ length: COLS }, (_, i) => 0.5 + prand(i) * 0.9)
// Cyan/electric ramp — Tron, not terminal-green.
const RAIN = ['#0e3a55', '#12607f', '#1f9fc4', '#4fd6f5']

// ── FAR: sky, the horizon glow, and a hazy distant skyline ──────────────────
function drawFar(ctx: CanvasRenderingContext2D): void {
  const hz = horizonRow(LAYERS.far)
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#03060f')
  sky.addColorStop(0.5, '#061426')
  sky.addColorStop(0.8, '#0a2742')
  sky.addColorStop(1, '#04101d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // The readability band. Enough separation for a black silhouette, NOT a white
  // slab — the deep blue must stay dominant or the stage stops reading as night.
  const glow = ctx.createLinearGradient(0, hz - 140, 0, hz + 80)
  glow.addColorStop(0, 'rgba(31,111,235,0)')
  glow.addColorStop(0.45, 'rgba(45,140,215,0.20)')
  glow.addColorStop(0.68, 'rgba(110,205,245,0.38)')
  glow.addColorStop(0.84, 'rgba(50,150,220,0.18)')
  glow.addColorStop(1, 'rgba(20,80,170,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, hz - 140, W, 220)
  const hot = ctx.createLinearGradient(0, 0, W, 0)
  hot.addColorStop(0, 'rgba(80,214,245,0)')
  hot.addColorStop(0.5, 'rgba(175,238,255,0.6)')
  hot.addColorStop(1, 'rgba(80,214,245,0)')
  ctx.fillStyle = hot
  ctx.fillRect(0, hz - 1, W, 2)

  // Distant skyline — AERIAL PERSPECTIVE: barely darker than the sky, cool, and
  // very low contrast. Reads as "miles away" rather than "small".
  let x = -20
  let i = 0
  while (x < W) {
    const bw = 14 + prand(i * 3.7) * 26
    const bh = 18 + prand(i * 1.9) * 62
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#0b2b47'
    ctx.fillRect(x, hz - bh, bw, bh)
    ctx.globalAlpha = 0.22
    ctx.fillStyle = '#5fc4e8'
    ctx.fillRect(x, hz - bh, bw, 1)
    x += bw + 2 + prand(i * 9.1) * 12
    i++
  }
  ctx.globalAlpha = 1

  // ── SYSTEM ARCHITECTURE DIAGRAM ────────────────────────────────────────
  // The thing every engineer has been made to draw on a whiteboard. Rendered
  // as a big faint neon schematic in the sky — boxes, arrows, labels. This is
  // the clearest "this fight is about ENGINEERING" signal in the stage, and it
  // sits high and dim so it never competes with the fighters.
  const NODES: [number, number, number, number, string][] = [
    [312, 150, 96, 40, 'gateway'],
    [312, 232, 96, 40, 'auth'],
    [452, 150, 96, 40, 'queue'],
    [452, 232, 96, 40, 'workers'],
    [592, 150, 96, 40, 'cache'],
    [592, 232, 96, 40, 'db'],
  ]
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = '#3fc9f0'
  ctx.lineWidth = 1.4
  // edges first, so boxes sit on top
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    // arrowhead
    const a = Math.atan2(by - ay, bx - ax)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx - Math.cos(a - 0.4) * 7, by - Math.sin(a - 0.4) * 7)
    ctx.moveTo(bx, by)
    ctx.lineTo(bx - Math.cos(a + 0.4) * 7, by - Math.sin(a + 0.4) * 7)
    ctx.stroke()
  }
  edge(408, 170, 452, 170) // gateway → queue
  edge(360, 190, 360, 232) // gateway → auth
  edge(408, 252, 452, 252) // auth → workers
  edge(500, 190, 500, 232) // queue → workers
  edge(548, 170, 592, 170) // queue → cache
  edge(548, 252, 592, 252) // workers → db
  edge(640, 190, 640, 232) // cache → db
  for (const [nx, ny, nw, nh, label] of NODES) {
    ctx.globalAlpha = 0.16
    ctx.fillStyle = '#0d3a5c'
    ctx.fillRect(nx, ny, nw, nh)
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = '#4fd6f5'
    ctx.lineWidth = 1.4
    ctx.strokeRect(nx, ny, nw, nh)
    ctx.fillStyle = '#9ee9ff'
    ctx.font = '13px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(label, nx + nw / 2, ny + nh / 2 + 4)
  }
  ctx.globalAlpha = 1

  // Contribution-graph frieze, high and very dim — a motif, not a headline.
  for (let g = 0; g < 46; g++) {
    for (let j = 0; j < 3; j++) {
      const v = prand(g * 13.7 + j * 5.1)
      ctx.globalAlpha = 0.07 + v * 0.13
      ctx.fillStyle = v < 0.5 ? '#12607f' : '#1f9fc4'
      ctx.fillRect(g * 15 + 120, 26 + j * 15, 11, 11)
    }
  }
  ctx.globalAlpha = 1
}

// ── MID: the main tower skyline + the binary rain. Transparent above so the
//    far layer's sky and glow show through. ─────────────────────────────────
function drawMid(ctx: CanvasRenderingContext2D, t: number): void {
  const hz = horizonRow(LAYERS.mid)
  ctx.clearRect(0, 0, W, H)

  // Binary rain, kept ABOVE the horizon so it never becomes noise behind a
  // fighter's silhouette. Fades toward the horizon (aerial perspective).
  ctx.font = '12px ui-monospace, monospace'
  ctx.textAlign = 'center'
  for (let c = 0; c < COLS; c++) {
    if (prand(c * 7.3) < 0.42) continue
    const scroll = t * SPEED[c]
    const frac = scroll - Math.floor(scroll)
    for (let r = -1; r < 26; r++) {
      const y = (r + 1 - frac) * 16
      if (y > hz - 150) break
      const absRow = Math.floor(scroll) + r
      const age = ((absRow % 10) + 10) % 10
      ctx.fillStyle = RAIN[age < 2 ? 3 : age < 4 ? 2 : age < 7 ? 1 : 0]
      ctx.globalAlpha = (0.18 + prand(c * 3.1 + absRow) * 0.32) * Math.max(0, 1 - y / (hz - 110))
      ctx.fillText(prand(c * 131 + absRow * 17.7) < 0.5 ? '0' : '1', c * CELL + CELL / 2, y)
    }
  }
  ctx.globalAlpha = 1

  // SERVER RACKS, not generic towers — the skyline of a datacentre. Each is
  // divided into rack units with LED columns, which is what makes the silhouette
  // read as INFRASTRUCTURE rather than as buildings. This is the biggest single
  // "this is engineering" cue in the stage.
  let x = -30
  let i = 0
  while (x < W) {
    const bw = 30 + prand(i * 3.7) * 46
    const bh = 50 + prand(i * 1.9) * 130
    const top = hz - bh
    ctx.globalAlpha = 0.94
    ctx.fillStyle = '#04121f'
    ctx.fillRect(x, top, bw, bh)
    // rack-unit divisions
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#0d3a5c'
    for (let u = top + 10; u < hz - 4; u += 11) ctx.fillRect(x + 3, u, bw - 6, 1)
    // LED columns — the tell. Two narrow strips of status lights per rack.
    for (const cx of [x + 6, x + bw - 10]) {
      for (let u = top + 12, k = 0; u < hz - 6; u += 11, k++) {
        const v = prand(i * 31 + k * 7.7 + cx)
        if (v < 0.35) continue
        ctx.globalAlpha = 0.45 + v * 0.45
        ctx.fillStyle = v > 0.88 ? '#9ee9ff' : v > 0.62 ? '#4fd6f5' : '#1f6feb'
        ctx.fillRect(cx, u, 4, 3)
      }
    }
    // lit top edge
    ctx.globalAlpha = 0.55 + prand(i * 5.5) * 0.4
    ctx.fillStyle = '#4fd6f5'
    ctx.fillRect(x, top, bw, 1.6)
    x += bw + 4 + prand(i * 9.1) * 16
    i++
  }
  ctx.globalAlpha = 1

}

// ── NEAR: dark framing structures at the EDGES only. The centre stays fully
//    transparent — a foreground occluder must never sit behind the fight. ────
function drawNear(ctx: CanvasRenderingContext2D): void {
  const hz = horizonRow(LAYERS.near)
  ctx.clearRect(0, 0, W, H)
  // Highest contrast of the three layers: nearest = darkest and sharpest.
  const gantry = (gx: number, flip: number) => {
    ctx.fillStyle = '#01070e'
    // vertical mast
    ctx.fillRect(gx, hz - 300, 26, 300)
    // cross-arms reaching toward centre
    for (let a = 0; a < 3; a++) {
      const ay = hz - 260 + a * 78
      ctx.fillRect(gx + (flip > 0 ? 26 : -66), ay, 66, 11)
    }
    // edge-lit strips — the Tron tell, brightest thing on this layer
    ctx.fillStyle = '#5fd8ff'
    ctx.globalAlpha = 0.85
    ctx.fillRect(gx + (flip > 0 ? 26 : -3), hz - 300, 3, 300)
    ctx.globalAlpha = 1
  }
  gantry(20, 1)
  gantry(W - 46, -1)

  // Alignly branding on the gantry — this datacentre belongs to somebody.
  drawAlignlyMark(ctx, 26, hz - 342, 30, { wordmark: false, alpha: 0.9 })
  drawAlignlyMark(ctx, W - 56, hz - 342, 30, { wordmark: false, alpha: 0.9 })
  // low rail running along the base, framing the floor edge
  ctx.fillStyle = '#01070e'
  ctx.fillRect(0, hz + 6, 210, 14)
  ctx.fillRect(W - 210, hz + 6, 210, 14)
  ctx.fillStyle = '#3fc9f0'
  ctx.globalAlpha = 0.7
  ctx.fillRect(0, hz + 6, 210, 2)
  ctx.fillRect(W - 210, hz + 6, 210, 2)
  ctx.globalAlpha = 1
}

// Grid geometry with a per-vertex alpha ramp so lines FADE with distance
// (atmospheric perspective) instead of ending in a hard line.
function useGrid(): THREE.BufferGeometry {
  return useMemo(() => {
    const pos: number[] = []
    const col: number[] = []
    const xMax = ARENA.halfWidth + 5
    const zNear = 2.2
    const zFar = -13
    const near = new THREE.Color('#7ae4ff')
    const far = new THREE.Color('#082a4e')
    const push = (x: number, z: number) => {
      pos.push(x, 0, z)
      const k = Math.min(1, Math.max(0, (z - zFar) / (zNear - zFar)))
      const c = far.clone().lerp(near, k * k)
      col.push(c.r, c.g, c.b)
    }
    for (let x = -xMax; x <= xMax + 0.01; x += 0.85) {
      push(x, zNear)
      push(x, zFar)
    }
    for (let z = zNear; z >= zFar; z -= 0.85) {
      push(-xMax, z)
      push(xMax, z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    return g
  }, [])
}

// Drifting motes: ~380 additive points in ONE draw call. Additive blending is
// commutative, so no per-frame depth sorting — this is the cheap way to make the
// air feel lit. Motion is a slow time-based sine and freezes under reduced
// motion (photosensitivity rule); nothing here flickers.
function Motes() {
  const ref = useRef<THREE.Points>(null)
  const { geom, seeds } = useMemo(() => {
    const n = 380
    const pos = new Float32Array(n * 3)
    const s = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (prand(i * 1.7) - 0.5) * (ARENA.halfWidth * 2 + 12)
      pos[i * 3 + 1] = prand(i * 3.3) * 4.6 + 0.1
      pos[i * 3 + 2] = -9 + prand(i * 5.9) * 11
      s[i] = prand(i * 7.1)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return { geom: g, seeds: s }
  }, [])
  const base = useMemo(() => Float32Array.from(geom.getAttribute('position').array), [geom])
  const clock = useStageClock()
  useFrame(() => {
    if (REDUCED_MOTION || !ref.current) return
    // Stage clock, so the motes hang motionless in the impact freeze.
    const t = clock.t
    const attr = geom.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < seeds.length; i++) {
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * (0.12 + seeds[i] * 0.16) + seeds[i] * 9) * 0.5
      arr[i * 3] = base[i * 3] + Math.sin(t * 0.07 + seeds[i] * 5) * 0.3
    }
    attr.needsUpdate = true
  })
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        size={0.045}
        color="#8fe6ff"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

// DATA TRAFFIC — light-cycle streaks running the floor lines toward the
// horizon. Three at a time, each on its own lane and its own slow loop, so the
// floor has life without anything crossing the fight band. Deterministic
// (no Math.random), time-based, and frozen under reduced motion.
const LANES = [-3.1, -1.4, 2.6] as const
const TRAFFIC = LANES.map((x, i) => ({
  x,
  period: 5.5 + prand(i * 13.3) * 4.5, // seconds for one run
  phase: prand(i * 7.7) * 6,
  dir: prand(i * 3.9) > 0.5 ? 1 : -1, // toward or away from camera
}))
const Z_NEAR = 2.0
const Z_FAR = -12.5

// A streak is a COMET, not a dash: bright head, long fading tail. Painted once
// into a tiny texture — a flat plane reads as a road marking instead.
function useStreakTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 128)
    g.addColorStop(0, 'rgba(220,250,255,1)') // head
    g.addColorStop(0.12, 'rgba(150,230,255,0.75)')
    g.addColorStop(0.45, 'rgba(80,190,240,0.28)')
    g.addColorStop(1, 'rgba(40,140,220,0)') // tail
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 8, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

function DataTraffic() {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const streak = useStreakTexture()
  const clock = useStageClock()
  useFrame(() => {
    const t = clock.t
    for (let i = 0; i < TRAFFIC.length; i++) {
      const m = refs.current[i]
      if (!m) continue
      const T = TRAFFIC[i]
      const k = (((t + T.phase) / T.period) % 1 + 1) % 1
      const p = T.dir > 0 ? k : 1 - k
      const z = Z_NEAR + (Z_FAR - Z_NEAR) * p
      m.position.z = z
      // fade in and out at the ends so streaks never pop into existence
      const edge = Math.min(k, 1 - k)
      const a = Math.min(1, edge / 0.12)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = REDUCED_MOTION ? 0 : a * 0.85
    }
  })
  return (
    <>
      {TRAFFIC.map((T, i) => (
        <mesh
          key={T.x}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={[T.x, 0.03, Z_NEAR]}
          // Flat on the floor, tail pointing back along the direction of travel.
          rotation={[-Math.PI / 2, 0, T.dir > 0 ? Math.PI : 0]}
        >
          <planeGeometry args={[0.13, 4.2]} />
          <meshBasicMaterial
            map={streak}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

// The Grid leans in as a bout reaches match point: the floor bars and the
// flanking pylons burn hotter. Emissive only — a slow value ramp, never motion.
function Escalation() {
  const intensity = useStageIntensity()
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const boost = 1 + intensity.v * 0.9
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && m.emissiveIntensity !== undefined && o.userData.baseEmissive) {
        m.emissiveIntensity = o.userData.baseEmissive * boost
      }
    })
  })
  const mark = (base: number) => (el: THREE.Mesh | null) => {
    if (el) el.userData.baseEmissive = base
  }
  const wallW = ARENA.halfWidth * 2 + 10
  return (
    <group ref={group}>
      {[-(ARENA.halfWidth + 2.4), ARENA.halfWidth + 2.4].map((x) => (
        <mesh key={x} position={[x, 1.9, -4.2]} ref={mark(2.6)}>
          <boxGeometry args={[0.12, 3.8, 0.12]} />
          <meshStandardMaterial
            color="#0a2742"
            emissive="#3fc9f0"
            emissiveIntensity={2.6}
            toneMapped={false}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* FLOOR-LEVEL LIGHT BARS — the mirror can only double light that exists
          NEAR it, and every other emitter sits at head height. These are what
          turn the reflective floor into the wet-street Tron payoff. */}
      {[-2.4, 2.4].map((z) =>
        [-(ARENA.halfWidth + 1.2), ARENA.halfWidth + 1.2].map((x) => (
          <mesh key={`${x}:${z}`} position={[x, 0.06, z]} ref={mark(3.2)}>
            <boxGeometry args={[0.5, 0.05, 3.4]} />
            <meshStandardMaterial
              color="#0d3a5c"
              emissive="#5fd8ff"
              emissiveIntensity={3.2}
              toneMapped={false}
              roughness={0.3}
            />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.05, -6.1]} ref={mark(3.6)}>
        <boxGeometry args={[wallW * 0.9, 0.05, 0.16]} />
        <meshStandardMaterial
          color="#0d3a5c"
          emissive="#9beeff"
          emissiveIntensity={3.6}
          toneMapped={false}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

// ── TECH PANELS: a merged PR, a rebase in a terminal, and a CI pipeline ────
// Painted into the backdrop canvases these sat metres above the camera (those
// planes are 14–20m tall). As real 3D panels their world position is exact, so
// they're guaranteed to be in shot — and they parallax with the scene.
const PANEL_W = 512
const PANEL_H = 256

function panelTexture(draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = PANEL_W
  c.height = PANEL_H
  const ctx = c.getContext('2d')
  if (ctx) draw(ctx)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function drawPR(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, PANEL_W, PANEL_H)
  ctx.fillStyle = 'rgba(9,17,28,0.94)'
  ctx.fillRect(0, 0, PANEL_W, PANEL_H)
  ctx.strokeStyle = '#1f6feb'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, PANEL_W - 3, PANEL_H - 3)
  ctx.fillStyle = '#2ea043'
  ctx.beginPath()
  ctx.roundRect(24, 24, 120, 38, 19)
  ctx.fill()
  ctx.fillStyle = '#eafff0'
  ctx.font = 'bold 20px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('merged', 44, 50)
  ctx.fillStyle = '#8b98a5'
  ctx.font = '19px ui-monospace, monospace'
  ctx.fillText('brent-k wants to merge 47 commits', 24, 96)
  ctx.fillStyle = '#cfeeff'
  ctx.font = 'bold 26px ui-monospace, monospace'
  ctx.fillText('#4821  fix: null check on', 24, 138)
  ctx.fillText('portal refresh', 24, 172)
  ctx.fillStyle = '#2ea043'
  ctx.font = 'bold 22px ui-monospace, monospace'
  ctx.fillText('+128', 24, 216)
  ctx.fillStyle = '#f85149'
  ctx.fillText('−41', 96, 216)
  // diff squares
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i < 8 ? '#2ea043' : '#f85149'
    ctx.fillRect(168 + i * 14, 200, 10, 16)
  }
  drawAlignlyMark(ctx, 400, 196, 26, { wordmark: false, alpha: 0.8 })
}

function drawTerminal(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, PANEL_W, PANEL_H)
  ctx.fillStyle = 'rgba(5,10,17,0.96)'
  ctx.fillRect(0, 0, PANEL_W, PANEL_H)
  ctx.strokeStyle = '#12607f'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, PANEL_W - 3, PANEL_H - 3)
  ctx.fillStyle = '#0d2438'
  ctx.fillRect(3, 3, PANEL_W - 6, 40)
  for (let d = 0; d < 3; d++) {
    ctx.fillStyle = ['#f85149', '#e8c15a', '#2ea043'][d]
    ctx.beginPath()
    ctx.arc(28 + d * 26, 23, 7.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.font = '21px ui-monospace, monospace'
  ctx.textAlign = 'left'
  const lines: [string, string][] = [
    ['#39d353', '$ git rebase -i main'],
    ['#7fd8ff', '  47 commits, 3 conflicts'],
    ['#e8c15a', '  CONFLICT: scope.ts'],
    ['#f85149', '  <<<<<<< HEAD'],
    ['#8b98a5', '  resolving…'],
  ]
  lines.forEach(([col, txt], i) => {
    ctx.fillStyle = col
    ctx.fillText(txt, 22, 82 + i * 34)
  })
}

function drawPipeline(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, PANEL_W, PANEL_H)
  ctx.fillStyle = 'rgba(9,17,28,0.9)'
  ctx.fillRect(0, 0, PANEL_W, PANEL_H)
  ctx.strokeStyle = '#1f6feb'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, PANEL_W - 3, PANEL_H - 3)
  ctx.fillStyle = '#9ee9ff'
  ctx.font = 'bold 22px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('portal-refresh · pipeline', 24, 44)
  const STAGES = ['build', 'test', 'scan', 'deploy']
  const y = 132
  for (let s = 0; s < STAGES.length; s++) {
    const cx = 70 + s * 124
    if (s > 0) {
      ctx.strokeStyle = s < 3 ? '#2ea043' : '#e8c15a'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(cx - 100, y)
      ctx.lineTo(cx - 26, y)
      ctx.stroke()
    }
    const done = s < 3
    ctx.fillStyle = done ? '#2ea043' : '#e8c15a'
    ctx.beginPath()
    ctx.arc(cx, y, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#06121e'
    ctx.lineWidth = 4.5
    ctx.beginPath()
    if (done) {
      ctx.moveTo(cx - 9, y)
      ctx.lineTo(cx - 2, y + 8)
      ctx.lineTo(cx + 10, y - 8)
    } else {
      ctx.arc(cx, y, 9, 0, Math.PI * 1.4)
    }
    ctx.stroke()
    ctx.fillStyle = '#cfeeff'
    ctx.font = '20px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(STAGES[s], cx, y + 56)
  }
}

function TechPanels() {
  const pr = useMemo(() => panelTexture(drawPR), [])
  const term = useMemo(() => panelTexture(drawTerminal), [])
  const pipe = useMemo(() => panelTexture(drawPipeline), [])
  const clock = useStageClock()
  const refs = useRef<(THREE.Group | null)[]>([])
  // [texture, x, y, z, yaw, width]
  // Pushed BACK and DOWN: close to camera these dominated the frame and
  // collided with the HUD bars. They should read as things hanging in the
  // datacentre, not as UI.
  const items: [THREE.CanvasTexture, number, number, number, number, number][] = [
    [pr, -5.5, 2.0, -6.6, 0.45, 2.3],
    [term, 5.7, 2.0, -6.8, -0.42, 2.3],
    [pipe, 0.2, 2.85, -9.2, 0, 3.0],
  ]
  useFrame(() => {
    for (let i = 0; i < items.length; i++) {
      const g = refs.current[i]
      if (!g) continue
      g.position.y = items[i][2] + Math.sin(clock.t * 0.42 + i * 2.1) * 0.09
    }
  })
  return (
    <>
      {items.map(([tex, x, y, z, yaw, w], i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={[x, y, z]}
          rotation={[0, yaw, 0]}
        >
          <mesh>
            <planeGeometry args={[w, w * (PANEL_H / PANEL_W)]} />
            <meshBasicMaterial map={tex} transparent toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function EngineeringStage() {
  const far = useBackdropTexture(W, H, drawFar)
  const mid = useBackdropTexture(W, H, drawMid)
  const near = useBackdropTexture(W, H, drawNear)
  const grid = useGrid()
  const wallW = ARENA.halfWidth * 2 + 10
  return (
    <group>
      {/* Floor: a real MIRROR. Reflecting the neon doubles every light source
          and is the single biggest "is this Tron" cue after the grid itself.
          Extends back past the mid layer so its far edge never cuts a hard line
          across the skyline — the fog swallows it instead. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -5.5]} receiveShadow>
        <planeGeometry args={[wallW + 6, 20]} />
        <MeshReflectorMaterial
          resolution={256}
          mixBlur={0.85}
          mixStrength={2.2}
          blur={[180, 60]}
          depthScale={0.9}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.2}
          color="#061524"
          roughness={0.55}
          metalness={0.45}
          mirror={0.55}
        />
      </mesh>
      {/* Contrast hierarchy: fighters highest, then floor grid, then near BG,
          then far BG. 0.5 keeps the grid from competing. */}
      <lineSegments geometry={grid} position={[0, 0.002, 0]}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>
      <DataTraffic />
      <Motes />
      <TechPanels />
      <FloatingPosters items={GRID_POSTERS} />

      {/* ── PARALLAX LAYERS ────────────────────────────────────────────────
          Three planes at real depths. The camera's lateral tracking and dolly
          make them slide against each other automatically. fog={false} on the
          far layer keeps the horizon glow (the readability band) from being
          hazed away; the mid and near layers DO take fog, which is what gives
          the stack its atmospheric separation. */}
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

      {/* Glowing pylons + floor light bars. Grouped so escalation can lift them
          together as a bout reaches match point; they're also real geometry, so
          they parallax hardest and sell the depth of the layers behind them. */}
      <Escalation />

      {/* ── LIGHTING: the readability rig ──────────────────────────────────
          Two cyan rims from BEHIND carve a bright edge around both fighters so
          black clothing separates from a dark stage. Ambient TINTS, it does not
          lift — keep it low or the rims stop reading. The warm camera-side key
          carries the fighters, and its colour-temperature opposition against
          the cool stage is what makes them pop rather than tint blue. */}
      <directionalLight position={[-4.5, 3.2, -5]} intensity={2.4} color="#79e4ff" />
      <directionalLight position={[4.5, 3.2, -5]} intensity={1.9} color="#4aa8ff" />
      <ambientLight intensity={0.17} color="#2b6ea8" />
      <hemisphereLight args={['#3d8fd0', '#0a1826', 0.35]} />
      <directionalLight position={[1.5, 4, 5]} intensity={1.35} color="#ffd9b0" />
    </group>
  )
}
