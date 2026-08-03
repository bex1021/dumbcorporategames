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
import { useMemo } from 'react'
import * as THREE from 'three'
import { ARENA } from '../fightConfig'
import { MeshReflectorMaterial } from '@react-three/drei'
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

  // FARTHEST SHORE — the third recession step. Two city layers read as one
  // cardboard cutout without a barely-there band behind them: classic aerial
  // perspective needs near/mid/far, and far is nearly the sky's own value.
  ctx.globalAlpha = 0.32
  let fx = -10
  let fi = 0
  while (fx < W) {
    const fw = 26 + prand(fi * 6.1) * 40
    let fh = 8 + prand(fi * 2.3) * 22
    if (fx < sunX + 60 && fx + fw > sunX - 60) fh = Math.min(fh, 7)
    ctx.fillStyle = '#6e3a5e'
    ctx.fillRect(fx, hz - fh, fw, fh)
    fx += fw + 4 + prand(fi * 8.7) * 10
    fi++
  }
  ctx.globalAlpha = 1

  // Water: dusk mirror falling away below the horizon.
  const sea = ctx.createLinearGradient(0, hz, 0, H)
  sea.addColorStop(0, '#9a4a5e')
  sea.addColorStop(0.35, '#5c3050')
  sea.addColorStop(1, '#2c1a36')
  ctx.fillStyle = sea
  ctx.fillRect(0, hz, W, H - hz)

  // The glint path, directly under the sun. MEASURED (levelled camera): the
  // interior floor occludes the far plane below screen −0.26, so only canvas
  // rows hz..hz+~30 of water are EVER visible — the old path spread its 24
  // shimmer bars across 124 rows and 80% of them played to nobody. The path
  // now concentrates its heat in the visible strip (which is also physically
  // right: a sun path is hottest at the horizon) and only a dim tail continues
  // below for the slivers seen between towers. Slow deterministic breath
  // (reduced motion ⇒ t = 0, static). Bright enough to catch bloom.
  for (let i = 0; i < 30; i++) {
    const depth = i / 30
    // quadratic packing: half the bars land in the first 30 rows
    const y = hz + 2 + depth * depth * (H - hz - 8)
    const breathe = 1 + 0.14 * Math.sin(t * 0.6 + i * 1.3)
    const len = (18 + depth * 150) * breathe * (0.5 + prand(i * 2.9) * 0.8)
    const off = (prand(i * 5.7) - 0.5) * 46 * depth
    ctx.globalAlpha = 0.85 - depth * 0.55
    ctx.fillStyle = i % 3 === 0 ? '#fff1c8' : '#ffbe82'
    ctx.fillRect(sunX + off - len / 2, y, len, i < 12 ? 3 : 2)
  }
  // the hot core where the path meets the horizon — the postcard pixel
  const core = ctx.createRadialGradient(sunX, hz + 6, 2, sunX, hz + 6, 60)
  core.addColorStop(0, 'rgba(255,244,208,0.9)')
  core.addColorStop(1, 'rgba(255,244,208,0)')
  ctx.fillStyle = core
  ctx.globalAlpha = 1
  ctx.fillRect(sunX - 60, hz, 120, 40)
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

// ── THE SKYLINE: Hong Kong at dusk, from the 44th floor ────────────────────
// Rebecca's direction (v2): tall, varied, alive — dense skyscrapers with big
// neon company signs breathing on them, a little cyberpunk, over the harbour
// and the sun path. All motion is slow and time-based (the backdrop clock
// freezes under reduced-motion and hitstop); neon PULSES on 0.3–0.8Hz sines,
// never strobes, and every glow is local — the photosensitivity rules hold.
// TEXT ASPECT: these 1024×512 canvases stretch over planes whose world aspect
// differs — a canvas px covers ~27mm of world x but ~20mm of world y on the
// near plane, so naively-drawn glyphs render ~40% FAT. Same class of bug as
// the floor text on Priya's stage: never stretch words — pre-compress them by
// the plane's px aspect so they come out square on screen.
const NEAR_TEXT_X = (LAYERS.near.h / H) * (W / LAYERS.near.w) // ≈ 0.714

const FAKE_COS: { name: string; c: string }[] = [
  { name: 'SHIPMART', c: '#ffb03d' },
  { name: 'HYPERSCALE', c: '#4fd2ff' },
  { name: 'DELVE', c: '#c07dff' },
  { name: 'PROMPTLY', c: '#4fffa8' },
  { name: 'SLOPBOWLZ', c: '#ff6a5a' },
  { name: 'UNWIND', c: '#ffe066' },
]

