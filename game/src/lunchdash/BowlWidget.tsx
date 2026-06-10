// The live salmon-bowl cam — a side-view canvas of the exec's bowl that reacts
// to your ACTUAL driving in real time. Contents ride a damped spring driven by
// lateral G (speed x yaw rate), braking/throttle, landings and crashes:
//
//   sane driving      -> everything sits still, lid on
//   hard corners      -> greens + salmon slide, lid rattles and tilts
//   integrity < 55    -> the lid FLIES OFF (one-way — you can't un-pop a lid)
//   open-air slosh    -> lettuce leaves launch out on every hard input
//   integrity <= 5    -> the salmon itself is ejected. It does not come back.
//
// Pure presentation: the SCORING stays in bowlState (sloshBowl); this widget
// mirrors the same forces so what you see matches what you're charged for.
// Runs its own rAF loop writing to a canvas — no React re-renders.

import { useEffect, useRef } from 'react'
import { carTelemetry, carFacing, carAir } from './carState'
import { crash } from './crashState'
import { bowl } from './bowlState'

const W = 144
const H = 92

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  life: number
  kind: 'leaf' | 'drop' | 'lid' | 'salmon'
}

export function BowlWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(2, 2) // retina

    // sim state (lives across frames, resets when a fresh bowl is picked up)
    let o = 0 // contents offset (px)
    let v = 0 // offset velocity
    let prevHead = carFacing.y
    let prevSp = carTelemetry.speed
    let prevAir = false
    let prevShake = 0
    let lidGone = false
    let salmonGone = false
    let wasCarrying = false
    let parts: Particle[] = []
    let last = performance.now()
    let raf = 0

    const spawnLeaves = (n: number, vigor: number) => {
      for (let i = 0; i < n; i++) {
        const dir = Math.sign(o) || (Math.random() < 0.5 ? -1 : 1)
        parts.push({
          x: 72 + o * 0.8 + (Math.random() - 0.5) * 26,
          y: 42 + (Math.random() - 0.5) * 6,
          vx: dir * (30 + Math.random() * 60) * vigor + v * 0.4,
          vy: -(120 + Math.random() * 120) * vigor,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 10,
          life: 1.4,
          kind: Math.random() < 0.22 ? 'drop' : 'leaf',
        })
      }
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (!bowl.carrying) {
        // fresh-run reset so the next pickup starts pristine
        if (wasCarrying) {
          o = 0
          v = 0
          lidGone = false
          salmonGone = false
          parts = []
        }
        wasCarrying = false
        prevHead = carFacing.y
        prevSp = carTelemetry.speed
        return // hidden by the parent chip anyway
      }
      if (!wasCarrying) {
        // pickup pop-in
        wasCarrying = true
        cv.style.transition = 'none'
        cv.style.transform = 'scale(0.2)'
        requestAnimationFrame(() => {
          cv.style.transition = 'transform 0.35s cubic-bezier(0.2, 1.6, 0.4, 1)'
          cv.style.transform = 'scale(1)'
        })
      }

      // --- forces from the actual drive ---
      const sp = carTelemetry.speed
      const yawRate = dt > 0 ? (carFacing.y - prevHead) / dt : 0
      const latG = sp * yawRate // signed, m/s²
      const longG = dt > 0 ? (sp - prevSp) / dt : 0
      prevHead = carFacing.y
      prevSp = carTelemetry.speed
      // landing thump
      if (prevAir && !carAir.airborne) v += (Math.random() < 0.5 ? -1 : 1) * 90
      prevAir = carAir.airborne
      // crash jolt
      if (crash.shake > prevShake + 0.04) v += (Math.random() < 0.5 ? -1 : 1) * crash.shake * 260
      prevShake = crash.shake

      // --- contents spring ---
      const drive = (latG + longG * 0.55) * 33
      v += (-70 * o - 7 * v + drive) * dt
      o += v * dt
      const LIM = 15
      if (Math.abs(o) > LIM) {
        o = Math.sign(o) * LIM
        if (Math.abs(v) > 55) {
          // contents slam the rim — open bowls shed lettuce
          if ((lidGone || bowl.integrity < 70) && parts.length < 40) spawnLeaves(lidGone ? 3 : 1, Math.min(Math.abs(v) / 160, 1.4))
          v *= -0.35
        } else {
          v *= 0.4
        }
      }

      // --- one-way events keyed to integrity ---
      if (!lidGone && bowl.integrity < 55) {
        lidGone = true
        parts.push({
          x: 72 + o * 0.4,
          y: 38,
          vx: (Math.sign(o) || 1) * 70 + v * 1.5,
          vy: -230,
          rot: 0,
          vr: 7,
          life: 2,
          kind: 'lid',
        })
        spawnLeaves(4, 1)
      }
      if (!salmonGone && lidGone && bowl.integrity <= 5) {
        salmonGone = true
        parts.push({
          x: 72 + o * 0.6,
          y: 46,
          vx: (Math.sign(v) || 1) * 100,
          vy: -260,
          rot: 0,
          vr: 5,
          life: 2.2,
          kind: 'salmon',
        })
        spawnLeaves(8, 1.4)
      }

      // --- particles ---
      for (const p of parts) {
        p.vy += 460 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        p.life -= dt
      }
      parts = parts.filter((p) => p.life > 0 && p.y < H + 14)

      // --- draw ---
      ctx.clearRect(0, 0, W, H)
      const cx = 72
      const rimY = 48
      const loose = lidGone ? 1 : Math.min(Math.max((100 - bowl.integrity) / 45, 0), 1)

      // bowl interior (behind contents)
      ctx.fillStyle = '#cfc7b4'
      ctx.beginPath()
      ctx.ellipse(cx, rimY, 52, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#b8b09c'
      ctx.beginPath()
      ctx.ellipse(cx, rimY, 46, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // contents — greens mound + salmon, sliding with the spring
      if (!salmonGone || bowl.integrity > 5) {
        const greens = ['#6f9a55', '#5f8a49', '#7da75f', '#558044']
        for (let i = 0; i < 4; i++) {
          const gx = cx + o * (0.55 + i * 0.12) + (i - 1.5) * 13
          const gy = rimY - 4 - (i % 2) * 3 - (salmonGone ? 3 : 0)
          ctx.fillStyle = greens[i]
          ctx.beginPath()
          ctx.ellipse(gx, gy, 11, 7.5, o * 0.012, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (!salmonGone) {
        // the salmon slab — rides the mound, hops when jostled
        const hop = Math.min(Math.abs(v) * 0.045, 7)
        const sx = cx + o * 0.85
        const sy = rimY - 12 - hop
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(o * 0.014 + v * 0.0009)
        ctx.fillStyle = '#e8896b'
        ctx.beginPath()
        ctx.roundRect(-17, -5.5, 34, 11, 4)
        ctx.fill()
        ctx.strokeStyle = '#d9714f'
        ctx.lineWidth = 1.4
        for (let s = -1; s <= 1; s++) {
          ctx.beginPath()
          ctx.arc(s * 9, 8, 10, -2.1, -1.05)
          ctx.stroke()
        }
        ctx.restore()
      }

      // bowl front (covers the lower contents)
      ctx.fillStyle = '#efe9da'
      ctx.beginPath()
      ctx.moveTo(cx - 52, rimY)
      ctx.lineTo(cx - 36, rimY + 34)
      ctx.lineTo(cx + 36, rimY + 34)
      ctx.lineTo(cx + 52, rimY)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#d8d0bd'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#9a9385'
      ctx.font = 'bold 7px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('CORPORATE SLOP BOWLZ', cx, rimY + 22)

      // lid — on, rattling and tilting with the chaos, until it isn't
      if (!lidGone) {
        const lift = loose * 5 + Math.abs(o) * 0.22
        const rattle = Math.sin(now * 0.035) * loose * 1.2
        ctx.save()
        ctx.translate(cx + o * 0.35, rimY - 7 - lift + rattle)
        ctx.rotate(o * 0.011 + loose * Math.sin(now * 0.05) * 0.05)
        ctx.fillStyle = 'rgba(208,212,216,0.92)'
        ctx.beginPath()
        ctx.roundRect(-50, -5, 100, 9, 4)
        ctx.fill()
        ctx.fillStyle = '#b9bec4'
        ctx.beginPath()
        ctx.roundRect(-7, -10, 14, 6, 3)
        ctx.fill()
        ctx.restore()
      }

      // particles (leaves, dressing, the lid, the salmon)
      for (const p of parts) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.min(p.life, 1)
        if (p.kind === 'leaf') {
          ctx.fillStyle = '#7da75f'
          ctx.beginPath()
          ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.kind === 'drop') {
          ctx.fillStyle = '#cdd3a3'
          ctx.beginPath()
          ctx.arc(0, 0, 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.kind === 'lid') {
          ctx.fillStyle = 'rgba(208,212,216,0.95)'
          ctx.beginPath()
          ctx.roundRect(-30, -4, 60, 7, 3)
          ctx.fill()
        } else {
          ctx.fillStyle = '#e8896b'
          ctx.beginPath()
          ctx.roundRect(-15, -5, 30, 10, 4)
          ctx.fill()
        }
        ctx.restore()
      }
      ctx.globalAlpha = 1

      // caption
      if (captionRef.current) {
        const cap = salmonGone
          ? 'salmon overboard.'
          : !lidGone
            ? bowl.integrity >= 85
              ? 'sitting pretty'
              : 'lid is rattling…'
            : bowl.integrity > 30
              ? 'open-air salad'
              : 'CRITICAL — salmon sliding'
        captionRef.current.textContent = cap
        captionRef.current.style.color = salmonGone || bowl.integrity <= 30 ? '#d96a5a' : lidGone ? '#d4a93a' : '#9fb39a'
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ lineHeight: 0 }}>
      <canvas ref={canvasRef} width={W * 2} height={H * 2} style={{ width: W, height: H, display: 'block' }} />
      <div
        ref={captionRef}
        style={{
          lineHeight: 1.4,
          fontSize: 9,
          letterSpacing: '0.08em',
          textAlign: 'center',
          color: '#9fb39a',
          paddingBottom: 2,
        }}
      >
        sitting pretty
      </div>
    </div>
  )
}
