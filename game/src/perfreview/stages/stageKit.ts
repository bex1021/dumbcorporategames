// Shared kit for the per-bout stage sets (see stages/*.tsx).
//
// Two hard rules every stage obeys, both enforced here:
//  1. PHOTOSENSITIVITY: all background motion is slow, time-based, and fully
//     frozen under the OS "Reduce Motion" setting. Nothing in a backdrop may
//     flash, strobe, or move per-frame-randomly. (The KO-strobe incident is why
//     this is a hard rule, not a preference.)
//  2. PERF: one low-rate CanvasTexture per stage is the only animated surface.
//     Repaints happen at BACKDROP_FPS, not render rate, and stop entirely when
//     reduced motion is on (a single initial paint still happens).
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { fight, leonard, opponent } from '../fighterState'

export const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

const BACKDROP_FPS = 8

/** A CanvasTexture repainted by `draw(ctx, t)` at backdrop rate (not render
 *  rate). Under reduced motion it paints exactly once, at t = 0. */
export function useBackdropTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, t: number) => void,
): CanvasTexture {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return c
  }, [width, height])
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    return t
  }, [canvas])
  const drawRef = useRef(draw)
  drawRef.current = draw
  const acc = useRef(1) // >= 1/fps so the first frame paints immediately
  const t0 = useRef(0)
  const painted = useRef(false)
  useFrame((_, delta) => {
    if (REDUCED_MOTION && painted.current) return
    // Backdrop animation freezes with the world during hitstop (see
    // useStageClock) — but only once it has painted at least once.
    if (fight.hitstop > 0 && painted.current) return
    acc.current += delta
    if (acc.current < 1 / BACKDROP_FPS) return
    t0.current += acc.current
    acc.current = 0
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawRef.current(ctx, REDUCED_MOTION ? 0 : t0.current)
    texture.needsUpdate = true
    painted.current = true
  })
  return texture
}

/** Deterministic pseudo-random in [0,1) — backdrops must look the same on
 *  every load and never call Math.random per frame. */
export function prand(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** STAGE CLOCK. Advances with real time, but STOPS during hitstop so ambient
 *  backdrop motion freezes with the fighters — the impact freeze only reads as
 *  total if the whole world holds, not just the bodies. Also honours reduced
 *  motion by never advancing at all. Every animated stage element should read
 *  time from here rather than from state.clock.elapsedTime. */
export function useStageClock(): { t: number } {
  const ref = useRef({ t: 0 })
  useFrame((_, delta) => {
    if (REDUCED_MOTION || fight.hitstop > 0) return
    ref.current.t += delta
  })
  return ref.current
}

// ── ALIGNLY BRAND ───────────────────────────────────────────────────────────
// The company mark, identical to the one used on the Jira pages, the loading
// screen and the Slack chrome: a rounded #0052cc square with a white "A",
// optionally followed by the wordmark. Drawn here so every stage brands itself
// the same way instead of each re-inventing it.
export const ALIGNLY_BLUE = '#0052cc'
export const ALIGNLY_INK = '#172b4d'

export function drawAlignlyMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opts: { wordmark?: boolean; ink?: string; alpha?: number } = {},
): void {
  const { wordmark = true, ink = ALIGNLY_INK, alpha = 1 } = opts
  const prev = ctx.globalAlpha
  ctx.globalAlpha = prev * alpha
  const r = size * 0.22
  ctx.fillStyle = ALIGNLY_BLUE
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + size, y, x + size, y + size, r)
  ctx.arcTo(x + size, y + size, x, y + size, r)
  ctx.arcTo(x, y + size, x, y, r)
  ctx.arcTo(x, y, x + size, y, r)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(size * 0.66)}px "Helvetica Neue", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A', x + size / 2, y + size * 0.54)
  if (wordmark) {
    ctx.fillStyle = ink
    ctx.textAlign = 'left'
    ctx.font = `bold ${Math.round(size * 0.62)}px "Helvetica Neue", Arial, sans-serif`
    ctx.fillText('Alignly', x + size * 1.28, y + size * 0.54)
  }
  ctx.textBaseline = 'alphabetic'
  ctx.globalAlpha = prev
}