/** A tower with real VOLUME: front face + a sun-side wall + a slanted roof
 *  plate — the 2.5D skyline trick. Every side face recedes the same direction
 *  (toward the sun at +x) so the whole wall shares one implied vanishing side;
 *  the sun-facing walls run warm, the fronts run cool, and the windows follow
 *  both faces at their own densities. Flat rectangles read as cardboard —
 *  Rebecca called it — and the second face is what makes a box a building. */
function tower(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
  seed: number,
): void {
  const kind = Math.floor(prand(seed * 1.7) * 3)
  const d = Math.max(5, Math.min(14, w * 0.22)) // side-face depth
  const rise = d * 0.55 // how much the roofline climbs as it recedes

  // ── SIDE FACE (sun side, +x): warm, catching the sunset ────────────────
  const side = ctx.createLinearGradient(x + w, baseY - h, x + w + d, baseY - h)
  side.addColorStop(0, '#5a3050')
  side.addColorStop(1, '#7a4055')
  ctx.fillStyle = side
  ctx.beginPath()
  ctx.moveTo(x + w, baseY - h)
  ctx.lineTo(x + w + d, baseY - h - rise)
  ctx.lineTo(x + w + d, baseY)
  ctx.lineTo(x + w, baseY)
  ctx.closePath()
  ctx.fill()
  // hot sunset rim along the side face's far edge
  ctx.fillStyle = 'rgba(255,160,95,0.55)'
  ctx.fillRect(x + w + d - 1.2, baseY - h - rise, 1.2, h + rise)

  // ── ROOF PLATE: slanted parallelogram, dark with a warm lip ────────────
  ctx.fillStyle = '#1c1030'
  ctx.beginPath()
  ctx.moveTo(x, baseY - h)
  ctx.lineTo(x + w, baseY - h)
  ctx.lineTo(x + w + d, baseY - h - rise)
  ctx.lineTo(x + d, baseY - h - rise)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,150,90,0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, baseY - h)
  ctx.lineTo(x + w, baseY - h)
  ctx.stroke()

  // ── FRONT FACE: cool dusk wall ─────────────────────────────────────────
  const bodyGrad = ctx.createLinearGradient(0, baseY - h, 0, baseY)
  bodyGrad.addColorStop(0, '#241638')
  bodyGrad.addColorStop(1, '#3c2148')
  ctx.fillStyle = bodyGrad
  ctx.fillRect(x, baseY - h, w, h)
  // corner shade where the two faces meet — rounds the volume
  const corner = ctx.createLinearGradient(x + w - 6, 0, x + w, 0)
  corner.addColorStop(0, 'rgba(10,5,18,0)')
  corner.addColorStop(1, 'rgba(10,5,18,0.5)')
  ctx.fillStyle = corner
  ctx.fillRect(x + w - 6, baseY - h, 6, h)
  // faint left-edge shade for the unseen third face
  ctx.fillStyle = 'rgba(10,5,18,0.35)'
  ctx.fillRect(x, baseY - h, 1.6, h)

  if (kind === 1) {
    // stepped crown — with its own mini side faces
    for (const [cx, cw, ch] of [
      [x + w * 0.2, w * 0.6, 9],
      [x + w * 0.35, w * 0.3, 15],
    ] as const) {
      const cd = d * 0.6
      ctx.fillStyle = '#6a3852'
      ctx.beginPath()
      ctx.moveTo(cx + cw, baseY - h - ch)
      ctx.lineTo(cx + cw + cd, baseY - h - ch - cd * 0.5)
      ctx.lineTo(cx + cw + cd, baseY - h)
      ctx.lineTo(cx + cw, baseY - h)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#2a1840'
      ctx.fillRect(cx, baseY - h - ch, cw, ch)
    }
  } else if (kind === 2) {
    ctx.strokeStyle = '#1a1028'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + w / 2, baseY - h)
    ctx.lineTo(x + w / 2, baseY - h - 16)
    ctx.stroke()
  }

  // ── WINDOWS: front face (cool mix) ─────────────────────────────────────
  const cols = Math.max(2, Math.floor(w / 6))
  const rows = Math.max(3, Math.floor(h / 7))
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const k = prand(seed * 91 + c * 13.7 + r * 3.1)
      if (k < 0.42) continue
      const wx = x + 2.5 + c * ((w - 5) / cols)
      const wy = baseY - h + 3 + r * ((h - 6) / rows)
      ctx.fillStyle = k > 0.9 ? '#cfe8ff' : k > 0.62 ? '#ffd07b' : '#8a6a9a'
      ctx.globalAlpha = 0.75
      ctx.fillRect(wx, wy, 2.6, 1.8)
    }
  }
  // windows on the SIDE face — narrower, warmer, sun-struck
  const sCols = Math.max(1, Math.floor(d / 5))
  for (let c = 0; c < sCols; c++) {
    for (let r = 0; r < rows; r++) {
      const k = prand(seed * 47 + c * 9.1 + r * 5.3)
      if (k < 0.5) continue
      const wx = x + w + 1.5 + c * ((d - 3) / sCols)
      const wy = baseY - h + 3 + r * ((h - 6) / rows) - rise * ((wx - (x + w)) / d) * 0.5
      ctx.fillStyle = k > 0.8 ? '#ffe9b8' : '#ffb87e'
      ctx.globalAlpha = 0.8
      ctx.fillRect(wx, wy, 1.8, 1.6)
    }
  }
  ctx.globalAlpha = 1
}

