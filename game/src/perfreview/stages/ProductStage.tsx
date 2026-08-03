// Bout 2 — Priya S. / Product: "Inside the File".
//
// The fight happens ON a Figma canvas. Not a room with design-tool posters —
// the arena IS the document: artboards floating on canvas gray, a selection
// outline with corner handles, the layers panel and design panel as slabs at
// the edges, multiplayer cursors, and a toolbar quietly autosaving v47 while
// two people fight inside it.
//
// This is the BRIGHT bout (dark Grid → bright studio → golden hour), and it
// uses the same three-plane parallax as the other stages: canvas + toolbar far,
// artboards mid, UI panels near.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import { useBackdropTexture, drawAlignlyMark, prand } from './stageKit'
import { FloatingPosters, type PosterPlacement } from './OfficeProps'
import { BODY } from '../fightConfig'
import { leonard, opponent, renderX } from '../fighterState'

// The canvas is 2048×1024 but every draw function below works in a 1024×512
// coordinate space, re-centred by originShift(). Doubling the RESOLUTION while
// the plane's world size stays fixed halves how big everything appears on
// screen — which is what turned "two enormous buttons" into a readable file.
// Measured: at 1024 a 132px panel filled ~21% of the screen; at 2048 it's ~10%.
const W = 2048
const H = 1024
/** Shift the origin so legacy 1024×512 coordinates land centred on the bigger
 *  canvas. Call at the top of every draw fn, after clear/fill. */
function originShift(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, W / 2 - 512, H / 2 - 256)
}

// Figma's actual palette — the specificity is the joke. But NOT Figma's neutral
// #f0f2f5 for the canvas itself: a perfectly neutral grey reads institutional,
// and combined with perfectly even light it made the stage feel scanned rather
// than photographed. The canvas is now warm-graded (see drawFar) and the floor
// picks up the warm end of it.
const CANVAS_WARM = '#fdf6ef'
const SELECT = '#0d99ff'
const INK = '#1e1e1e'
const MUTED = '#8c8c8c'
const FIGMA = { red: '#f24e1e', purple: '#a259ff', green: '#0acf83', blue: '#1abcfe', orange: '#ff7262' }

// cy LOWERED from 6.2/4.6/3.3: at those heights the whole file sat above the
// camera's gaze and got cropped by the top of frame, leaving two-thirds empty
// canvas. The artboards now sit just above the fighters' heads (~2.9m) where
// they're actually in shot.
// The far plane is no longer a backdrop a few metres behind the fight — it is
// the SKY, 46m out, with real geometry (the artboard ranges) standing between
// it and the camera. That distance is the whole trick behind why the Tahoe
// screensavers feel enormous: nothing is close to the far edge of the world.
const LAYERS = {
  // h/cy MEASURED by projecting the plane's corners through the live camera:
  // the old 17m plane put its top at screen y 1.20 — a fifth of the texture,
  // including the entire colour ramp, rendered off the top of the frame.
  far: { z: -46, w: 76, h: 13.8, cy: 5.9 },
  near: { z: -5.2, w: 24, h: 9.5, cy: 2.4 },
} as const

// Framed band of each canvas — the planes are far wider than the camera sees.
// MEASURED from a render, not guessed: a 150px artboard spanned ~24% of the
// screen, so the camera frames ~625 canvas px of these planes, centred on 512.
// Everything must live inside that, and be small enough to read as a FILE
// rather than two giant buttons.

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
  ctx.lineTo(x + 10, y + 18)
  ctx.lineTo(x + 3, y + 15)
  ctx.lineTo(x, y + 24)
  ctx.closePath()
  ctx.fill()
  rounded(ctx, x + 12, y + 16, 50, 17, 8)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 11px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, x + 37, y + 28)
}

// ── FAR: the canvas itself + the file toolbar ───────────────────────────────
// The sky gets its own canvas: wide and short, because the plane only spans
// world y −1..16 (the measured band above the horizon at this camera pitch).
// Sized to the 2048×1024 stage canvas, three quarters of it rendered off-screen.
// ── THE LIGHT ──────────────────────────────────────────────────────────────
// ONE source of truth. The sky's glow, the notch cut in the ridge line and the
// specular path on the floor are all derived from this — when they were three
// independent numbers they drifted apart and the "reflection" pointed somewhere
// the light wasn't.
// Placed at screen azimuth +0.142 / height 0.44: the measured clear window
// between the hero artboard and the Done board. Every other part of this frame
// has UI, an artboard or the HUD in it.
const SUN_X = 7.23
const SUN_Z = -46
const SUN_DIST = 4.8 - SUN_Z // 50.8 — camera sits at z 4.8
const SUN_ANG = SUN_X / SUN_DIST

const SKY_W = 2048
const SKY_H = 512

