// Bout 2 — Priya S. / Product: "The Board".
// The BRIGHT one (per Rebecca: lighter than Brent's for variability — the bout
// arc is dark → light → golden hour). A daylight product studio.
//
// DEPTH is three REAL planes at different z (same treatment as the Grid):
//   far  — soft room wash with oversized, faint Figma-style frame outlines
//   mid  — the kanban wall, crisp, on its own high-res plane
//   near — floating translucent UI panes at the frame EDGES only
// FightCamera tracks the fighters, so the planes slide against each other
// through genuine perspective. Light stages still need a value structure:
// saturated Jira colour on the board, desaturated wash behind it.
import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import { ARENA } from '../fightConfig'
import { useBackdropTexture, drawAlignlyMark } from './stageKit'
import { FloatingPosters, type PosterPlacement } from './OfficeProps'

// This is still the office — posters drift outside the fight band.
const BOARD_POSTERS: readonly PosterPlacement[] = [
  { variant: 'alignment', pos: [-6.4, 1.5, -4.2], rotY: 0.52, scale: 1.35, period: 12 },
  { variant: 'synergy', pos: [6.6, 1.7, -4.6], rotY: -0.48, scale: 1.4, period: 10, phase: 2 },
  { variant: 'velocity', pos: [-7.7, 1.1, -6.6], rotY: 0.36, scale: 1.2, period: 13.5, phase: 4 },
]

const JIRA = '#2684ff'
const JIRA_DEEP = '#0052cc'
const FIGMA = { red: '#f24e1e', purple: '#a259ff', green: '#0acf83', blue: '#1abcfe' }

// Layer planes. Far/near sizes proven on the Grid (same camera); the board gets
// its own smaller, high-res plane so the columns stay crisp.
const FAR = { z: -15, w: 52, h: 20, cy: 6.6 }
// Sized so the column HEADERS clear the top of the camera's framing — the
// board plane is much taller than the shot, so this has to be checked visually.
const BOARD = { z: -8.5, w: 8.6, h: 3.9, cy: 1.82 }
const PANE = { z: -5, w: 3.1, h: 4.1, cy: 2.2, x: 6.9 }

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function cursor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + 13, y + 24)
  ctx.lineTo(x + 4, y + 20)
  ctx.lineTo(x, y + 32)
  ctx.closePath()
  ctx.fill()
  rounded(ctx, x + 17, y + 21, 62, 22, 11)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 13px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, x + 48, y + 36)
}

// ── FAR: desaturated wash + oversized frame outlines (the "infinite canvas") ─
function drawFar(ctx: CanvasRenderingContext2D): void {
  const W = 1024
  const H = 512
  const room = ctx.createLinearGradient(0, 0, 0, H)
  room.addColorStop(0, '#c4d8f0')
  room.addColorStop(0.55, '#e6effa')
  room.addColorStop(1, '#b9cfe9')
  ctx.fillStyle = room
  ctx.fillRect(0, 0, W, H)
  const pool = ctx.createRadialGradient(W / 2, 200, 60, W / 2, 200, 560)
  pool.addColorStop(0, 'rgba(255,255,255,0.7)')
  pool.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, W, H)
  // faint dotted layout grid — the design-canvas tell
  ctx.fillStyle = 'rgba(38,132,255,0.10)'
  for (let gx = 32; gx < W; gx += 64) for (let gy = 32; gy < H; gy += 64) ctx.fillRect(gx, gy, 2, 2)
  // oversized frame outlines, barely-there — aerial perspective for UI-land
  ctx.strokeStyle = 'rgba(38,132,255,0.13)'
  ctx.lineWidth = 3
  for (const [fx, fy, fw, fh] of [
    [90, 90, 300, 220],
    [640, 60, 300, 200],
    [420, 300, 260, 170],
  ] as const) {
    ctx.strokeRect(fx, fy, fw, fh)
    ctx.fillStyle = 'rgba(38,132,255,0.16)'
    ctx.fillRect(fx, fy - 18, 74, 12) // frame name tab
  }
}