/** Neon signage, six DISTINCT styles — a Hong Kong wall is a collage, not a
 *  template: letter-tile stacks, raw script, boxed marquees, hollow outlines.
 *  All text pre-compressed by NEAR_TEXT_X so glyphs render square (the planes'
 *  canvas pixels are not world-square — unfixed, every word reads stretched).
 *  Glow pulses on slow per-sign phases; nothing strobes. */
function neonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  align: CanvasTextAlign = 'center',
  stroke = false,
): void {
  ctx.save()
  ctx.scale(NEAR_TEXT_X, 1)
  ctx.font = font
  ctx.textAlign = align
  if (stroke) ctx.strokeText(text, x / NEAR_TEXT_X, y)
  else ctx.fillText(text, x / NEAR_TEXT_X, y)
  ctx.restore()
}

function neonSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  co: { name: string; c: string },
  t: number,
  i: number,
  style: number,
): void {
  const pulse = 0.78 + 0.22 * Math.sin(t * (0.35 + (i % 3) * 0.17) + i * 1.9)

  // ── THE HARDWARE ────────────────────────────────────────────────────────
  // A sign is a physical object: backing board, cantilever brackets bolted to
  // the wall, a support strut. Without these the logos floated as free text —
  // Rebecca called it. Brackets reach LEFT toward the tower face the sign
  // hangs beside.
  const mount = (bx: number, by: number, bw2: number, bh2: number) => {
    ctx.save()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    // backing board, slightly larger than the lit area
    ctx.fillStyle = '#150c22'
    ctx.fillRect(bx - 2.5, by - 2.5, bw2 + 5, bh2 + 5)
    ctx.strokeStyle = '#080410'
    ctx.lineWidth = 1
    ctx.strokeRect(bx - 2.5, by - 2.5, bw2 + 5, bh2 + 5)
    // two bracket arms + a diagonal strut, anchored into the wall on the left
    ctx.strokeStyle = '#1f1430'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bx - 12, by + 3)
    ctx.lineTo(bx - 2.5, by + 3)
    ctx.moveTo(bx - 12, by + bh2 - 3)
    ctx.lineTo(bx - 2.5, by + bh2 - 3)
    ctx.moveTo(bx - 12, by + 3)
    ctx.lineTo(bx - 2.5, by + bh2 * 0.6)
    ctx.stroke()
    // bolts
    ctx.fillStyle = '#0a0614'
    ctx.fillRect(bx - 13.5, by + 1.5, 3, 3)
    ctx.fillRect(bx - 13.5, by + bh2 - 4.5, 3, 3)
    ctx.restore()
  }

  ctx.save()
  ctx.shadowColor = co.c
  ctx.shadowBlur = 11 * pulse
  ctx.globalAlpha = pulse
  ctx.fillStyle = co.c
  ctx.strokeStyle = co.c
  switch (style % 6) {
    case 0: {
      // vertical LETTER TILES with a slow light-WAVE cascading down
      const ch = co.name.length * 12
      mount(x, y, 11, ch)
      for (let k = 0; k < co.name.length; k++) {
        const ty = y + k * 12
        const wave = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.9 - k * 0.7 + i))
        ctx.globalAlpha = pulse * wave
        ctx.fillStyle = 'rgba(12,6,20,0.9)'
        ctx.fillRect(x, ty, 11, 11)
        ctx.strokeStyle = co.c
        ctx.lineWidth = 1
        ctx.strokeRect(x, ty, 11, 11)
        ctx.fillStyle = co.c
        neonText(ctx, co.name[k], x + 5.5, ty + 8.5, '700 8px "Helvetica Neue", Arial, sans-serif')
      }
      break
    }
    case 1: {
      // SCRIPT on a board, with a slow WRITE-ON sweep every ~7s
      const tw = co.name.length * 8.2 * NEAR_TEXT_X + 18
      mount(x - tw / 2, y - 13, tw, 19)
      const phase = (t * 0.14 + i * 0.3) % 1 // one sweep ≈ 7s
      const sweepX = x - tw / 2 + phase * tw * 1.3
      ctx.shadowBlur = 16 * pulse
      neonText(ctx, co.name.charAt(0) + co.name.slice(1).toLowerCase(), x, y, 'italic 700 15px Georgia, serif')
      // the sweep: a soft bright highlight passing along the tube
      const g = ctx.createLinearGradient(sweepX - 18, 0, sweepX + 6, 0)
      g.addColorStop(0, 'rgba(255,255,255,0)')
      g.addColorStop(0.7, 'rgba(255,255,255,0.5)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = g
      ctx.fillRect(x - tw / 2, y - 14, tw, 20)
      ctx.restore()
      break
    }
    case 2: {
      // boxed marquee ringed by CHASE LAMPS (gentle: 2 lamps/s, low contrast)
      const cw = co.name.length * 7.2 * NEAR_TEXT_X + 14
      mount(x, y, cw, 16)
      ctx.fillStyle = 'rgba(12,6,20,0.9)'
      ctx.fillRect(x, y, cw, 16)
      ctx.lineWidth = 1.2
      ctx.strokeRect(x, y, cw, 16)
      ctx.fillStyle = co.c
      neonText(ctx, co.name, x + cw / 2, y + 11.5, '700 10px "Helvetica Neue", Arial, sans-serif')
      const nTop = Math.max(4, Math.floor(cw / 9))
      const total = nTop * 2 + 4
      const lit = Math.floor(t * 2 + i) % total
      for (let k = 0; k < total; k++) {
        const on = (k - lit + total) % total < 3
        ctx.globalAlpha = pulse * (on ? 0.95 : 0.3)
        let lx: number
        let ly: number
        if (k < nTop) {
          lx = x + 3 + (k / (nTop - 1)) * (cw - 6)
          ly = y - 4
        } else if (k < nTop * 2) {
          lx = x + 3 + ((k - nTop) / (nTop - 1)) * (cw - 6)
          ly = y + 20
        } else {
          lx = k % 2 ? x - 4 : x + cw + 4
          ly = y + (k > nTop * 2 + 1 ? 12 : 4)
        }
        ctx.fillStyle = on ? '#fff3c8' : co.c
        ctx.fillRect(lx - 1.2, ly - 1.2, 2.4, 2.4)
      }
      break
    }
    case 3: {
      // slim vertical letters on a channel rail — with one DYING letter that
      // sags on a slow sine (the broken-sign gag; a fade, never a flicker)
      const ch = co.name.length * 10.5
      mount(x - 5, y - 8, 10, ch + 4)
      const dying = Math.floor(prand(i * 7.7) * co.name.length)
      for (let k = 0; k < co.name.length; k++) {
        const sag = k === dying ? 0.35 + 0.3 * Math.sin(t * 0.23 + i) : 1
        ctx.globalAlpha = pulse * Math.max(0.18, sag)
        neonText(ctx, co.name[k], x, y + k * 10.5, '700 9px "Helvetica Neue", Arial, sans-serif')
      }
      break
    }
    case 4: {
      // wide-tracked marquee between rules whose dashes SLIDE slowly
      const cw = co.name.length * 9.5 * NEAR_TEXT_X + 8
      mount(x, y - 4, cw, 20)
      ctx.save()
      ctx.lineWidth = 1.4
      ctx.setLineDash([5, 4])
      ctx.lineDashOffset = -t * 3 // ~3px/s — a crawl, not a strobe
      ctx.beginPath()
      ctx.moveTo(x, y - 1)
      ctx.lineTo(x + cw, y - 1)
      ctx.moveTo(x, y + 13)
      ctx.lineTo(x + cw, y + 13)
      ctx.stroke()
      ctx.restore()
      neonText(ctx, co.name.split('').join(' '), x + cw / 2, y + 8.5, '600 8px "Helvetica Neue", Arial, sans-serif')
      break
    }
    default: {
      // HOLLOW outline on a board, with a slow second ring swelling out of it
      const cw = co.name.length * 8 * NEAR_TEXT_X + 16
      mount(x - cw / 2, y - 11, cw, 16)
      ctx.lineWidth = 1.1
      neonText(ctx, co.name, x, y, '800 13px "Helvetica Neue", Arial, sans-serif', 'center', true)
      const ring = (t * 0.5 + i) % 1
      ctx.globalAlpha = pulse * (1 - ring) * 0.5
      ctx.save()
      ctx.translate(x, y - 4)
      ctx.scale(1 + ring * 0.35, 1 + ring * 0.35)
      ctx.translate(-x, -(y - 4))
      neonText(ctx, co.name, x, y, '800 13px "Helvetica Neue", Arial, sans-serif', 'center', true)
      ctx.restore()
      break
    }
  }
  ctx.restore()
}

