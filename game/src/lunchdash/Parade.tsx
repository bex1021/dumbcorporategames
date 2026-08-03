// The Corporate Parade — a Macy's-grade civic event that walls off a downtown
// stretch of Synergy Ave. Giant branded blimps drift overhead trailing
// dark-corporate mottos, balloon floats and a faceless beige crowd fill the
// street, and barricades (solid — see cityLayout PARADE_BARRIERS) force a
// reroute. The set-piece + the detour cost = the blueprint's "you cannot go
// straight through here."
//
// IMPORTANT: this stretch of Synergy Ave is NOT flat — it rides the long tail
// of the northern hill (terrain ~11m at the north barricade down to ~1.5m at
// the south). So every ground piece samples terrainHeight at ITS OWN x,z; a
// single shared height would bury the uphill end and levitate the downhill end.

import { useRef, useMemo, useLayoutEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import { Group, InstancedMesh, Object3D, CapsuleGeometry, SphereGeometry, BoxGeometry, Color } from 'three'
import { PARADE, PARADE_BARRIERS } from './cityLayout'
import { terrainHeight } from './terrain'
import { carPosition } from './carState'
import { hr, HR_TIME_PENALTY } from './pedState'
import { driveClock } from './clockState'

// The blimps + their mottos. Peak corporate. The first is the branded green
// SLOP BOWLZ blimp (so the destination has a recognisable airship overhead, not
// a mystery green box); the rest are generic alignment-speak.
const BLIMPS = [
  { z: -40, motto: 'CORPORATE SLOP BOWLZ\nyou deserve this™', color: '#3f7d4f' },
  { z: -22, motto: 'CHANGE THE WORLD\nTHROUGH ALIGNMENT', color: '#3b4a66' },
  { z: -4, motto: 'SYNERGY IS A JOURNEY,\nNOT A DESTINATION', color: '#6e5040' },
  { z: 13, motto: 'WE ARE A FAMILY™\n(results may vary)', color: '#586575' },
  { z: 26, motto: 'DISRUPT YOURSELF\nBEFORE WE DO', color: '#7a5a44' },
]

// Blimps used to sit dead on PARADE.x — the same centreline the jump ramps aim
// down — so looking up the float's ramp put an airship square in the crosshairs
// and read as "this ramp fires you into a blimp". They now alternate to either
// side of the route, which is also how a real parade flies them: over the crowd,
// not over the marching lane.
const BLIMP_OFF = 15
function Blimp({ z, motto, color, i }: { z: number; motto: string; color: string; i: number }) {
  const ref = useRef<Group>(null)
  const sideX = PARADE.x + (i % 2 === 0 ? -BLIMP_OFF : BLIMP_OFF)
  // float a fixed height above whatever ground is beneath it, so a blimp over
  // the high north end isn't visibly lower than one over the low south end.
  // Kept low (≈22m) so you can actually read the logos from street level —
  // still well clear of the floats and the car.
  const baseY = terrainHeight(PARADE.x, z) + 22 + (i % 2) * 4
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = baseY + Math.sin(performance.now() * 0.0006 + i * 1.3) * 1.5
      ref.current.rotation.z = Math.sin(performance.now() * 0.0005 + i) * 0.04
    }
  })
  return (
    <group ref={ref} position={[sideX, baseY, z]}>
      {/* envelope */}
      <mesh scale={[3.4, 2.8, 7]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* tail fins */}
      <mesh position={[0, 0, 7]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.3, 3, 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, 7]}>
        <boxGeometry args={[3, 0.3, 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* gondola */}
      <mesh position={[0, -3, 0]}>
        <boxGeometry args={[1.1, 0.9, 2.4]} />
        <meshStandardMaterial color="#23262b" />
      </mesh>
      {/* hanging motto banner — billboarded so it always reads */}
      <Suspense fallback={null}>
        <Billboard position={[0, -6, 0]}>
          <mesh>
            <planeGeometry args={[12.4, 4.5]} />
            <meshBasicMaterial color="#f3efe4" />
          </mesh>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[13, 5.1]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <Text position={[0, 0, 0.05]} fontSize={0.98} maxWidth={11.4} lineHeight={1.15} color="#23262b" anchorX="center" anchorY="middle" textAlign="center">
            {motto}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  )
}