// ── MID: the kanban board, crisp and saturated ──────────────────────────────
function drawBoard(ctx: CanvasRenderingContext2D, t: number): void {
  const W = 1024
  const H = 573
  ctx.clearRect(0, 0, W, H)
  const CW = 240
  const GAP = 24
  const BX = (W - CW * 3 - GAP * 2) / 2
  const BY = 56
  const colX = [BX, BX + CW + GAP, BX + (CW + GAP) * 2]
  const titles = ['To do', 'In progress', 'Done']

  // Board header — the Alignly workspace this sprint lives in.
  drawAlignlyMark(ctx, BX, 6, 34, { wordmark: true })
  ctx.fillStyle = '#5e6c84'
  ctx.font = '17px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Customer Happiness Portal Refresh · Sprint 14', BX + 132, 30)

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#cadff5'
    rounded(ctx, colX[i], BY, CW, 452, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,82,204,0.32)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = i === 2 ? FIGMA.green : JIRA
    rounded(ctx, colX[i], BY, CW, 46, 16)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 22px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(titles[i], colX[i] + 18, BY + 31)
    const n = 3 - i
    for (let k = 0; k < n; k++) {
      const cy = BY + 66 + k * 92
      ctx.fillStyle = '#ffffff'
      rounded(ctx, colX[i] + 14, cy, CW - 28, 76, 10)
      ctx.fill()
      ctx.fillStyle = '#b7cfec'
      ctx.fillRect(colX[i] + 32, cy + 22, 128 - k * 22, 9)
      ctx.fillRect(colX[i] + 32, cy + 44, 88, 9)
      ctx.fillStyle = [JIRA, FIGMA.purple, FIGMA.red][(i + k) % 3]
      ctx.fillRect(colX[i] + 14, cy, 7, 76)
    }
  }

  // The sliding ticket: To do → In progress → Done on a slow 9s cycle.
  const cycle = (t / 9) % 3
  const seg = Math.floor(cycle)
  const f = cycle - seg
  const ease = f < 0.15 ? 0 : f > 0.35 ? 1 : (f - 0.15) / 0.2
  const smooth = ease * ease * (3 - 2 * ease)
  const sx = colX[seg] + (colX[(seg + 1) % 3] - colX[seg]) * (seg === 2 ? 0 : smooth)
  const cardY = BY + 330
  // DONE BEAT: the accent bar warms to green as the card settles in Done —
  // a quiet payoff, eased over the first quarter of the segment. No flash.
  let accent = JIRA
  if (seg === 2) {
    const g = Math.min(1, f / 0.25)
    accent = g > 0.5 ? FIGMA.green : JIRA
  }
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = seg === 2 ? FIGMA.green : JIRA_DEEP
  ctx.lineWidth = 3
  rounded(ctx, sx + 14, cardY, CW - 28, 76, 10)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.fillRect(sx + 14, cardY, 7, 76)
  ctx.fillStyle = '#8fb0d6'
  ctx.fillRect(sx + 32, cardY + 22, 116, 9)
  ctx.fillRect(sx + 32, cardY + 44, 78, 9)

  // Pen-tool curve with anchors (static).
  ctx.strokeStyle = FIGMA.purple
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(120, 542)
  ctx.bezierCurveTo(280, 496, 560, 566, 900, 520)
  ctx.stroke()
  for (const [ax, ay] of [
    [120, 542],
    [900, 520],
  ]) {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = FIGMA.purple
    ctx.lineWidth = 3
    ctx.fillRect(ax - 6, ay - 6, 12, 12)
    ctx.strokeRect(ax - 6, ay - 6, 12, 12)
  }

  // CURSORS. `priya` has a JOB: she drags the sliding ticket — pinned to its
  // corner with a light bob, so the move reads as her doing it. The others
  // drift on slow closed paths.
  cursor(ctx, sx + CW - 52, cardY - 10 + Math.sin(t * 0.9) * 3, FIGMA.red, 'priya')
  cursor(ctx, 470 + Math.sin(t * 0.19 + 2) * 90, 8 + Math.cos(t * 0.27 + 1) * 6, FIGMA.green, 'eng')
  cursor(ctx, 800 + Math.sin(t * 0.24 + 4) * 70, 470 + Math.cos(t * 0.17 + 3) * 30, FIGMA.blue, 'design')
}

