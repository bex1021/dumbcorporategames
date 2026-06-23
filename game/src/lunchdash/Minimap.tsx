// Lunch Dash minimap — GTA-style: solid land / water / green, BOLD road lines
// (arterials thick, collectors thinner), clean destination pins + an HQ marker
// and a car arrow. No per-building dots (that read as noise). Drawn on a
// <canvas> via rAF reading the mutable car state directly. -Z is up, +X right.

import { useEffect, useRef } from 'react'
import { carPosition, carFacing } from './carState'
import { DESTINATIONS } from './destinations'
import { HQ_BUILDING, WATER, GREEN_AREAS, ROADS, AVENUE_LINES, PARADE, WORLD_HALF, type Rect } from './cityLayout'
import { useLunchStore } from './lunchStore'

const SIZE = 188
const S = SIZE / (WORLD_HALF * 2)

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const toX = (wx: number) => SIZE / 2 + wx * S
    const toY = (wz: number) => SIZE / 2 + wz * S
    const clamp = (v: number) => Math.max(7, Math.min(SIZE - 7, v))
    const fillRect = (r: Rect, style: string) => {
      ctx.fillStyle = style
      ctx.fillRect(toX(r.minX), toY(r.minZ), (r.maxX - r.minX) * S, (r.maxZ - r.minZ) * S)
    }
    let raf = 0

    const draw = () => {
      const { stepIndex, done } = useLunchStore.getState()

      // land base, then greens, then water
      ctx.fillStyle = '#a8b487'
      ctx.fillRect(0, 0, SIZE, SIZE)
      GREEN_AREAS.forEach((r) => fillRect(r, '#7d9a59'))
      WATER.forEach((r) => fillRect(r, '#69a0c6'))

      // road network — bold cream lines (arterials thick, collectors thinner)
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#efe9d2'
      ROADS.forEach((r) => {
        ctx.lineWidth = r.type === 'arterial' ? 5 : 3
        ctx.beginPath()
        ctx.moveTo(toX(r.a.x), toY(r.a.z))
        ctx.lineTo(toX(r.b.x), toY(r.b.z))
        ctx.stroke()
      })
      // diagonal avenues — thinner
      AVENUE_LINES.forEach((s) => {
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(toX(s.a.x), toY(s.a.z))
        ctx.lineTo(toX(s.b.x), toY(s.b.z))
        ctx.stroke()
      })
      // street names along the majors
      ctx.font = 'bold 6px ui-monospace, monospace'
      ctx.fillStyle = 'rgba(82,84,70,0.9)'
      ctx.textAlign = 'center'
      ROADS.forEach((r) => {
        if (!r.name) return
        const rlen = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z)
        if (rlen < 250) return
        ctx.save()
        ctx.translate(toX((r.a.x + r.b.x) / 2), toY((r.a.z + r.b.z) / 2))
        if (r.a.x === r.b.x) ctx.rotate(-Math.PI / 2)
        ctx.fillText(r.name, 0, -2)
        ctx.restore()
      })

      // parade — a red "blocked" band across Synergy Ave
      ctx.strokeStyle = '#d24a3a'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(toX(PARADE.x), toY(PARADE.z0))
      ctx.lineTo(toX(PARADE.x), toY(PARADE.z1))
      ctx.stroke()

      // Alignly HQ — navy square marker
      const hx = clamp(toX(HQ_BUILDING.x))
      const hy = clamp(toY(HQ_BUILDING.z))
      ctx.fillStyle = '#2f3b57'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(hx - 4, hy - 4, 8, 8)
      ctx.fill()
      ctx.stroke()

      // destination pins (white-outlined; active one ringed)
      DESTINATIONS.forEach((d, i) => {
        const x = clamp(toX(d.x))
        const y = clamp(toY(d.z))
        const isActive = !done && i === stepIndex
        const isDone = done || i < stepIndex
        ctx.beginPath()
        ctx.arc(x, y, isActive ? 6 : 5, 0, Math.PI * 2)
        ctx.fillStyle = isDone ? '#9a9a9a' : d.color
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
        if (isActive) {
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, 10, 0, Math.PI * 2)
          ctx.stroke()
        }
      })

      // car arrow — white triangle, dark outline
      ctx.save()
      ctx.translate(clamp(toX(carPosition.x)), clamp(toY(carPosition.z)))
      ctx.rotate(-carFacing.y)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#222222'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, -8)
      ctx.lineTo(5.5, 6)
      ctx.lineTo(-5.5, 6)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // compass — N up (–Z), S down (+Z), E right (+X), W left (–X)
      ctx.font = 'bold 12px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.fillStyle = '#243044'
      const card = (ch: string, x: number, y: number) => {
        ctx.strokeText(ch, x, y)
        ctx.fillText(ch, x, y)
      }
      card('N', SIZE / 2, 11)
      card('S', SIZE / 2, SIZE - 11)
      card('E', SIZE - 10, SIZE / 2)
      card('W', 10, SIZE / 2)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      style={{ display: 'block', borderRadius: 8, border: '1px solid rgba(217,211,196,0.3)' }}
    />
  )
}