// ── MID: the far shore — hazy, warm-tinted silhouettes, aerial perspective ──
function drawMid(ctx: CanvasRenderingContext2D, t: number): void {
  const hz = horizonRow(LAYERS.mid)
  const sunX = worldXToCanvas(LAYERS.mid, SUN_WORLD_X)
  ctx.clearRect(0, 0, W, H)
  // MID SKYLINE — a wall of hazier towers behind the near ones. Taller than
  // the near band's occlusion needs (they rise into the sky), violet-washed so
  // the near towers read closer. A few faint neon dots, no readable signs.
  let x = -18
  let i = 0
  while (x < W) {
    const bw = 22 + prand(i * 3.7) * 30
    let bh = 40 + prand(i * 1.9) * 110
    if (x < sunX + 46 && x + bw > sunX - 46) bh = Math.min(bh, 30) // sun keeps a window
    ctx.globalAlpha = 0.62
    const g = ctx.createLinearGradient(0, hz - bh, 0, hz)
    g.addColorStop(0, '#4a2b58')
    g.addColorStop(1, '#6a3d66')
    ctx.fillStyle = g
    // +75 rows of base: the mid occlusion line sits at canvas row ~452, and
    // towers ending AT the horizon floated on the far plane's water
    ctx.fillRect(x, hz - bh, bw, bh + 75)
    // cheap volume even at this distance: a warm side sliver + slanted rooflet
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#8a4a60'
    ctx.beginPath()
    ctx.moveTo(x + bw, hz - bh)
    ctx.lineTo(x + bw + 4, hz - bh - 2.4)
    ctx.lineTo(x + bw + 4, hz + 75)
    ctx.lineTo(x + bw, hz + 75)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#ffb87e'
    ctx.fillRect(x, hz - bh, bw, 1.2)
    // sparse lit windows
    ctx.globalAlpha = 0.4
    for (let k = 0; k < bw * bh * 0.004; k++) {
      const wx = x + 2 + prand(i * 51 + k * 7.3) * (bw - 4)
      const wy = hz - bh + 3 + prand(i * 97 + k * 3.1) * (bh - 6)
      ctx.fillStyle = '#ffd07b'
      ctx.fillRect(wx, wy, 1.6, 1.4)
    }
    // one faint neon smudge per few towers, breathing slowly
    if (prand(i * 8.9) > 0.7) {
      const co = FAKE_COS[i % FAKE_COS.length]
      const pulse = 0.35 + 0.2 * Math.sin(t * 0.4 + i)
      ctx.globalAlpha = pulse
      ctx.fillStyle = co.c
      ctx.fillRect(x + bw * 0.2, hz - bh + 8 + prand(i * 4.2) * (bh * 0.4), bw * 0.6, 3)
    }
    x += bw + 3 + prand(i * 9.1) * 8
    i++
  }
  ctx.globalAlpha = 1
}