// ── OFFICE POSTERS ──────────────────────────────────────────────────────────
// The motivational posters that haunt every open-plan floor. Deadpan on
// purpose — the joke is that they are sincere. Each carries the Alignly mark,
// so they double as the branding pass.
export type PosterVariant = 'synergy' | 'velocity' | 'ownership' | 'shipit' | 'alignment'

const POSTER_COPY: Record<PosterVariant, { word: string; sub: string; accent: string }> = {
  synergy: { word: 'SYNERGY', sub: 'The whole is load-bearing.', accent: '#0052cc' },
  velocity: { word: 'VELOCITY', sub: 'Move fast. Document later.', accent: '#f24e1e' },
  ownership: { word: 'OWNERSHIP', sub: "If it's nobody's job, it's yours.", accent: '#0acf83' },
  shipit: { word: 'SHIP IT', sub: 'Perfect is the enemy of deployed.', accent: '#a259ff' },
  alignment: { word: 'ALIGNMENT', sub: 'Everyone rowing. Nobody steering.', accent: '#2684ff' },
}

const PW = 384
const PH = 512

function drawPoster(ctx: CanvasRenderingContext2D, v: PosterVariant): void {
  const { word, sub, accent } = POSTER_COPY[v]
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PW, PH)
  ctx.strokeStyle = 'rgba(23,43,77,0.18)'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, PW - 6, PH - 6)

  // Abstract "inspirational photo" block — a horizon and a rising form.
  const img = ctx.createLinearGradient(0, 40, 0, 300)
  img.addColorStop(0, accent)
  img.addColorStop(1, '#ffffff')
  ctx.fillStyle = img
  ctx.fillRect(30, 40, PW - 60, 260)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.moveTo(30, 300)
  ctx.lineTo(150, 130)
  ctx.lineTo(250, 240)
  ctx.lineTo(330, 160)
  ctx.lineTo(PW - 30, 300)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = ALIGNLY_INK
  ctx.textAlign = 'center'
  ctx.font = 'bold 52px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(word, PW / 2, 372)
  ctx.fillStyle = '#5e6c84'
  ctx.font = '20px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(sub, PW / 2, 408)

  drawAlignlyMark(ctx, PW / 2 - 62, 440, 34, { wordmark: true })
}

/** One CanvasTexture per poster variant, built once and shared by every plane
 *  that uses it — four textures total, not one per poster. */
export function usePosterTextures(variants: readonly PosterVariant[]): CanvasTexture[] {
  return useMemo(
    () =>
      variants.map((v) => {
        const c = document.createElement('canvas')
        c.width = PW
        c.height = PH
        const ctx = c.getContext('2d')
        if (ctx) drawPoster(ctx, v)
        const t = new CanvasTexture(c)
        t.colorSpace = SRGBColorSpace
        return t
      }),
    [variants],
  )
}

// Below this health fraction the stage starts to "lean in".
const ESCALATE_FROM = 0.4

/** ESCALATION: 0 at full health, easing to 1 as EITHER fighter approaches
 *  defeat. Stages use it to lift their accents so the room itself tightens as
 *  a bout reaches match point.
 *
 *  Deliberately SLOW (damped over ~2s) and value-only — a health swing must
 *  never produce a visible step, let alone a flash. Fully off under reduced
 *  motion. */
export function useStageIntensity(): { v: number } {
  const ref = useRef({ v: 0 })
  useFrame((_, delta) => {
    if (REDUCED_MOTION) return
    const lo = Math.min(
      leonard.health / Math.max(1, leonard.maxHealth),
      opponent.health / Math.max(1, opponent.maxHealth),
    )
    const target = fight.over ? 0 : Math.min(1, Math.max(0, (ESCALATE_FROM - lo) / ESCALATE_FROM))
    ref.current.v += (target - ref.current.v) * (1 - Math.pow(0.5, delta / 2))
  })
  return ref.current
}