// ── NEAR: one floating translucent UI pane, mirrored to both edges ──────────
function drawPane(ctx: CanvasRenderingContext2D): void {
  const W = 512
  const H = 672
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  rounded(ctx, 24, 24, W - 48, H - 48, 26)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,82,204,0.25)'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = JIRA
  rounded(ctx, 24, 24, W - 48, 58, 26)
  ctx.fill()
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = 'rgba(38,132,255,0.16)'
    rounded(ctx, 52, 118 + k * 100, W - 104, 72, 12)
    ctx.fill()
    ctx.fillStyle = [JIRA, FIGMA.purple, FIGMA.green, FIGMA.red, FIGMA.blue][k]
    ctx.fillRect(52, 118 + k * 100, 6, 72)
    ctx.fillStyle = '#9db8d8'
    ctx.fillRect(74, 140 + k * 100, 200 - k * 18, 8)
  }
}

function useGridLines(): THREE.BufferGeometry {
  return useMemo(() => {
    const pts: number[] = []
    const xMax = ARENA.halfWidth + 3.5
    for (let x = -xMax; x <= xMax + 0.01; x += 0.9) pts.push(x, 0, 1.6, x, 0, -8)
    for (let z = 1.6; z >= -8; z -= 0.9) pts.push(-xMax, 0, z, xMax, 0, z)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
}

export function ProductStage() {
  const far = useBackdropTexture(1024, 512, drawFar)
  const board = useBackdropTexture(1024, 573, drawBoard)
  const pane = useBackdropTexture(512, 672, drawPane)
  const grid = useGridLines()
  return (
    <group>
      {/* bright floor with a WEAK sheen — material richness without becoming
          the Grid's mirror; a matte-only stage reads flat even in daylight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -3.2]} receiveShadow>
        <planeGeometry args={[ARENA.halfWidth * 2 + 8, 10]} />
        <MeshReflectorMaterial
          resolution={256}
          mixBlur={1}
          mixStrength={0.5}
          blur={[240, 80]}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#dfe9f6"
          roughness={0.85}
          metalness={0}
          mirror={0.15}
        />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0.002, 0]}>
        <lineBasicMaterial color="#2684ff" transparent opacity={0.42} />
      </lineSegments>

      {/* ── PARALLAX LAYERS ─────────────────────────────────────────────── */}
      <mesh position={[0, FAR.cy, FAR.z]}>
        <planeGeometry args={[FAR.w, FAR.h]} />
        <meshBasicMaterial map={far} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, BOARD.cy, BOARD.z]}>
        <planeGeometry args={[BOARD.w, BOARD.h]} />
        <meshBasicMaterial map={board} transparent toneMapped={false} />
      </mesh>
      <FloatingPosters items={BOARD_POSTERS} />

      {/* floating panes at the EDGES only — the centre stays clean */}
      <mesh position={[-PANE.x, PANE.cy, PANE.z]} rotation={[0, 0.22, 0]}>
        <planeGeometry args={[PANE.w, PANE.h]} />
        <meshBasicMaterial map={pane} transparent toneMapped={false} />
      </mesh>
      <mesh position={[PANE.x, PANE.cy, PANE.z]} rotation={[0, -0.22, 0]}>
        <planeGeometry args={[PANE.w, PANE.h]} />
        <meshBasicMaterial map={pane} transparent toneMapped={false} />
      </mesh>

      {/* ── LIGHTING: bright studio, but the fighters still need modelling.
          Strong warm key, cool sky fill for the shadow side, soft back-rim to
          keep pale clothing off the pale wall. */}
      <directionalLight position={[3.5, 5, 4]} intensity={1.5} color="#fff4e2" />
      <directionalLight position={[-4, 3, 2]} intensity={0.5} color="#cfe0ff" />
      <directionalLight position={[0, 3.5, -5]} intensity={0.9} color="#9ec4f0" />
      <ambientLight intensity={0.42} color="#eaf2ff" />
      <hemisphereLight args={['#ffffff', '#9fb6d4', 0.45]} />
    </group>
  )
}