function drawFar(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const W2 = SKY_W
  const H2 = SKY_H
  // MEASURED: with the HUD covering the top of the frame and the floor the
  // bottom, the only part of this texture the player ever sees is v 0.34–0.85.
  // The entire value ramp is authored into that band — the previous version put
  // its deep zenith colour at v 0, which nobody could see, which is why the sky
  // read as a flat white wash no matter how much colour went into it.
  const HZ = H2 * 0.851
  const SUN_V = 0.63

  // ── THE VALUE LADDER ───────────────────────────────────────────────────
  // Deepest at the zenith, warming and brightening all the way down to a hot
  // horizon. A bright scene needs this ramp or every surface sits on the same
  // tonal step and the whole thing reads as a scan.
  const grade = ctx.createLinearGradient(0, 0, 0, H2)
  grade.addColorStop(0, '#b9c0ea')
  grade.addColorStop(0.34, '#ccd0ee') // ← top of the visible band
  grade.addColorStop(0.55, '#e4d8ef')
  grade.addColorStop(0.72, '#f9ded7')
  grade.addColorStop(0.851, '#fff0d8') // ← the horizon
  grade.addColorStop(1, '#efe6ee')
  ctx.fillStyle = grade
  ctx.fillRect(0, 0, W2, H2)

  // ── STRATA ─────────────────────────────────────────────────────────────
  // Wide, flat, slow. Squashing the blobs horizontally is what turns "soft
  // background" into "sky" — a flattened form implies a ground plane you are
  // looking across, which is the whole illusion.
  const strata = (cx: number, cy: number, rx: number, ry: number, rgb: string, a: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
    ctx.restore()
  }
  strata(W2 * 0.28 + Math.sin(t * 0.045) * 120, H2 * 0.38, 940, 74, '158,146,240', 0.34)
  strata(W2 * 0.74 + Math.cos(t * 0.038) * 100, H2 * 0.47, 860, 58, '255,172,198', 0.4)
  strata(W2 * 0.44 + Math.sin(t * 0.03 + 2) * 80, H2 * 0.58, 1080, 50, '255,198,158', 0.46)
  strata(W2 * 0.14 + Math.cos(t * 0.05 + 1) * 90, H2 * 0.72, 820, 38, '255,216,186', 0.5)
  strata(W2 * 0.86 + Math.sin(t * 0.041 + 4) * 70, H2 * 0.78, 760, 32, '226,192,252', 0.44)

  // ── THE LIGHT, low and off to one side ─────────────────────────────────
  // Same asymmetry that makes the Exec's sunset work: a dead-centre light source
  // reads as a scan, an off-centre one reads as a time of day.
  // MEASURED placement. The frame is crowded — the UI panels, the artboards and
  // the HUD between them leave exactly one clear window of sky, the gap between
  // the left artboard and the hero board, at screen azimuth ≈ −0.21 and height
  // ≈ 0.45. The sun goes there, and the ridge line is notched to let it through
  // (see SUN_ANG in Ranges). Anywhere else and it is simply behind something.
  const sunX = W2 * (0.5 + SUN_X / 76) // 76 = the sky plane's world width
  const sunY = H2 * SUN_V
  // A hot, small core with a wide falloff. On the old near-white sky a white sun
  // was invisible — a light source can only read against a sky that is darker
  // than it, which is what the new mid-value ramp above is for.
  const sun = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 560)
  sun.addColorStop(0, 'rgba(255,255,253,1)')
  sun.addColorStop(0.035, 'rgba(255,253,244,1)')
  sun.addColorStop(0.07, 'rgba(255,244,214,0.86)')
  sun.addColorStop(0.2, 'rgba(255,228,186,0.52)')
  sun.addColorStop(0.55, 'rgba(255,214,176,0.22)')
  sun.addColorStop(1, 'rgba(255,214,176,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, W2, H2)

  // ── LIGHT SHAFTS ───────────────────────────────────────────────────────
  // Fanning upward from the light, very low contrast. Time-based only — no
  // per-frame randomness anywhere on this stage (the photosensitivity rule).
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 11; i++) {
    const a = -2.75 + i * 0.235 + Math.sin(t * 0.05 + i) * 0.014
    ctx.save()
    ctx.translate(sunX, sunY)
    ctx.rotate(a)
    // wide and weak. Narrow, strong shafts read as a sunburst LOGO; haze is
    // broad and barely there.
    const g = ctx.createLinearGradient(0, 0, 1400, 0)
    g.addColorStop(0, 'rgba(255,246,228,0.085)')
    g.addColorStop(0.45, 'rgba(255,246,228,0.05)')
    g.addColorStop(1, 'rgba(255,246,228,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(1400, -150)
    ctx.lineTo(1400, 150)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // ── THE HORIZON GLOW ───────────────────────────────────────────────────
  // The furthest thing on screen is also the brightest, so everything standing
  // in front of it becomes a silhouette. That is the whole trick.
  const hz = ctx.createLinearGradient(0, HZ - 120, 0, H2)
  hz.addColorStop(0, 'rgba(255,248,236,0)')
  hz.addColorStop(0.66, 'rgba(255,250,240,0.6)')
  hz.addColorStop(1, 'rgba(255,247,238,0.92)')
  ctx.fillStyle = hz
  ctx.fillRect(0, HZ - 120, W2, H2 - HZ + 120)

  // Figma's dot grid, fading out toward the horizon — it keeps the promise that
  // this is still a canvas and not an outdoors.
  for (let y = H2 * 0.3; y < HZ; y += 30) {
    const fade = 0.24 * (1 - (y / HZ - 0.3) / 0.55) ** 0.7
    ctx.fillStyle = `rgba(140,128,158,${fade.toFixed(3)})`
    for (let x = 0; x < W2; x += 30) ctx.fillRect(x, y, 2.4, 2.4)
  }

  // corner vignette so the frame has edges
  const vig = ctx.createRadialGradient(W2 / 2, H2 * 0.6, W2 * 0.22, W2 / 2, H2 * 0.6, W2 * 0.62)
  vig.addColorStop(0, 'rgba(112,98,124,0)')
  vig.addColorStop(1, 'rgba(112,98,124,0.22)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W2, H2)
}

// A Figma comment pin: the lopsided teardrop, an initial, and sometimes an
// open thread. These are the human fingerprints on the file — the thing that
// makes a design tool feel inhabited rather than rendered.
function pin(ctx: CanvasRenderingContext2D, px: number, py: number, color: string, initial: string): void {
  ctx.save()
  ctx.shadowColor = 'rgba(60,40,80,0.30)'
  ctx.shadowBlur = 7
  ctx.shadowOffsetY = 2
  ctx.fillStyle = color
  ctx.beginPath()
  // round on three corners, pointed at the bottom-left — Figma's pin silhouette
  ctx.moveTo(px - 11, py + 11)
  ctx.arc(px, py, 11, Math.PI * 0.75, Math.PI * 2.75)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 11px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initial, px, py + 1)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
}

// An open comment thread hanging off a pin — frosted like the panels.
function thread(ctx: CanvasRenderingContext2D, px: number, py: number, who: string, body: string, color: string): void {
  const bw = 148
  const bh = 52
  ctx.save()
  ctx.shadowColor = 'rgba(60,40,80,0.22)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 4
  const g = ctx.createLinearGradient(0, py, 0, py + bh)
  g.addColorStop(0, 'rgba(255,255,255,0.88)')
  g.addColorStop(1, 'rgba(255,255,255,0.72)')
  ctx.fillStyle = g
  rounded(ctx, px, py, bw, bh, 9)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 1
  rounded(ctx, px + 0.5, py + 0.5, bw - 1, bh - 1, 9)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(px + 15, py + 15, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = INK
  ctx.font = '600 9px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(who, px + 28, py + 18)
  ctx.fillStyle = 'rgba(60,52,72,0.78)'
  ctx.font = '9px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(body, px + 11, py + 36)
}

// ── NEAR: the layers + design panels, as FROSTED GLASS ─────────────────────
// Opaque white panels read as stickers pasted on the shot. Translucent ones let
// the warm grade and the colour washes bleed through, so the UI sits IN the
// light instead of on top of it — and every panel now picks up the stage's
// colour for free.
function drawNear(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, H)
  originShift(ctx)
  // The near plane is 24m wide but the camera frames ~640 canvas px of it
  // (x 192–832), so panels must sit inside that and be small enough to read as
  // UI chrome rather than billboards.
  const panel = (px: number, title: string, rows: [string, string][]) => {
    const py = 220 // measured: at 205 the panel top projected to screen y 0.765, inside the HUD
    const pw = 132
    const ph = 208
    ctx.save()
    ctx.shadowColor = 'rgba(70,48,92,0.22)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 6
    // The frost itself: a milky scrim, denser at the top where the glass would
    // catch the key light, thinner at the bottom.
    const g = ctx.createLinearGradient(0, py, 0, py + ph)
    g.addColorStop(0, 'rgba(255,255,255,0.74)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.60)')
    g.addColorStop(1, 'rgba(252,248,255,0.52)')
    ctx.fillStyle = g
    rounded(ctx, px, py, pw, ph, 9)
    ctx.fill()
    ctx.restore()
    // A bright 1px rim on the top and left — the specular edge that says GLASS.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1
    rounded(ctx, px + 0.5, py + 0.5, pw - 1, ph - 1, 9)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(120,100,145,0.16)'
    rounded(ctx, px - 0.5, py - 0.5, pw + 1, ph + 1, 10)
    ctx.stroke()
    // A soft sheen sweeping across the glass — very slow, very low contrast.
    const sx = px + ((Math.sin(t * 0.11) * 0.5 + 0.5) * pw)
    const sheen = ctx.createLinearGradient(sx - 44, py, sx + 44, py + ph)
    sheen.addColorStop(0, 'rgba(255,255,255,0)')
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.22)')
    sheen.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    rounded(ctx, px, py, pw, ph, 9)
    ctx.clip()
    ctx.fillStyle = sheen
    ctx.fillRect(px, py, pw, ph)
    ctx.restore()

    ctx.fillStyle = INK
    ctx.font = '600 10px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(title, px + 10, py + 18)
    ctx.strokeStyle = 'rgba(120,100,145,0.20)'
    ctx.beginPath()
    ctx.moveTo(px + 8, py + 24)
    ctx.lineTo(px + pw - 8, py + 24)
    ctx.stroke()
    rows.forEach(([label, tint], i) => {
      const ry = py + 40 + i * 20
      if (i === 2) {
        ctx.fillStyle = 'rgba(13,153,255,0.20)'
        rounded(ctx, px + 4, ry - 10, 124, 19, 4)
        ctx.fill()
      }
      ctx.fillStyle = tint
      ctx.fillRect(px + 10, ry - 5, 7, 7)
      ctx.fillStyle = i === 2 ? SELECT : 'rgba(58,50,70,0.82)'
      ctx.font = '9px "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(label, px + 22, ry + 2)
    })
  }
  // left = layers, right = design properties. Both outside the fight band.
  panel(47, 'Layers', [
    ['Page 1', '#b9c2cf'],
    ['⌗ Checkout', '#b9c2cf'],
    ['# Fight / Round 1', SELECT], // the blue selection, the floor's section
    // label and the red-lined measurement now all name the same object
    ['⌗ Confirmation', '#b9c2cf'],
    ['◇ Button/Primary', FIGMA.purple],
    ['◇ Card', FIGMA.purple],
    ['T Heading', '#b9c2cf'],
    ['▢ Container', '#b9c2cf'],
  ])
  panel(845, 'Design', [
    ['W 1600   H 1420', '#b9c2cf'],
    ['Fill  gradient · mesh', FIGMA.purple],
    ['X 0   Y 0', '#b9c2cf'],
    ['Corner  8', '#b9c2cf'],
    ['Opacity  100%', '#b9c2cf'],
    ['Effects  drop shadow', FIGMA.purple],
    ['Export  2x PNG', '#b9c2cf'],
    ['Constraints  L · T', '#b9c2cf'],
  ])

  // ── Comment pins: the file is being reviewed WHILE you fight in it ────────
  // Kept high and wide of the fight band so they never sit behind a fighter.
  pin(ctx, 330, 222 + Math.sin(t * 0.31) * 3, FIGMA.red, 'P')
  pin(ctx, 700, 248 + Math.sin(t * 0.24 + 1.7) * 3, FIGMA.green, 'B')
  pin(ctx, 566, 216 + Math.sin(t * 0.19 + 3.1) * 3, FIGMA.purple, 'D')
  // One thread left open — the satire lands better read than shouted.
  thread(ctx, 300, 240, 'Priya S.', 'can we make this pop more?', FIGMA.red)

  // ── The floating toolbar, where Figma actually puts it: bottom centre ────
  // It used to live on the far plane. That plane is now the sky 46m out, where
  // a UI bar would have been rendered the size of a building.
  {
    const bw = 340
    const bx = 512 - bw / 2
    const by = 719 // measured: just below the fighters' feet line on this plane
    ctx.save()
    ctx.shadowColor = 'rgba(70,48,92,0.28)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 6
    const g = ctx.createLinearGradient(0, by, 0, by + 44)
    g.addColorStop(0, 'rgba(255,255,255,0.82)')
    g.addColorStop(1, 'rgba(252,248,255,0.68)')
    ctx.fillStyle = g
    rounded(ctx, bx, by, bw, 44, 12)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1
    rounded(ctx, bx + 0.5, by + 0.5, bw - 1, 43, 12)
    ctx.stroke()
    drawAlignlyMark(ctx, bx + 13, by + 11, 22, { wordmark: false })
    ctx.fillStyle = INK
    ctx.font = '600 13px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Portal Refresh', bx + 44, by + 27)
    ctx.fillStyle = MUTED
    ctx.font = '11px "Helvetica Neue", Arial, sans-serif'
    // A slow three-state autosave — the only motion down here.
    const save = ['Autosaving…', 'All changes saved', 'Autosaving…'][Math.floor(t / 3) % 3]
    ctx.fillText(`v47 · ${save}`, bx + 132, by + 27)
    // "Ready for dev" lives HERE now, not painted on the floor: toolbar status
    // chip, where Figma actually puts it, and where glyphs cannot distort.
    ctx.fillStyle = 'rgba(10,207,131,0.18)'
    rounded(ctx, bx + 214, by + 12, 108, 20, 10)
    ctx.fill()
    ctx.fillStyle = '#0acf83'
    ctx.beginPath()
    ctx.arc(bx + 226, by + 22, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(20,120,80,0.85)'
    ctx.font = '600 11px "Helvetica Neue", Arial, sans-serif'
    ctx.fillText('Ready for dev', bx + 234, by + 26)
    // DEV MODE IS ON — which is WHY there is a red dimension line on the floor.
    ctx.strokeStyle = '#0d99ff'
    ctx.lineWidth = 1
    rounded(ctx, bx + bw - 92, by + 13, 18, 18, 4)
    ctx.stroke()
    ctx.fillStyle = '#0d99ff'
    ctx.font = '600 9px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('</>', bx + bw - 83, by + 25)
    ctx.textAlign = 'left'
    const AV: [string, string][] = [
      [FIGMA.red, 'P'],
      [FIGMA.green, 'E'],
      [FIGMA.blue, 'D'],
    ]
    AV.forEach(([col, ch], i) => {
      const ax = bx + bw - 22 - i * 22
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(ax, by + 22, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 10px "Helvetica Neue", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(ch, ax, by + 26)
    })
    ctx.textAlign = 'left'
  }

  // Multiplayer cursors, drifting slowly on their own loops.
  cursor(ctx, 370 + Math.sin(t * 0.29) * 40, 402 + Math.cos(t * 0.22) * 16, FIGMA.red, 'priya')
  cursor(ctx, 520 + Math.sin(t * 0.19 + 2) * 46, 118 + Math.cos(t * 0.26 + 1) * 12, FIGMA.green, 'eng')
  cursor(ctx, 640 + Math.sin(t * 0.24 + 4) * 34, 392 + Math.cos(t * 0.17 + 3) * 18, FIGMA.blue, 'design')

  // A pen-tool bézier someone left mid-draw.
  ctx.strokeStyle = FIGMA.purple
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(360, 432)
  ctx.bezierCurveTo(420, 410, 520, 458, 640, 424)
  ctx.stroke()
  for (const [ax, ay] of [
    [360, 432],
    [640, 424],
  ]) {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = FIGMA.purple
    ctx.lineWidth = 2
    ctx.fillRect(ax - 4, ay - 4, 8, 8)
    ctx.strokeRect(ax - 4, ay - 4, 8, 8)
  }
}

// ── ARTBOARDS AS REAL 3D SLABS ─────────────────────────────────────────────
// Painted on a flat plane they were a PICTURE of a file. As actual meshes at
// slightly different depths and yaws they catch the warm key light, throw real
// shadow quads, and parallax against each other as the camera tracks — which is
// what makes the stage read as a space rather than a backdrop.
const AB_W = 512
const AB_H = 680

function drawBoardCheckout(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, AB_W, AB_H)
  ctx.fillStyle = '#f2eef8'
  ctx.fillRect(44, 52, AB_W - 88, 78)
  ctx.fillStyle = '#e7e1f0'
  ctx.fillRect(44, 168, AB_W - 88, 34)
  ctx.fillRect(44, 222, AB_W - 200, 34)
  ctx.fillStyle = '#ddd5ea'
  ctx.fillRect(44, 292, AB_W - 88, 150)
  ctx.fillStyle = SELECT
  rounded(ctx, 44, AB_H - 140, AB_W - 88, 84, 16)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 40px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Pay now', AB_W / 2, AB_H - 86)
}