// ── NEAR: the close towers — darkest, sharpest, the fight's backdrop.
//    SQUAT by design: the sunset band is the hero of this stage, so the near
//    skyline mostly stays below the glow, with a couple of tall towers only at
//    the frame edges, and the sun's column is kept completely clear. ────────
function drawNear(ctx: CanvasRenderingContext2D, t: number): void {
  const hz = horizonRow(LAYERS.near)
  const sunX = worldXToCanvas(LAYERS.near, SUN_WORLD_X)
  ctx.clearRect(0, 0, W, H)
  // THE NEAR SKYLINE — tall, varied, and lit. Bases sit just below the horizon
  // (the interior occludes deeper); the towers themselves own the sky. The sun
  // keeps a narrow window so the disc and its glint stay part of the shot.
  // bases at hz+78 (canvas row ~441): MEASURED, the interior floor occludes
  // this plane below row ~436, so tower feet must reach past it — at hz+30
  // the pink haze showed UNDER every base and the whole skyline floated.
  const baseY = hz + 78
  type T = { x: number; w: number; h: number; seed: number }
  const ts: T[] = []
  let x = -16
  let i = 0
  while (x < W + 40) {
    const bw = 34 + prand(i * 5.3) * 52
    let bh = 118 + prand(i * 2.3) * 190
    const nearSun = x < sunX + 42 && x + bw > sunX - 42
    if (nearSun) bh = Math.min(bh, 92)
    // frame-edge giants — the shot's bookends
    if ((x < 130 || x + bw > W - 130) && prand(i * 4.3) > 0.4) bh = 258 + prand(i * 2.7) * 90
    ts.push({ x, w: bw, h: bh, seed: i * 11.3 })
    x += bw + 6 + prand(i * 9.1) * 18
    i++
  }
  for (const b of ts) tower(ctx, b.x, baseY, b.w, b.h, b.seed)

  // ── THE NEON ──────────────────────────────────────────────────────────
  // Six signs, all breathing on their own slow phase: verticals hang off the
  // tall towers Hong-Kong style, horizontals band across the wide ones.
  const tall = [...ts].filter((b) => b.h > 168 && !(b.x < sunX + 60 && b.x + b.w > sunX - 60))
  tall.sort((a, b) => a.x - b.x)
  let sIdx = 0
  const step = Math.max(1, Math.floor(tall.length / FAKE_COS.length))
  for (let k = 0; k < tall.length && sIdx < FAKE_COS.length; k += step) {
    const b = tall[k]
    const co = FAKE_COS[sIdx]
    // style = the sign's index: six signs, six DIFFERENT treatments
    const vertical = sIdx % 6 === 0 || sIdx % 6 === 3
    // clamp into the window's visible band — a sign near a giant's crown
    // cropped off the frame top (DELVE lost half its letter tiles to the HUD)
    const signY = Math.max(48, baseY - b.h + (vertical ? 14 : 26) + prand(b.seed) * 22)
    neonSign(ctx, vertical ? b.x + b.w - 15 : b.x + 3, signY, co, t, sIdx, sIdx)
    sIdx++
  }
  // one big billboard screen mid-skyline: a slow colour wash, never a cut —
  // the "screen" cycles hue over ~20s, far below any flicker threshold.
  const bb = ts.find((b) => b.w > 60 && b.h > 100 && b.x > W * 0.55 && b.x < W * 0.85)
  if (bb) {
    const bx = bb.x + 6
    const by = baseY - bb.h + 46
    const hue = (t * 18) % 360
    ctx.save()
    ctx.globalAlpha = 0.8
    const g = ctx.createLinearGradient(bx, by, bx + bb.w - 12, by + 26)
    g.addColorStop(0, `hsl(${hue}, 80%, 55%)`)
    g.addColorStop(1, `hsl(${(hue + 60) % 360}, 80%, 45%)`)
    ctx.fillStyle = g
    ctx.fillRect(bx, by, bb.w - 12, 26)
    ctx.strokeStyle = 'rgba(10,5,16,0.9)'
    ctx.lineWidth = 2
    ctx.strokeRect(bx, by, bb.w - 12, 26)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '700 9px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ALIGNLY', bx + (bb.w - 12) / 2, by + 17)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  // rooftop beacons on the giants — SLOW fades, deliberately not blinks
  for (const b of ts) {
    if (b.h < 248) continue
    const glowA = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.5 + b.seed))
    ctx.globalAlpha = glowA
    ctx.fillStyle = '#ff5a5a'
    ctx.beginPath()
    ctx.arc(b.x + b.w / 2, baseY - b.h - (b.seed % 2 ? 16 : 4), 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // street-glow at the bases: the city's own light pooling up into the haze
  const glow = ctx.createLinearGradient(0, hz + 4, 0, baseY + 8)
  glow.addColorStop(0, 'rgba(255,140,90,0)')
  glow.addColorStop(1, 'rgba(255,120,150,0.35)')
  ctx.fillStyle = glow
  ctx.fillRect(0, hz + 4, W, baseY + 8 - (hz + 4))
}

