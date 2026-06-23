// The Corporate Parade — a Macy's-grade civic event that walls off a downtown
// stretch of Synergy Ave. Giant branded blimps drift overhead trailing
// dark-corporate mottos, a couple of floats and a faceless beige crowd fill the
// street, and barricades (solid — see cityLayout PARADE_BARRIERS) force a
// reroute. The set-piece + the detour cost = the blueprint's "you cannot go
// straight through here."

import { useRef, useMemo, useLayoutEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import { Group, InstancedMesh, Object3D, CapsuleGeometry, Color } from 'three'
import { PARADE, PARADE_BARRIERS } from './cityLayout'
import { terrainHeight } from './terrain'

const GY = terrainHeight(PARADE.x, (PARADE.z0 + PARADE.z1) / 2) // downtown is flat

// The blimps + their mottos. Peak corporate.
const BLIMPS = [
  { z: -42, motto: 'CHANGE THE WORLD\nTHROUGH ALIGNMENT', color: '#3b4a66' },
  { z: -24, motto: 'SYNERGY IS A JOURNEY,\nNOT A DESTINATION', color: '#6e5040' },
  { z: -6, motto: 'WE ARE A FAMILY™\n(results may vary)', color: '#586575' },
  { z: 11, motto: 'DISRUPT YOURSELF\nBEFORE WE DO', color: '#7a5a44' },
  { z: 24, motto: 'MAXIMIZING HUMAN\nCAPITAL POTENTIAL', color: '#4f5a52' },
]

function Blimp({ z, motto, color, i }: { z: number; motto: string; color: string; i: number }) {
  const ref = useRef<Group>(null)
  const baseY = GY + 36 + (i % 2) * 5
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = baseY + Math.sin(performance.now() * 0.0006 + i * 1.3) * 1.5
      ref.current.rotation.z = Math.sin(performance.now() * 0.0005 + i) * 0.04
    }
  })
  return (
    <group ref={ref} position={[PARADE.x, baseY, z]}>
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
        <Billboard position={[0, -6.5, 0]}>
          <mesh>
            <planeGeometry args={[10, 3.6]} />
            <meshBasicMaterial color="#f3efe4" />
          </mesh>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[10.5, 4.1]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <Text position={[0, 0, 0.05]} fontSize={0.82} maxWidth={9.2} lineHeight={1.15} color="#23262b" anchorX="center" anchorY="middle" textAlign="center">
            {motto}
          </Text>
        </Billboard>
      </Suspense>
    </group>
  )
}

// A parade float — a flatbed with a giant branded cube + a slogan placard.
function Float({ z, color, word }: { z: number; color: string; word: string }) {
  return (
    <group position={[PARADE.x, GY, z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[8, 1, 5]} />
        <meshStandardMaterial color="#3a3d42" />
      </mesh>
      <mesh position={[0, 3, 0]} rotation={[0, 0.6, 0.1]} castShadow>
        <boxGeometry args={[3.4, 3.4, 3.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Suspense fallback={null}>
        <Billboard position={[0, 6, 0]}>
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
  for (let z = PARADE.z0 + 8; z <= PARADE.z1 - 8; z += 7) for (const dx of [-2.2, 2.2]) out.push({ x: PARADE.x + dx, z }) // marching column
  return out
})()

function Crowd() {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => new CapsuleGeometry(0.28, 0.95, 4, 7).translate(0, 0.92, 0), [])
  const shirts = useMemo(() => ['#b9b0a0', '#9aa3ad', '#a8b29e', '#b5a98f', '#8f9aa8'], [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    CROWD.forEach((p, i) => {
      o.position.set(p.x, GY, p.z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(shirts[i % shirts.length]))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [shirts])
  return (
    <instancedMesh ref={ref} args={[geo, undefined, CROWD.length]} castShadow>
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  )
}

export function Parade() {
  return (
    <group>
      {BLIMPS.map((b, i) => (
        <Blimp key={i} z={b.z} motto={b.motto} color={b.color} i={i} />
      ))}
      <Float z={-30} color="#b5603a" word="ALIGNLY" />
      <Float z={10} color="#3f7d4f" word="SLOP BOWLZ" />
      <Crowd />
      {/* barricades — a ROW of waist-high A-frame sawhorses across each blocked
          line (reads as "road closed", not a random orange wall) */}
      {PARADE_BARRIERS.flatMap((r, bi) => {
        const cz = (r.minZ + r.maxZ) / 2
        const w = r.maxX - r.minX
        const n = Math.max(2, Math.round(w / 2.6))
        return Array.from({ length: n }, (_, i) => {
          const x = r.minX + (w / n) * (i + 0.5)
          return (
            <group key={`${bi}-${i}`} position={[x, GY, cz]}>
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
