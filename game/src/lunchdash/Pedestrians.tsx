// Faceless beige pedestrians — now with a human SILHOUETTE: head + torso +
// legs as three InstancedMeshes sharing one matrix per ped (same trick as the
// traffic cars' body+cabin). Still no face, still corporate beige — that's the
// satire — but they read as office workers instead of pills. The system walks
// them along the sidewalks and detects clips against the player (updatePeds,
// which also logs HR incidents). A clipped ped is "down" for a few seconds —
// hidden, then back up, no ragdoll.

import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Color, CapsuleGeometry, SphereGeometry, BoxGeometry } from 'three'
import { peds, updatePeds } from './pedState'
import { terrainHeight } from './terrain'

const _o = new Object3D()
_o.rotation.order = 'YXZ' // yaw first, then the walking lean

// corporate-casual palette — shirts vary, all of it stays muted office-beige
const SHIRTS = ['#b9b0a0', '#9aa3ad', '#a8b29e', '#b5a98f', '#8f9aa8', '#b0a4ad']
const SLACKS = ['#5b5e63', '#6a6457', '#54585f', '#6e6a5e']

export function Pedestrians() {
  const torsoRef = useRef<InstancedMesh>(null)
  const headRef = useRef<InstancedMesh>(null)
  const legsRef = useRef<InstancedMesh>(null)
  const n = peds.list.length

  const torsoGeo = useMemo(() => new CapsuleGeometry(0.26, 0.5, 4, 8).translate(0, 1.05, 0), [])
  const headGeo = useMemo(() => new SphereGeometry(0.16, 8, 8).translate(0, 1.58, 0), [])
  const legsGeo = useMemo(() => new BoxGeometry(0.3, 0.66, 0.22).translate(0, 0.33, 0), [])

  // per-ped shirt + slacks colors, set once
  useLayoutEffect(() => {
    const c = new Color()
    peds.list.forEach((_, i) => {
      torsoRef.current?.setColorAt(i, c.set(SHIRTS[i % SHIRTS.length]))
      legsRef.current?.setColorAt(i, c.set(SLACKS[i % SLACKS.length]))
    })
    if (torsoRef.current?.instanceColor) torsoRef.current.instanceColor.needsUpdate = true
    if (legsRef.current?.instanceColor) legsRef.current.instanceColor.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    updatePeds(Math.min(delta, 0.05))
    const torso = torsoRef.current
    const head = headRef.current
    const legs = legsRef.current
    if (!torso || !head || !legs) return
    const t = performance.now()
    peds.list.forEach((p, i) => {
      if (p.down > 0) {
        _o.position.set(p.x, -50, p.z) // hidden while down
        _o.scale.setScalar(0.001)
        _o.rotation.set(0, 0, 0)
      } else {
        // face along travel, lean slightly forward, bob with the walk
        const r = p.road
        const dx = r.b.x - r.a.x
        const dz = r.b.z - r.a.z
        const il = 1 / (Math.hypot(dx, dz) || 1)
        const heading = Math.atan2(dx * il * p.dir, dz * il * p.dir)
        const bob = Math.abs(Math.sin(p.phase + t * 0.004 * p.speed)) * 0.06
        _o.position.set(p.x, terrainHeight(p.x, p.z) + bob, p.z)
        _o.scale.setScalar(0.92 + (i % 5) * 0.04) // a little height variety
        _o.rotation.set(0.09, heading, 0)
      }
      _o.updateMatrix()
      torso.setMatrixAt(i, _o.matrix)
      head.setMatrixAt(i, _o.matrix)
      legs.setMatrixAt(i, _o.matrix)
    })
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
      {/* the head stays blank beige — no face. That's the whole joke. */}
      <instancedMesh ref={headRef} args={[headGeo, undefined, n]} castShadow>
        <meshStandardMaterial color="#c2b6a3" roughness={0.85} />
      </instancedMesh>
    </>
  )
}