// ── #1 THE FLOOR: sun streaks through the window bays ──────────────────────
// The floor is ~40% of the frame and was a featureless void. Two moves, both
// derived from the SAME light (SUN_WORLD_X): a real reflection (the sunset and
// the fighters mirrored in polished executive flooring), and the window bays
// projected across it as warm raking streaks. Rays from a sun this far out are
// near-parallel, so each bay's streak is its opening sheared by a constant
// azimuth factor — bright at the glass, dying ~4m into the room.
const BAY_EDGES = [-7.7, -5.4, -1.8, 1.8, 5.4, 7.7] // mullion x positions
const GLASS_Z = -2.42
const STREAK_DEPTH = 4.2 // metres of floor the light reaches
// horizontal shear per metre of travel INTO the room: sun right of every bay
// centre → streaks lean left, more so for bays further from the sun column
// 0.03, was 0.055: physically-larger shear pushed the left bays' streaks
// clean off the visible floor — the left half of the frame went back to void.
const shearFor = (bayCentreX: number) => (bayCentreX - SUN_WORLD_X) * 0.03

const FLOOR_W_TEX = 1024
const FLOOR_H_TEX = 512
const FLOOR_WORLD_W = ARENA.halfWidth * 2 + 8
const FLOOR_WORLD_D = 10 // plane spans z −8.2 .. +1.8 (centre −3.2)
function drawSunStreaks(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, FLOOR_W_TEX, FLOOR_H_TEX)
  const colAtX = (x: number) => ((x + FLOOR_WORLD_W / 2) / FLOOR_WORLD_W) * FLOOR_W_TEX
  const rowAtZ = (z: number) => ((z + 8.2) / FLOOR_WORLD_D) * FLOOR_H_TEX
  // blurred, or the trapezoid boundary reads as a CARPET EDGE, not light
  ctx.filter = 'blur(9px)'
  for (let b = 0; b < BAY_EDGES.length - 1; b++) {
    const x0 = BAY_EDGES[b] + 0.06
    const x1 = BAY_EDGES[b + 1] - 0.06
    const sh = shearFor((x0 + x1) / 2)
    const zNear = GLASS_Z
    const zFar = GLASS_Z + STREAK_DEPTH
    const g = ctx.createLinearGradient(0, rowAtZ(zNear), 0, rowAtZ(zFar))
    g.addColorStop(0, 'rgba(255,178,110,0.26)')
    g.addColorStop(0.45, 'rgba(255,150,96,0.13)')
    g.addColorStop(1, 'rgba(255,140,90,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(colAtX(x0), rowAtZ(zNear))
    ctx.lineTo(colAtX(x1), rowAtZ(zNear))
    ctx.lineTo(colAtX(x1 + sh * STREAK_DEPTH), rowAtZ(zFar))
    ctx.lineTo(colAtX(x0 + sh * STREAK_DEPTH), rowAtZ(zFar))
    ctx.closePath()
    ctx.fill()
  }
  ctx.filter = 'none'
}