function drawBoardHero(ctx: CanvasRenderingContext2D): void {
  const base = ctx.createLinearGradient(0, 0, AB_W, AB_H)
  base.addColorStop(0, '#ff7262')
  base.addColorStop(0.42, '#a259ff')
  base.addColorStop(1, '#1abcfe')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, AB_W, AB_H)
  const bloom = (bx: number, by: number, r: number, rgb: string, a: number) => {
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r)
    g.addColorStop(0, `rgba(${rgb},${a})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(bx - r, by - r, r * 2, r * 2)
  }
  bloom(AB_W * 0.25, AB_H * 0.2, AB_W * 0.85, '255,196,90', 0.8)
  bloom(AB_W * 0.85, AB_H * 0.36, AB_W * 0.7, '10,207,131', 0.55)
  bloom(AB_W * 0.45, AB_H * 0.9, AB_W * 0.9, '242,78,30', 0.5)
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = '600 62px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Brand', AB_W / 2, AB_H / 2 + 6)
  ctx.font = '26px "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.fillText('do not ship without review', AB_W / 2, AB_H / 2 + 54)
}

function drawBoardDone(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, AB_W, AB_H)
  ctx.fillStyle = '#f2eef8'
  ctx.fillRect(44, 52, AB_W - 88, 60)
  ctx.fillStyle = '#0acf83'
  ctx.beginPath()
  ctx.arc(AB_W / 2, 250, 66, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(AB_W / 2 - 28, 250)
  ctx.lineTo(AB_W / 2 - 6, 274)
  ctx.lineTo(AB_W / 2 + 32, 226)
  ctx.stroke()
  ctx.fillStyle = '#e7e1f0'
  ctx.fillRect(88, 360, AB_W - 176, 26)
  ctx.fillRect(140, 402, AB_W - 280, 26)
  ctx.fillStyle = FIGMA.green
  rounded(ctx, 44, AB_H - 140, AB_W - 88, 84, 16)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 40px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Done', AB_W / 2, AB_H - 86)
}

function boardTex(draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = AB_W
  c.height = AB_H
  const ctx = c.getContext('2d')
  if (ctx) draw(ctx)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// [x, y, z, yaw, worldWidth]. Heights MEASURED against the live camera so the
// tops project just under the HUD rather than behind it.
const BOARDS: [number, number, number, number, number][] = [
  [-3.4, 1.9, -7.7, 0.16, 1.45],
  [0, 1.95, -8.3, 0, 1.7], // the hero, bigger and further back
  [3.4, 1.9, -7.5, -0.18, 1.45],
]

function Artboards() {
  const texes = useMemo(() => [boardTex(drawBoardCheckout), boardTex(drawBoardHero), boardTex(drawBoardDone)], [])
  return (
    <>
      {BOARDS.map(([x, y, z, yaw, w], i) => {
        const h = w * (AB_H / AB_W)
        return (
          <group key={i} position={[x, y, z]} rotation={[0, yaw, 0]}>
            {/* soft cast shadow — a dark quad offset behind and below, cheaper
                and far more controllable than a real shadow map off a thin plane */}
            <mesh position={[0.07, -0.09, -0.02]}>
              <planeGeometry args={[w * 1.03, h * 1.03]} />
              <meshBasicMaterial color="#6b5a78" transparent opacity={0.16} depthWrite={false} />
            </mesh>
            {/* the selection outline lives on the HERO board */}
            {i === 1 && (
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[w + 0.05, h + 0.05]} />
                <meshBasicMaterial color={SELECT} toneMapped={false} />
              </mesh>
            )}
            <mesh>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial map={texes[i]} toneMapped={false} />
            </mesh>
            {i === 1 &&
              ([
                [-w / 2, h / 2],
                [w / 2, h / 2],
                [-w / 2, -h / 2],
                [w / 2, -h / 2],
              ] as const).map(([hx, hy]) => (
                <mesh key={`${hx}:${hy}`} position={[hx, hy, 0.01]}>
                  <planeGeometry args={[0.07, 0.07]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
              ))}
          </group>
        )
      })}
    </>
  )
}

// ── THE RANGES: the file, receding into haze ───────────────────────────────
// Borrowed wholesale from JiraRun's Tahoe biome, which gets its scale from real
// geometry at real distance rather than a painted ridge: masses at -14, -22 and
// -34, each range taller than the last, each one hazed further by the scene fog.
// Aerial perspective does the work for free — the far range is nearly the fog
// colour, so the eye reads depth without a single painted gradient.
//
// Every board is a plain slab sharing one of three textures and tinted per
// instance, so the whole landscape costs three canvases and no per-frame work.
function drawRangeBoard(ctx: CanvasRenderingContext2D, w: number, h: number, kind: number): void {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(150,136,168,0.16)'
  if (kind === 0) {
    ctx.fillRect(w * 0.1, h * 0.08, w * 0.8, h * 0.2)
    for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.1, h * (0.36 + i * 0.1), w * (0.8 - (i % 2) * 0.3), h * 0.05)
  } else if (kind === 1) {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 2; c++) ctx.fillRect(w * (0.1 + c * 0.45), h * (0.1 + r * 0.29), w * 0.35, h * 0.22)
  } else {
    ctx.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.44)
    ctx.fillStyle = 'rgba(162,89,255,0.14)'
    ctx.fillRect(w * 0.12, h * 0.62, w * 0.5, h * 0.1)
    ctx.fillStyle = 'rgba(13,153,255,0.16)'
    ctx.fillRect(w * 0.12, h * 0.78, w * 0.34, h * 0.1)
  }
}

function rangeTex(kind: number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 340
  const ctx = c.getContext('2d')
  if (ctx) drawRangeBoard(ctx, 256, 340, kind)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// [z, height, x-spread, count, tint] — taller and wider the further out you go,
// which is what makes each range read as a bigger landform rather than the same
// landform further away.
// Tints step DOWN in value toward the camera. White boards against a white sky
// were literally invisible; a landscape only reads if each range is a distinct
// tonal step, and the fog then lightens the far ones back toward the sky.
const RANGES: { z: number; h: number; spread: number; n: number; tint: string }[] = [
  { z: -13, h: 3.2, spread: 11, n: 7, tint: '#c3b3d6' },
  { z: -21, h: 5.0, spread: 17, n: 9, tint: '#d4c7e2' },
  { z: -32, h: 7.4, spread: 24, n: 11, tint: '#e3d8ec' },
]

// Range boards whose screen azimuth lands near the sun's get cut down — a notch
// in the ridge for the light to come through. Every landscape painter does this;
// without it the ridge is an even wall and the light source is simply behind it.
const NOTCH = 0.085

function Ranges() {
  const texes = useMemo(() => [rangeTex(0), rangeTex(1), rangeTex(2)], [])
  const slabs = useMemo(() => {
    const out: { x: number; y: number; z: number; w: number; h: number; rot: number; tint: string; k: number }[] = []
    RANGES.forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        // prand keeps the layout deterministic — no per-frame randomness anywhere
        // on this stage (photosensitivity rule), and no reshuffle on remount.
        const j = prand(ri * 31 + i)
        const k = prand(ri * 71 + i * 7)
        // staggered, not evenly spaced: a regular row reads as a fence, a
        // staggered one reads as terrain
        const x = (i / (r.n - 1) - 0.5) * 2 * r.spread + (j - 0.5) * r.spread * 0.18
        const zz = r.z + (k - 0.5) * 3.4
        const d = 4.8 - zz
        const hRaw = r.h * (0.62 + k * 0.62)
        const w = hRaw * 0.75
        // THE NOTCH. A percentage cut was not enough — a board 15% shorter still
        // stood in front of the sun. What matters is the height at which this
        // board's top crosses the sun's screen height, which depends on its
        // depth, so cap it there. Derived from the same camera maths as
        // everything else on this stage:
        //   screen y = (worldY − (1.4 − d·tan θ)) / (d·tan(fov/2))
        // solved for the world height that lands just under the sun.
        const capAt = 1.4 + 0.0414 * d
        // the board's angular SPAN, not its centre — a wide board occludes from
        // well outside its own azimuth
        const a0 = (x - w / 2) / d
        const a1 = (x + w / 2) / d
        const overlap = Math.min(a1, SUN_ANG + NOTCH) - Math.max(a0, SUN_ANG - NOTCH)
        // smooth, so the notch reads as terrain rather than a rectangular hole
        const blend = Math.max(0, Math.min(1, overlap / (NOTCH * 0.9)))
        const h = hRaw * (1 - blend) + Math.min(hRaw, capAt) * blend
        out.push({
          x,
          y: h / 2,
          z: zz, // depth jitter so the range has thickness
          w,
          h,
          rot: (j - 0.5) * 0.5,
          tint: r.tint,
          k: Math.floor(prand(ri * 13 + i * 3) * 3),
        })
      }
    })
    // A lone monolith — every epic landscape has the one spire that breaks the
    // ridge line and gives the eye somewhere to land.
    out.push({ x: -14.5, y: 5.6, z: -24, w: 3.4, h: 11.2, rot: 0.2, tint: '#d6c9e4', k: 2 })
    out.push({ x: 19, y: 4.6, z: -29, w: 2.9, h: 9.2, rot: -0.16, tint: '#e2d7ec', k: 0 })
    return out
  }, [])
  return (
    <>
      {slabs.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} rotation={[0, b.rot, 0]}>
          <planeGeometry args={[b.w, b.h]} />
          {/* fog ON (the default) — this IS the aerial perspective */}
          {/* toneMapped off: AgX was lifting these near-whites until the
              whole ridge line washed out into the sky behind it */}
          <meshBasicMaterial map={texes[b.k]} color={b.tint} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

// The canvas running out to a horizon. The near floor plane stops at z −12;
// this carries it to −72, where the fog has fully taken it. A world that ends
// at a painted backdrop feels like a set — one that dissolves feels endless.
function FarCanvas() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const ctx = c.getContext('2d')
    if (ctx) {
      // v = 0 is the far edge (z −72), v = 1 the near edge (z −12)
      const g = ctx.createLinearGradient(0, 0, 0, 512)
      g.addColorStop(0, '#efe6ee') // already the fog colour at the horizon
      g.addColorStop(0.55, '#f4ecf3')
      // #f3ecf3: a half-step LIGHTER than the near floor's far edge, which is
      // now #efe6ee. The two planes were authored at the same tone and fused
      // into one pale field exactly where the ranges stand, so the horizon had
      // no read at all. drawFloor's seam killer fades to this same value — move
      // one without the other and the seam reopens.
      g.addColorStop(1, '#f5eeea')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 512, 512)

      // REFLECTIONS of the ranges standing in this band — soft vertical smears,
      // no detail. A mirror would be wrong; what sells water (and a glossy
      // canvas) is a blurred value echo directly below each mass.
      for (let i = 0; i < 16; i++) {
        const u = prand(i * 5 + 2)
        const x = 512 * (0.16 + u * 0.68)
        const w = 10 + prand(i * 9) * 26
        const h = 40 + prand(i * 3 + 1) * 120
        const gg = ctx.createLinearGradient(0, 200, 0, 200 + h)
        gg.addColorStop(0, 'rgba(178,160,196,0.20)')
        gg.addColorStop(1, 'rgba(178,160,196,0)')
        ctx.fillStyle = gg
        ctx.fillRect(x - w / 2, 200, w, h)
      }

      // CONTACT SMEARS under the nearest range, so the slabs sit ON something
      // instead of floating. Positions derived from the SAME expression Ranges
      // uses — including its depth jitter — or the smears drift off their slabs.
      for (let i = 0; i < 7; i++) {
        const j = prand(i)
        const k = prand(i * 7)
        const x = (i / 6 - 0.5) * 22 + (j - 0.5) * 11 * 0.18
        const zz = -13 + (k - 0.5) * 3.4
        const cx = 512 * (0.5 + x / 190)
        const row = (512 * (zz + 72)) / 60
        const gs = ctx.createLinearGradient(0, row, 0, row + 18)
        gs.addColorStop(0, 'rgba(150,132,172,0.20)')
        gs.addColorStop(1, 'rgba(150,132,172,0)')
        ctx.fillStyle = gs
        ctx.fillRect(cx - 13, row, 26, 18)
      }

      // the far end of the light path, converging toward the horizon
      for (let i = 0; i <= 40; i++) {
        const v = 0.42 + (i / 40) * 0.58
        const z = -72 + v * 60
        const t = (4.8 - z) / SUN_DIST
        const x = SUN_X * t
        const cx = 512 * (0.5 + x / 190)
        const rx = 14 + (v - 0.42) * 120
        const a = 0.30 * (1 - (v - 0.42) / 0.58) + 0.06
        ctx.save()
        ctx.translate(cx, 512 * v)
        ctx.scale(1, 0.22)
        const gp = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
        gp.addColorStop(0, `rgba(255,250,238,${a.toFixed(3)})`)
        gp.addColorStop(1, 'rgba(255,250,238,0)')
        ctx.fillStyle = gp
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
        ctx.restore()
      }
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, -42]}>
      <planeGeometry args={[190, 60]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  )
}

// ── FLOOR: the canvas seen in perspective ──────────────────────────────────
// Warm grade + a pool of light where the fight happens + Figma's dot grid,
// baked into one texture. The pool is placed FORWARD of centre (v ≈ 0.62)
// because the camera sees the near half of this plane, so a centred pool would
// glow behind the horizon where nobody looks.
// 2048, not 1024. MEASURED: at 1024 one texel is 6.3 screen pixels where the
// fighters stand and 9+ nearer the camera, so anything finer than a blob turned
// to mush exactly where the eye is. At 2048 it is 3.2px there — fine enough to
// paint real detail on.
// ── THE FLOOR ───────────────────────────────────────────────────────────────
// FLOOR RULES (Bout 2). Violate any of these and the fighters stop reading.
//  1. NOTHING HORIZONTAL between v 0.44 and v 0.845. The fight band gets
//     columns only. Vertical marks run parallel to a body and cannot cut a
//     silhouette; a horizontal rule at shin height can.
//  2. The plane's total value spread stays under ~7 L*, and every part of it
//     darker than the artboard is BELOW the feet line (screen y −0.486 wide,
//     −0.633 tight). Colour is carried by hue rotation, not by value. This is
//     the whole readability strategy, and it is why the bout can stay bright.
//  3. drawFloor is BAKED ONCE. It takes no `t` and must never go back through
//     useBackdropTexture. Anything that needs to move gets its own mesh.
//  4. No mark on this plane may switch on or off. A twinkling field is a
//     strobe by another name.
//  5. This plane gets ZERO engine fog — fogNear is 18 and its far edge is only
//     16.8m from the camera. All aerial perspective here is painted.
//  6. Texel sizing, d = 4.8 − z:  px per COLUMN = 7.55/d · px per ROW = 23.6/d²
//     SQ (rows per column that renders SQUARE on screen) = 0.320 · d.
//     Screen-space UI marks (labels, pills) get ctx.scale(1, SQ).
//     Physical objects lying on the plane (chips, shadows) do NOT — the camera
//     foreshortens those correctly on its own.
//  7. The SKY plane keeps its dot grid (it is the CANVAS, seen face-on). The
//     FLOOR has a layout grid (it is an ARTBOARD). Do not "unify" them.
//
// 4096×1024, not 2048². Same bytes, but the plane is 25m across and only ±1.9m
// of it is framed at the near edge, so horizontal was the real bottleneck. This
// puts one texel at 1.9×1.2 screen px where the fighters stand.
const FW_TEX = 4096
// 2048 rows, not 1024. The apron carries TEXT, and at 1024 the plane had only
// 72 rows per world metre — a legible section label came out 60 screen pixels
// tall because there was no way to author a smaller one. At 2048 it is 144
// rows/m and the label can be the quiet margin annotation it should be.
const FH_TEX = 2048

// The plane's geometry, in one place, because every uv placement below derives
// from it. MEASURED: the near edge must reach z +1.974, where the wide frame's
// bottom ray hits the ground — at +1.84 the bottom 2.8% of frame was scene
// background showing under the floor.
const FLOOR_W = 25
// Depth re-fit for the levelled camera (+0.1 offset): the wide frame-bottom ray
// now hits ground at z +2.29, not +1.97.
const FLOOR_D = 14.5
const FLOOR_CZ = -4.75
const FLOOR_FAR_Z = FLOOR_CZ - FLOOR_D / 2 // −12.0, where FarCanvas takes over
const COL_PER_M = FW_TEX / FLOOR_W // 163.84
const ROW_PER_M = FH_TEX / FLOOR_D // 72.11
/** texture v (0 = far edge, 1 = near edge) → world z */
const zAtV = (v: number): number => FLOOR_FAR_Z + v * FLOOR_D
/** world z → texture v */
const vAtZ = (z: number): number => (z - FLOOR_FAR_Z) / FLOOR_D
const PATH_WORLD_ASPECT = 0.0909 // the specular smear's depth ÷ width, in world
const colAtX = (x: number): number => FW_TEX / 2 + x * COL_PER_M
const rowAtZ = (z: number): number => FH_TEX * vAtZ(z)
// (sqAtZ, the floor-text pre-stretch helper, was retired with the rule above:
// no text on the floor texture, so nothing needs stretch compensation.)

function drawFloor(ctx: CanvasRenderingContext2D): void {
  // ── (1) THE VALUE RAMP, on v only ──────────────────────────────────────
  // A ground plane's value converges on the sky at the horizon and diverges to
  // its own local colour at your feet — that law runs along v. The old ramp was
  // a corner diagonal that put the SKY's own colour family at the near corner,
  // which is aerial perspective backwards. Total spread here is ~5 L*: value
  // barely moves, hue rotates cool-lilac → warm cream and does all the work.
  const grade = ctx.createLinearGradient(0, 0, 0, FH_TEX)
  grade.addColorStop(0, '#f3eae6') // the fog colour — folds the seam killer in
  grade.addColorStop(0.06, '#f5eeea')
  grade.addColorStop(0.3, '#f8f2ee')
  grade.addColorStop(0.55, '#fbf5ef')
  grade.addColorStop(0.8, '#fdf8f0')
  grade.addColorStop(0.895, CANVAS_WARM) // brightest, just behind the near edge
  grade.addColorStop(1, '#fcf6ee')
  ctx.fillStyle = grade
  ctx.fillRect(0, 0, FW_TEX, FH_TEX)

  // ── (2) SIDELIGHT, on u only ───────────────────────────────────────────
  // Directional, at constant value. The three radial washes this replaces read
  // as STAINS: a circular blob on a ground plane has no physical reading, and
  // at alpha 0.72 it was the loudest thing on the surface.
  const side = (x0: number, x1: number, rgb: string, a: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0)
    g.addColorStop(0, `rgba(${rgb},0)`)
    g.addColorStop(1, `rgba(${rgb},${a})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, FW_TEX, FH_TEX)
  }
  side(FW_TEX * 0.5, FW_TEX, '255,214,176', 0.2) // warm, sun side (SUN_X > 0)
  side(FW_TEX * 0.5, 0, '212,204,238', 0.15) // cool counter-glow, eased

  // ── (3) THE SPECULAR PATH ──────────────────────────────────────────────
  // Traced through SUN_X/SUN_DIST, so it points where the light actually is.
  // Deliberately BROAD AND DIM, never narrow and hot: this texture is baked,
  // but FightCamera tracks the fighters' midpoint over ±3.35m, which slides a
  // world-locked "reflection" by ~1 screen unit. That error is invisible on a
  // soft path and glaring on a crisp one.
  for (let i = 0; i <= 60; i++) {
    const v = i / 60
    const z = zAtV(v)
    const t = (4.8 - z) / SUN_DIST
    const cx = colAtX(SUN_X * t)
    const rx = FW_TEX * (0.045 + v * 0.16)
    const a = 0.34 * (1 - v) ** 0.8 + 0.05
    ctx.save()
    ctx.translate(cx, FH_TEX * v)
    // Expressed as a WORLD shape, not a texture number: a smear 0.091 as deep
    // as it is wide. Written as a raw scale it silently became wrong every time
    // the canvas was reshaped, twice already.
    ctx.scale(1, PATH_WORLD_ASPECT * (COL_PER_M / ROW_PER_M))
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(255,251,240,${a.toFixed(3)})`)
    g.addColorStop(1, 'rgba(255,251,240,0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
    ctx.restore()
  }

  // ── (4) THE ARTBOARDS' OWN SHADOWS ─────────────────────────────────────
  // Projected from FightWorld's real key at [4,8,6] — ground offset (−0.5,−0.75)
  // per metre of height — so the painted shadows and the rendered ones agree.
  // These are the only structure that can exist in the far band at all: 44% of
  // the texture rows buy 13% of the on-screen pixels up there, so anything with
  // a resolvable edge is wasted. Lilac, never grey: a shadow on a plane that
  // reflects sky is lit by skylight.
  const boardShadow = (nx: number, nz: number, fx: number, fz: number) => {
    ctx.save()
    ctx.filter = 'blur(12px)'
    const g = ctx.createLinearGradient(colAtX(nx), rowAtZ(nz), colAtX(fx), rowAtZ(fz))
    g.addColorStop(0, 'rgba(122,104,146,0.18)')
    g.addColorStop(1, 'rgba(122,104,146,0.05)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(colAtX(nx - 0.4), rowAtZ(nz))
    ctx.lineTo(colAtX(nx + 0.4), rowAtZ(nz))
    ctx.lineTo(colAtX(fx + 0.4), rowAtZ(fz))
    ctx.lineTo(colAtX(fx - 0.4), rowAtZ(fz))
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  boardShadow(-3.87, -8.4, -4.83, -9.85) // Checkout
  boardShadow(-0.41, -8.92, -1.54, -10.61) // Hero
  boardShadow(2.93, -8.2, 1.97, -9.65) // Done

  // ── (5) A WHISPER OF A POOL ────────────────────────────────────────────
  // Was rgba(255,255,255,0.6) at r 940 on a 2048 square — it covered nearly
  // every visible floor pixel, which is literally what "pale empty expanse"
  // was, and it put near-white directly behind Priya's light top. Now 0.09,
  // and centred BEHIND the fight line rather than on it.
  {
    const rx = FW_TEX * 0.24
    ctx.save()
    ctx.translate(FW_TEX / 2, rowAtZ(-1.6))
    ctx.scale(1, ROW_PER_M / COL_PER_M) // world-circular
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, 'rgba(255,252,246,0.09)')
    g.addColorStop(0.55, 'rgba(255,252,246,0.035)')
    g.addColorStop(1, 'rgba(255,252,246,0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
    ctx.restore()
  }

  // ── (6) THE LAYOUT GRID ────────────────────────────────────────────────
  // The answer to the actual complaint: the fight band is 41% of the plane's
  // on-screen height and carried nothing. 11 coral columns, pitch 1.3745m, one
  // centred on x = 0 so the family converges onto the hero artboard.
  // Drawn as constant-x fills — perspective narrows them on its own. Painting
  // the convergence into the texture would double-apply it.
  // The dot grid this replaces is gone: Figma's canvas has no dot grid (that is
  // FigJam), and at 0.55m pitch it stacked ~11 rows per screen pixel near the
  // horizon and self-cancelled into a grey wash.
  const COL_PITCH = 1.3745
  const COL_HALF = 0.527 * COL_PER_M
  const FEATHER = 8
  // Alpha ramps down v: far columns stack many bands per pixel and self-brighten,
  // near ones are enormous and flat. Peak 0.075 ≈ 3 L* over cream.
  // Peaks at 0.15, not the 0.075 the spec proposed. MEASURED by looking: at
  // 0.075 the columns were invisible. Everything on this plane is composited
  // under AgX tone mapping AND a 0.42 reflector mix of a bright pale sky, and
  // both compress the light end hardest — the alpha that survives is roughly
  // half what is authored.
  const colAlpha = (v: number): number => {
    if (v < 0.1) return (v / 0.1) * 0.06
    if (v < 0.3) return 0.06 + ((v - 0.1) / 0.2) * 0.05
    if (v < 0.5) return 0.11 + ((v - 0.3) / 0.2) * 0.04
    if (v < 0.8) return 0.15
    if (v < 0.884) return 0.15 * (1 - (v - 0.8) / 0.084)
    return 0
  }
  for (let i = -5; i <= 5; i++) {
    const cx = colAtX(i * COL_PITCH)
    const g = ctx.createLinearGradient(cx - COL_HALF, 0, cx + COL_HALF, 0)
    const f = FEATHER / (2 * COL_HALF)
    g.addColorStop(0, 'rgba(255,114,98,0)')
    g.addColorStop(f, 'rgba(255,114,98,1)')
    g.addColorStop(1 - f, 'rgba(255,114,98,1)')
    g.addColorStop(1, 'rgba(255,114,98,0)')
    for (let r = 0; r < FH_TEX; r += 8) {
      const a = colAlpha((r + 4) / FH_TEX)
      if (a <= 0.002) continue
      ctx.globalAlpha = a
      ctx.fillStyle = g
      ctx.fillRect(cx - COL_HALF, r, COL_HALF * 2, 8)
    }
  }
  ctx.globalAlpha = 1

  // ── (7) THE ARTBOARD'S NEAR EDGE ───────────────────────────────────────
  // A VALUE STEP, not a rule line. A hairline here sits under both fighters for
  // most of a round and reads as a false ground line. The whole ~7 L* drop is
  // below the feet at BOTH framings (feet −0.486 wide / −0.633 tight; this step
  // centres at −0.583 / −0.805).
  {
    // MEASURED at both framings: the crossfade starts 20px below the feet at
    // wide and 36px at tight, and never reads as a line at their ankles.
    const g = ctx.createLinearGradient(0, rowAtZ(0.25), 0, rowAtZ(0.52))
    g.addColorStop(0, 'rgba(230,223,228,0)')
    g.addColorStop(1, 'rgba(230,223,228,1)')
    ctx.fillStyle = g
    ctx.fillRect(0, rowAtZ(0.25), FW_TEX, rowAtZ(0.52) - rowAtZ(0.25))
    const g2 = ctx.createLinearGradient(0, rowAtZ(0.52), 0, FH_TEX)
    g2.addColorStop(0, '#e6dfe4')
    g2.addColorStop(1, '#e2dae1') // repoussoir; off-frame entirely at tight
    ctx.fillStyle = g2
    ctx.fillRect(0, rowAtZ(0.52), FW_TEX, FH_TEX - rowAtZ(0.52))
  }

  // ── (8) THE ARTBOARD'S SIDE EDGES ──────────────────────────────────────
  // Two more converging orthogonals entering from the frame edges, outboard of
  // everything. They give the plane the one thing an infinite pale expanse never
  // has: a visible edge, so you can tell how big it is. Held to 40% near the
  // horizon so they do not fight the painted fog up there.
  {
    const edgeAlpha = (v: number): number => (v < 0.35 ? 0.4 : 0.4 + ((v - 0.35) / 0.25) * 0.6)
    const paint = (fromCol: number, dir: number) => {
      const g = ctx.createLinearGradient(fromCol, 0, fromCol + dir * 20, 0)
      g.addColorStop(0, 'rgba(230,223,228,0)')
      g.addColorStop(1, 'rgba(230,223,228,1)')
      const outerX = dir < 0 ? 0 : fromCol + 20
      const outerW = dir < 0 ? fromCol - 20 : FW_TEX - fromCol - 20
      for (let r = 0; r < FH_TEX; r += 8) {
        ctx.globalAlpha = Math.min(1, edgeAlpha((r + 4) / FH_TEX))
        ctx.fillStyle = g
        ctx.fillRect(Math.min(fromCol, fromCol + dir * 20), r, 20, 8)
        ctx.fillStyle = '#e6dfe4'
        ctx.fillRect(outerX, r, outerW, 8)
      }
    }
    paint(colAtX(-8), -1)
    paint(colAtX(8), 1)
    ctx.globalAlpha = 1
  }

  // ── (9) THE MARGIN FURNITURE ───────────────────────────────────────────
  // RULE, learned the hard way (three rounds of "the words look stretched"):
  // NO TEXT ON THE FLOOR TEXTURE, EVER. The camera dollies 3.6–4.8m, so any
  // baked vertical pre-stretch is correct at exactly one distance and wrong at
  // every other — glyphs must keep their natural aspect, which means they can
  // only live on vertical surfaces (panels, the toolbar) or camera-facing
  // billboards (the red-line pill). If a floor mark needs a label, the label
  // goes somewhere upright. Only textless geometry below this line.
  {
    // Swatch chips — the only saturated colour in an all-pastel frame, and every
    // gram of it is below the feet. NO pre-stretch: these are physical objects
    // lying on the plane, so the camera should foreshorten them. Pulled in to
    // x 0.60–1.48 so they stay inside the tight frame's ±1.72.
    const CW = 0.2 * COL_PER_M
    const CH = 0.2 * ROW_PER_M
    const cz = rowAtZ(0.74) // forward of the label, still inside the tight frame
    ;['#ff7262', '#a259ff', '#1abcfe', '#0acf83'].forEach((col, i) => {
      const cx = colAtX(0.7 + i * 0.26) - CW / 2
      // Baked drop shadow, offset to AGREE with FightWorld's real key at [4,8,6]
      // (ground offset −0.5,−0.75 per metre of height) so the painted and the
      // rendered shadows point the same way.
      ctx.save()
      ctx.filter = 'blur(9px)'
      // offset in METRES (−0.04, −0.09), converted — a raw pixel offset stopped
      // matching the light the moment the canvas was reshaped
      ctx.fillStyle = 'rgba(88,66,110,0.2)'
      ctx.fillRect(cx - 0.04 * COL_PER_M, cz - CH / 2 - 0.09 * ROW_PER_M, CW, CH)
      ctx.restore()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 2, cz - CH / 2 - 1, CW + 4, CH + 2)
      ctx.globalAlpha = 0.92
      ctx.fillStyle = col
      ctx.fillRect(cx, cz - CH / 2, CW, CH)
      ctx.globalAlpha = 1
    })
  }

  // ── (10) SEAM + VIGNETTE ───────────────────────────────────────────────
  // This plane's far edge and FarCanvas's near edge meet at z −12, 7mm apart in
  // y. Both now land on #f3ecf3 or the join reopens as a hard line across frame.
  const seam = ctx.createLinearGradient(0, 0, 0, FH_TEX * 0.06)
  seam.addColorStop(0, '#f5eeea')
  seam.addColorStop(1, 'rgba(245,238,234,0)')
  ctx.fillStyle = seam
  ctx.fillRect(0, 0, FW_TEX, FH_TEX * 0.06)

  // Re-centred onto the apron: it now darkens the foreground corners
  // (repoussoir) instead of dimming the fight band.
  const vig = ctx.createRadialGradient(FW_TEX / 2, FH_TEX * 0.86, FW_TEX * 0.3, FW_TEX / 2, FH_TEX * 0.86, FW_TEX * 1.05)
  vig.addColorStop(0, 'rgba(120,102,146,0)')
  vig.addColorStop(1, 'rgba(120,102,146,0.09)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, FW_TEX, FH_TEX)
}

// ── CONTACT SHADOWS ────────────────────────────────────────────────────────
// FightWorld's key at [4,8,6] does cast, but its ground offset is (−0.5,−0.75)
// per metre of height — left and AWAY from the camera — so a standing fighter's
// own shadow falls behind them and is largely hidden by their own body. There
// was no visible anchor at the feet at all, and on a pale floor that reads as
// hovering. Built as a CIRCLE with no directional offset: this is ambient
// occlusion at the root of the real shadow, not a second contradictory one.
// The camera foreshortens it into an ellipse on its own.
function contactTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(96,80,116,0.26)')
    g.addColorStop(0.42, 'rgba(96,80,116,0.26)')
    g.addColorStop(1, 'rgba(96,80,116,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function ContactShadows() {
  const tex = useMemo(contactTex, [])
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (a.current) a.current.position.x = renderX(leonard)
    if (b.current) b.current.position.x = renderX(opponent)
  })
  return (
    <>
      {[a, b].map((r, i) => (
        <mesh key={i} ref={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <circleGeometry args={[0.34, 24]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

// ── THE LIVE RED-LINE ──────────────────────────────────────────────────────
// The spacing between two fighters is the most important number in a fighting
// game and no fighting game has ever put it on the floor. This one can, because
// that is literally what the stage is about: a Figma file in Dev Mode measures
// the gap between two objects, and here the two objects are the people.
//
// MESHES, not the baked canvas — the floor texture is baked once and could not
// track 60Hz bodies even if it were not.
//
// Sits at world z +0.70, in the grey margin OUTSIDE the artboard, which is
// exactly where Dev Mode puts dimension lines. MEASURED: that is 71px below the
// feet at wide framing and 128px at tight, and inside the tight frame's bottom
// (z 0.87) at both.
//
// PHOTOSENSITIVITY: nothing here fades, pulses or cycles. It is driven entirely
// by the player's own inputs — the same class of motion as the camera following
// them — and so cannot produce a rhythm the player did not create. The dashes
// are STATIC: animated marching ants are small, high-contrast, rapid motion,
// which is a strobe with better branding.
const RL_Z = 0.72
const RL_Y = 0.004

function pillTex(): { tex: THREE.CanvasTexture; draw: (mm: number) => void } {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 96
  const ctx = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const draw = (mm: number) => {
    if (!ctx) return
    // Natural aspect, no transform. The pill is an UPRIGHT billboard now — the
    // third "stretched words" report was this pill and the floor labels, and
    // the root cause is shared: glyphs painted on the ground plane get a baked
    // stretch that is only correct at one dolly distance. Text keeps its own
    // shape; only the surface it sits on changed.
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, 256, 96)
    ctx.fillStyle = '#f24e1e'
    rounded(ctx, 8, 8, 240, 80, 18)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 54px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(mm), 128, 50)
    ctx.textBaseline = 'alphabetic'
    tex.needsUpdate = true
  }
  draw(0)
  return { tex, draw }
}

function dashTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 64
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 4, 64)
    ctx.fillStyle = '#ffffff'
    for (let y = 0; y < 64; y += 10) ctx.fillRect(0, y, 4, 6)
  }
  const t = new THREE.CanvasTexture(c)
  return t
}

function RedLine() {
  const line = useRef<THREE.Mesh>(null)
  const capL = useRef<THREE.Mesh>(null)
  const capR = useRef<THREE.Mesh>(null)
  const extL = useRef<THREE.Mesh>(null)
  const extR = useRef<THREE.Mesh>(null)
  const pill = useRef<THREE.Mesh>(null)
  const { tex, draw } = useMemo(pillTex, [])
  const dash = useMemo(dashTex, [])
  const last = useRef(-1)
  useFrame(() => {
    const lx = renderX(leonard)
    const ox = renderX(opponent)
    const l = Math.min(lx, ox) + BODY.radius
    const r = Math.max(lx, ox) - BODY.radius
    // clamped so the T-caps cannot invert when they lock up at ARENA.minGap
    const gap = Math.max(0.3, r - l)
    const mid = (lx + ox) / 2
    if (line.current) {
      line.current.position.x = mid
      line.current.scale.x = gap
    }
    if (capL.current) capL.current.position.x = mid - gap / 2
    if (capR.current) capR.current.position.x = mid + gap / 2
    if (extL.current) extL.current.position.x = mid - gap / 2
    if (extR.current) extR.current.position.x = mid + gap / 2
    if (pill.current) pill.current.position.x = mid
    // Quantised to 5. A digit updating at 60Hz is unreadable, and repainting a
    // canvas every frame to say so is its own kind of flicker.
    const q = Math.round((gap * 100) / 5) * 5
    if (q !== last.current) {
      last.current = q
      draw(q)
    }
  })
  return (
    <group>
      <mesh ref={line} position={[0, RL_Y, RL_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 0.0132]} />
        <meshBasicMaterial color="#f24e1e" transparent opacity={0.62} depthWrite={false} toneMapped={false} />
      </mesh>
      {[capL, capR].map((r, i) => (
        <mesh key={i} ref={r} position={[0, RL_Y, RL_Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.0044, 0.132]} />
          <meshBasicMaterial color="#f24e1e" transparent opacity={0.62} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {[extL, extR].map((r, i) => (
        <mesh key={i} ref={r} position={[0, RL_Y, RL_Z / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.0044, RL_Z]} />
          <meshBasicMaterial
            color="#ff7262"
            alphaMap={dash}
            transparent
            opacity={0.24}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* upright, facing the camera — flat on the floor it foreshortens and the
          digits stretch; standing up they keep their authored aspect */}
      <mesh ref={pill} position={[0, 0.075, RL_Z]}>
        <planeGeometry args={[0.2, 0.075]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

const BOARD_POSTERS: readonly PosterPlacement[] = [
  { variant: 'alignment', pos: [-6.6, 1.5, -6.0], rotY: 0.5, scale: 1.3, period: 12 },
  { variant: 'synergy', pos: [6.8, 1.6, -6.4], rotY: -0.46, scale: 1.35, period: 10, phase: 2 },
]

export function ProductStage() {
  const { gl } = useThree()
  const far = useBackdropTexture(SKY_W, SKY_H, drawFar)
  const near = useBackdropTexture(W, H, drawNear)
  // BAKED ONCE. drawFloor takes no `t` — it was going through useBackdropTexture,
  // which repainted a byte-identical canvas at BACKDROP_FPS (8/s): six full-canvas
  // gradient fills, a 61-step loop and ~1000 fillRects, then a full texture upload
  // and mipmap regen, eight times a second, forever, to produce the same image.
  // Anisotropy is the other half of the win: at the far edge one texel is 0.54px
  // across and 0.10px down — a 5:1 minification ratio, and at anisotropy 1 three.js
  // mips for the WORSE axis, so a real share of the pale far half was mip blur.
  const floor = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = FW_TEX
    c.height = FH_TEX
    const ctx = c.getContext('2d')
    if (ctx) drawFloor(ctx)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = gl.capabilities.getMaxAnisotropy()
    return t
  }, [gl])
  return (
    <group>
      {/* The floor IS the canvas — and it's ~60% of the frame, so it has to
          carry the grade too. A flat fill here is what kept the stage feeling
          clinical even after the backdrop was warmed: the biggest surface on
          screen was doing none of the lighting. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, FLOOR_CZ]} receiveShadow>
        <planeGeometry args={[FLOOR_W, FLOOR_D]} />
        {/* A faint gloss on the canvas — the Tahoe move is WATER, and a still
            reflective plane is what makes a landscape feel like somewhere rather
            than something. Deliberately weak and heavily blurred: the boards and
            sky above are pale, so reflecting them adds nothing, but the FIGHTERS
            are dark, and their soft echo is what finally gives the lower 60% of
            this frame some value contrast to sit on. */}
        <MeshReflectorMaterial
          map={floor}
          resolution={256}
          mixBlur={1}
          mixStrength={0.42}
          blur={[200, 70]}
          depthScale={0.7}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.3}
          color="#ffffff"
          roughness={0.86}
          metalness={0.06}
          mirror={0.3}
        />
      </mesh>
      {/* sky at 46m, the ranges in between, UI chrome at 5m — parallax is real */}
      <mesh position={[0, LAYERS.far.cy, LAYERS.far.z]}>
        <planeGeometry args={[LAYERS.far.w, LAYERS.far.h]} />
        <meshBasicMaterial map={far} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, LAYERS.near.cy, LAYERS.near.z]}>
        <planeGeometry args={[LAYERS.near.w, LAYERS.near.h]} />
        <meshBasicMaterial map={near} transparent toneMapped={false} />
      </mesh>

      <FarCanvas />
      <Ranges />
      <Artboards />
      <ContactShadows />
      <RedLine />
      <FloatingPosters items={BOARD_POSTERS} />

      {/* ── LIGHTING: bright studio daylight, but the fighters still need
          modelling — a flat ambient-only set is what made this read grey. */}
      {/* Warm key vs lilac bounce — colour TEMPERATURE contrast is what stops a
          bright set reading as fluorescent. The rim from behind keeps Leonard's
          black clothing separated from a light background. */}
      {/* Warmed and lifted across the board. The temperature CONTRAST stays —
          warm key against a lilac bounce is what stops a bright set reading as
          fluorescent — but the bounce is no longer cold enough to grey the
          midtones, and the ambient/hemisphere now tint warm instead of lilac. */}
      <directionalLight position={[3.5, 5, 4]} intensity={2.05} color="#ffeccc" />
      <directionalLight position={[-4, 3, 2]} intensity={0.7} color="#e6dcff" />
      <directionalLight position={[0, 3.6, -5]} intensity={1.3} color="#ffd2b0" />
      <ambientLight intensity={0.58} color="#fff2e6" />
      <hemisphereLight args={['#fff4e4', '#c9b6c6', 0.72]} />
    </group>
  )
}
