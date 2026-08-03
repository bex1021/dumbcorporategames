// WORLD AUDIT — does anything sit in the road?
//
// Earlier audits only ever checked ROADS vs BUILDINGS, which is why a mall sign
// standing in the carriageway survived several "clean" passes. This checks
// EVERY placed object against the drivable surface of every road, and reports
// how far into the lane each one intrudes.
//
//   npx tsx scripts/playtest/world_audit.ts
import * as L from '../../src/lunchdash/cityLayout'
import { LANDMARKS } from '../../src/lunchdash/cityLayout'

const { ROADS, roadWidth } = L as any
type Box = { name: string; x0: number; x1: number; z0: number; z1: number }
const boxes: Box[] = []
const add = (name: string, x: number, z: number, w: number, d: number) =>
  boxes.push({ name, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 })

// ── landmark monument signs (placed radius+7 toward the origin, road-blind) ──
const landmarkRadius = (l: any) =>
  l.kind === 'stadium' ? l.r : l.kind === 'capitol' ? 13 : Math.max(l.w ?? 20, l.d ?? 20) / 2
for (const l of LANDMARKS as any[]) {
  const len = Math.hypot(l.x, l.z) || 1
  const dx = -l.x / len, dz = -l.z / len
  const off = landmarkRadius(l) + 7
  const base = Math.atan2(dx, dz)
  let sx = l.x + dx * off, sz = l.z + dz * off
  for (const d of [0, 20, -20, 40, -40, 60, -60, 90, -90, 120, -120, 150, -150, 180]) {
    const a = base + (d * Math.PI) / 180
    const cx = l.x + Math.sin(a) * off, cz = l.z + Math.cos(a) * off
    if (!(L as any).onRoad(cx, cz, 3)) { sx = cx; sz = cz; break }
  }
  const w = Math.max(9, l.label.length * 0.86) + 1.4
  add(`SIGN "${l.label}"`, sx, sz, w, 1.5)
}
// ── trees / palms / country trees ──
for (const t of (L as any).TREES) add('tree', t.x, t.z, 1.4, 1.4)
for (const t of (L as any).PALMS) add('palm', t.x, t.z, 1.4, 1.4)
for (const t of (L as any).COUNTRY_TREES) add('country tree', t.x, t.z, 1.4, 1.4)
// ── alley props ──
for (const p of (L as any).ALLEY_PROPS) if (p.kind === 'dumpster') add('dumpster', p.x, p.z, 2.2, 1.6)
// ── barns / docks / storefronts ──
for (const b of (L as any).BARNS) add('barn', b.x, b.z, b.w, b.d)
for (const d of (L as any).DOCKS) add('dock', d.x, d.z, d.len, 6)
for (const s of (L as any).STOREFRONTS) add(`storefront ${s.id}`, s.x, s.z, s.w, s.d)

// ── the drivable surface of each road ──
const laneOf = (r: any) => {
  const ew = Math.abs(r.a.z - r.b.z) < 0.001
  // roadWidth takes the road TYPE, not the road. Passing the object silently
  // returned the 12 m collector width for everything, so 18 m arterials were
  // audited 3 m too narrow on each side and their intrusions went unreported.
  const half = roadWidth(r.type) / 2
  return ew
    ? { x0: Math.min(r.a.x, r.b.x), x1: Math.max(r.a.x, r.b.x), z0: r.a.z - half, z1: r.a.z + half, half }
    : { x0: r.a.x - half, x1: r.a.x + half, z0: Math.min(r.a.z, r.b.z), z1: Math.max(r.a.z, r.b.z), half }
}

const hits: { how: number; line: string }[] = []
for (const r of ROADS as any[]) {
  const ew = Math.abs(r.a.z - r.b.z) < 0.001
  if (!ew && Math.abs(r.a.x - r.b.x) > 0.001) continue
  const lane = laneOf(r)
  for (const b of boxes) {
    if (b.x1 <= lane.x0 || b.x0 >= lane.x1 || b.z1 <= lane.z0 || b.z0 >= lane.z1) continue
    const ox = Math.min(b.x1, lane.x1) - Math.max(b.x0, lane.x0)
    const oz = Math.min(b.z1, lane.z1) - Math.max(b.z0, lane.z0)
    const into = ew ? oz : ox // how far into the carriageway
    if (into < 0.3) continue
    hits.push({ how: into, line: `  ${into.toFixed(1)}m into "${r.name}"  ←  ${b.name}  @ ${((b.x0 + b.x1) / 2).toFixed(0)},${((b.z0 + b.z1) / 2).toFixed(0)}` })
  }
}
hits.sort((a, b) => b.how - a.how)
console.log(`checked ${boxes.length} placed objects against ${(ROADS as any[]).length} roads\n`)
console.log(hits.length ? `⚠ ${hits.length} objects intrude into a carriageway:` : '✅ nothing in the road')
for (const h of hits) console.log(h.line)