// ── #4 GOD RAYS: the same bays, hanging in the air ─────────────────────────
// One tilted additive quad per bay, from the glass top down to where its floor
// streak dies — the visible link between the sunset outside and the light on
// the floor. Static by design: the sun does not move, and additive quads that
// pulse would be a photosensitivity problem; the existing slow water-breathe
// is the stage's only motion.
function rayTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    // ease IN from zero: a hard top boundary on an additive quad drew a bright
    // diagonal band across the SKY — the ray must be born soft
    g.addColorStop(0, 'rgba(255,196,130,0)')
    g.addColorStop(0.16, 'rgba(255,196,130,0.42)')
    g.addColorStop(0.6, 'rgba(255,170,110,0.18)')
    g.addColorStop(1, 'rgba(255,160,100,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 256)
    // soft edges so adjacent quads never band
    const e = ctx.createLinearGradient(0, 0, 64, 0)
    e.addColorStop(0, 'rgba(0,0,0,1)')
    e.addColorStop(0.18, 'rgba(0,0,0,0)')
    e.addColorStop(0.82, 'rgba(0,0,0,0)')
    e.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = e
    ctx.fillRect(0, 0, 64, 256)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function GodRays() {
  const tex = useMemo(rayTexture, [])
  const TOP_Y = 3.4 // below the top mullion — rays belong to the room, not the sky
  const quads = useMemo(() => {
    const out: { x: number; w: number; tilt: number; lean: number }[] = []
    for (let b = 1; b < BAY_EDGES.length - 2; b++) {
      // the two outer bays skip: their rays would live mostly off-frame
      const x0 = BAY_EDGES[b]
      const x1 = BAY_EDGES[b + 1]
      out.push({
        x: (x0 + x1) / 2,
        w: (x1 - x0) * 0.72,
        tilt: Math.atan(STREAK_DEPTH / TOP_Y), // glass top → streak end
        lean: shearFor((x0 + x1) / 2),
      })
    }
    return out
  }, [])
  const len = Math.hypot(TOP_Y, STREAK_DEPTH)
  return (
    <>
      {quads.map((q, i) => (
        <mesh
          key={i}
          position={[q.x + (q.lean * STREAK_DEPTH) / 2, TOP_Y / 2, GLASS_Z + STREAK_DEPTH / 2]}
          rotation={[q.tilt, 0, q.lean * 0.35]}
        >
          <planeGeometry args={[q.w, len]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.09}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  )
}

const CHAIR_X = [-1.35, -0.45, 0.45, 1.35]

export function BoardroomStage() {
  const far = useBackdropTexture(W, H, drawFar)
  const mid = useBackdropTexture(W, H, drawMid)
  const near = useBackdropTexture(W, H, drawNear)
  const plaque = useBackdropTexture(PLAQUE_W, PLAQUE_H, drawPlaque)
  // static bake — the sun doesn't move (same one-shot pattern as Priya's floor)
  const streaks = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = FLOOR_W_TEX
    c.height = FLOOR_H_TEX
    const ctx = c.getContext('2d')
    if (ctx) drawSunStreaks(ctx)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const wallW = ARENA.halfWidth * 2 + 8
  return (
    <group>
      {/* POLISHED executive floor — a real reflection. The floor is ~40% of
          this frame and was a featureless void; mirroring the sunset wall and
          the fighters is the single biggest read of "expensive room at golden
          hour". Kept dark and well-blurred so the fighters stay the brightest
          shapes; the same discipline as the other two stages' reflectors. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -3.2]} receiveShadow>
        <planeGeometry args={[wallW, 10]} />
        <MeshReflectorMaterial
          resolution={256}
          mixBlur={0.9}
          mixStrength={1.6}
          blur={[220, 80]}
          depthScale={0.8}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
          color="#221318"
          roughness={0.5}
          metalness={0.35}
          mirror={0.42}
        />
      </mesh>
      {/* the window bays, projected across that floor by the low sun */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -3.2]}>
        <planeGeometry args={[wallW, 10]} />
        <meshBasicMaterial
          map={streaks}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <GodRays />

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
        {/* ── the paperwork this whole fight is about ──────────────────────
            A contract at the Exec's end of the table, pen laid across it, and
            two closed laptops nobody is allowed to open until it's signed. The
            props are the satire: the room is dressed for a signing, and the
            negotiation is happening in the air above it. */}
        <group position={[0.95, 0.7625, 0.12]} rotation={[0, -0.14, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.24, 0.006, 0.32]} />
            <meshStandardMaterial color="#f3ede2" roughness={0.85} />
          </mesh>
          <mesh position={[0.03, 0.005, 0.02]} rotation={[0, 0.22, 0]}>
            <boxGeometry args={[0.22, 0.004, 0.3]} />
            <meshStandardMaterial color="#faf6ec" roughness={0.85} />
          </mesh>
          {/* the pen, laid diagonally across the signature line */}
          <mesh position={[0.02, 0.012, 0.05]} rotation={[0, 0.9, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.15, 8]} />
            <meshStandardMaterial color="#3a1010" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
        {[
          { x: -0.85, r: 0.35 },
          { x: 0.1, r: -0.2 },
        ].map(({ x, r }) => (
          <mesh key={x} position={[x, 0.7645, -0.14]} rotation={[0, r, 0]} castShadow>
            <boxGeometry args={[0.32, 0.014, 0.23]} />
            <meshStandardMaterial color="#2a2d33" roughness={0.35} metalness={0.5} />
          </mesh>
        ))}
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
      {/* the sunset itself, raking low from behind the glass on the sun side —
          the golden edge on both silhouettes. Lowered toward the sun's actual
          elevation and pushed hotter for the final-boss backlight. */}
      <directionalLight position={[4.2, 1.7, -7]} intensity={2.7} color="#ffb070" />
      <directionalLight position={[-5, 3, -4]} intensity={0.8} color="#8fa6d8" />
      <directionalLight position={[0.5, 3.4, 5.5]} intensity={1.15} color="#ffd2a8" />
      <ambientLight intensity={0.55} color="#c9a3b8" />
    </group>
  )
}