// A parade float — a flatbed carrying a giant tethered BALLOON (not a box) +
// a slogan placard. Sits on the local grade.
function Float({ z, color, word }: { z: number; color: string; word: string }) {
  const gy = terrainHeight(PARADE.x, z)
  return (
    <group position={[PARADE.x, gy, z]}>
      {/* flatbed */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[8, 1, 5]} />
        <meshStandardMaterial color="#3a3d42" />
      </mesh>
      {/* tether lines */}
      <mesh position={[-1.4, 2.6, 0]} rotation={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.03, 0.03, 3.4, 4]} />
        <meshStandardMaterial color="#5a5d62" />
      </mesh>
      <mesh position={[1.4, 2.6, 0]} rotation={[0, 0, -0.18]}>
        <cylinderGeometry args={[0.03, 0.03, 3.4, 4]} />
        <meshStandardMaterial color="#5a5d62" />
      </mesh>
      {/* the balloon — a fat blimp-shaped envelope */}
      <mesh position={[0, 4.7, 0]} scale={[2.3, 2.7, 3.2]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <Suspense fallback={null}>
        <Billboard position={[0, 8.4, 0]}>
          <Text fontSize={1.1} color="#f3efe4" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#23262b">
            {word}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  )
}

// The crowd: faceless beige blobs lining both sidewalks (two loose rows each) +
// a thin marching column in the street. One instanced draw.
const CROWD = (() => {
  const out: { x: number; z: number }[] = []
  for (const sx of [-55, -31]) for (let z = PARADE.z0; z <= PARADE.z1; z += 3.4) for (const r of [0, 1]) out.push({ x: sx + (sx < -43 ? -1 : 1) * r * 1.3, z: z + r * 1.1 })
  // Marching column — with a GAP over the landing strip. A car clearing the
  // barricade off the first carrier truck comes down around z = 10-20 and runs
  // north to the second truck at z = -20; marchers standing in that lane would
  // make a well-judged jump an unavoidable pile of HR incidents. The parade
  // simply has a float-sized hole in it there, which is also why there is room
  // for a second truck to be parked.
  const LAND_Z1 = 24 // south end of the clear strip
  const LAND_Z0 = -34 // north end — past the float's lip at z = -30
  for (let z = PARADE.z0 + 8; z <= PARADE.z1 - 8; z += 7) {
    if (z <= LAND_Z1 && z >= LAND_Z0) continue
    for (const dx of [-2.2, 2.2]) out.push({ x: PARADE.x + dx, z })
  }
  return out
})()

// Same faceless-office-worker silhouette as the roaming Pedestrians (legs box +
// torso capsule + head sphere), so the parade crowd matches the blobs walking
// the rest of the city instead of being lone pills. Same palettes, too.
const CROWD_SHIRTS = ['#b9b0a0', '#9aa3ad', '#a8b29e', '#b5a98f', '#8f9aa8', '#b0a4ad']
const CROWD_SLACKS = ['#5b5e63', '#6a6457', '#54585f', '#6e6a5e']

// Precompute each spectator's spot, facing, size + a per-person hop phase, so
// the animation loop just bounces them (no re-sampling the terrain every frame).
const _co = new Object3D()
_co.rotation.order = 'YXZ'
const CROWD_MEMBERS = CROWD.map((p, i) => ({
  x: p.x,
  z: p.z,
  gy: terrainHeight(p.x, p.z),
  heading: Math.atan2(PARADE.x - p.x, 0.001), // face the route
  scale: 0.92 + (i % 5) * 0.04,
  phase: (i * 2.399963) % (Math.PI * 2),
  rate: 2.2 + (i % 7) * 0.28, // varied hop tempo so they're not in lockstep
  down: 0, // seconds left "down" after being clipped by the car (mutated in-frame)
}))
const PARADE_CZ = (PARADE.z0 + PARADE.z1) / 2
const CROWD_HIT_R = 1.6 // player-center to spectator distance that counts as a clip

function Crowd() {
  const torsoRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)
  const legsRef = useRef<InstancedMesh>(null)
  const n = CROWD.length
  const torsoGeo = useMemo(() => new CapsuleGeometry(0.26, 0.5, 4, 8).translate(0, 1.05, 0), [])
  const headGeo = useMemo(() => new SphereGeometry(0.16, 8, 8).translate(0, 1.58, 0), [])
  const legsGeo = useMemo(() => new BoxGeometry(0.3, 0.66, 0.22).translate(0, 0.33, 0), [])
  // colours are static — set once
  useLayoutEffect(() => {
    const c = new Color()
    CROWD_MEMBERS.forEach((_, i) => {
      torsoRef.current?.setColorAt(i, c.set(CROWD_SHIRTS[i % CROWD_SHIRTS.length]))
      legsRef.current?.setColorAt(i, c.set(CROWD_SLACKS[i % CROWD_SLACKS.length]))
    })
    if (torsoRef.current?.instanceColor) torsoRef.current.instanceColor.needsUpdate = true
    if (legsRef.current?.instanceColor) legsRef.current.instanceColor.needsUpdate = true
  }, [])
  // hop with excitement (wilder as the car nears) — and clip like a pedestrian:
  // drive into a spectator and it's a logged HR incident + a clock penalty, so
  // plowing the crowd is no longer free. They drop, then pop back up.
  useFrame((_, delta) => {
    const torso = torsoRef.current
    const head = headRef.current
    const legs = legsRef.current
    if (!torso || !head || !legs) return
    const dt = Math.min(delta, 0.05)
    const t = performance.now() * 0.001
    const cx = carPosition.x
    const cz = carPosition.z
    const dist = Math.hypot(cx - PARADE.x, cz - PARADE_CZ)
    const excite = Math.max(0.3, Math.min(1.6, 1.6 - dist / 45)) // wilder up close
    for (let i = 0; i < CROWD_MEMBERS.length; i++) {
      const m = CROWD_MEMBERS[i]
      if (m.down > 0) {
        m.down = Math.max(0, m.down - dt)
        _co.position.set(m.x, -50, m.z) // hidden while down
        _co.scale.setScalar(0.001)
        _co.rotation.set(0, 0, 0)
        _co.updateMatrix()
        torso.setMatrixAt(i, _co.matrix)
        head.setMatrixAt(i, _co.matrix)
        legs.setMatrixAt(i, _co.matrix)
        continue
      }
      // clip check vs the player car — same consequence as the sidewalk peds
      const ddx = m.x - cx
      const ddz = m.z - cz
      if (ddx * ddx + ddz * ddz < CROWD_HIT_R * CROWD_HIT_R) {
        m.down = 4
        hr.incidents++
        hr.pulse++
        driveClock.minutes += HR_TIME_PENALTY
      }
      const hop = Math.abs(Math.sin(t * m.rate + m.phase)) * 0.26 * excite
      _co.position.set(m.x, m.gy + hop, m.z)
      _co.rotation.set(0, m.heading, 0)
      _co.scale.setScalar(m.scale)
      _co.updateMatrix()
      torso.setMatrixAt(i, _co.matrix)
      head.setMatrixAt(i, _co.matrix)
      legs.setMatrixAt(i, _co.matrix)
    }
    torso.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
    legs.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={legsRef} args={[legsGeo, undefined, n]} castShadow>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={torsoRef} args={[torsoGeo, undefined, n]} castShadow>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      {/* blank beige head — no face, same joke as the roaming pedestrians */}
      <instancedMesh ref={headRef} args={[headGeo, undefined, n]} castShadow>
        <meshStandardMaterial color="#c2b6a3" roughness={0.85} />
      </instancedMesh>
    </>
  )
}

export function Parade() {
  return (
    <group>
      {BLIMPS.map((b, i) => (
        <Blimp key={i} z={b.z} motto={b.motto} color={b.color} i={i} />
      ))}
      <Float z={-30} color="#3b4a66" word="ALIGNLY" />
      <Float z={12} color="#3f7d4f" word="SLOP BOWLZ" />
      <Crowd />
      {/* barricades — a ROW of waist-high A-frame sawhorses across each blocked
          line (reads as "road closed", not a random orange wall). Each sawhorse
          stands on the local grade so the row follows the slope. */}
      {PARADE_BARRIERS.flatMap((r, bi) => {
        const cz = (r.minZ + r.maxZ) / 2
        const w = r.maxX - r.minX
        const n = Math.max(2, Math.round(w / 2.6))
        return Array.from({ length: n }, (_, i) => {
          const x = r.minX + (w / n) * (i + 0.5)
          return (
            <group key={`${bi}-${i}`} position={[x, terrainHeight(x, cz), cz]}>
              <mesh position={[-0.85, 0.42, 0]} rotation={[0, 0, 0.22]} castShadow>
                <boxGeometry args={[0.1, 1, 0.1]} />
                <meshStandardMaterial color="#9aa0a4" />
              </mesh>
              <mesh position={[0.85, 0.42, 0]} rotation={[0, 0, -0.22]} castShadow>
                <boxGeometry args={[0.1, 1, 0.1]} />
                <meshStandardMaterial color="#9aa0a4" />
              </mesh>
              <mesh position={[0, 0.82, 0]} castShadow>
                <boxGeometry args={[2.4, 0.42, 0.12]} />
                <meshStandardMaterial color="#e0762e" />
              </mesh>
              <mesh position={[0, 0.82, 0.07]}>
                <boxGeometry args={[2.42, 0.16, 0.04]} />
                <meshStandardMaterial color="#f0ede4" />
              </mesh>
            </group>
          )
        })
      })}
    </group>
  )
}
