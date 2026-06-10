// Faceless beige pedestrians as one InstancedMesh of capsules. The system walks
// them along the sidewalks and detects clips against the player (updatePeds,
// which also logs HR incidents). A clipped ped is "down" for a few seconds — we
// just hide it (scale 0) and it pops back up, no ragdoll.

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, CapsuleGeometry } from 'three'
import { peds, updatePeds } from './pedState'
import { terrainHeight } from './terrain'

const _o = new Object3D()

export function Pedestrians() {
  const ref = useRef<InstancedMesh>(null)
  const n = peds.list.length
  // a featureless capsule reads as a generic person — no face, no detail
  const geo = useMemo(() => new CapsuleGeometry(0.32, 1.0, 4, 8).translate(0, 0.92, 0), [])

  useFrame((_, delta) => {
    updatePeds(Math.min(delta, 0.05))
    const m = ref.current
    if (!m) return
    const t = performance.now()
    peds.list.forEach((p, i) => {
      if (p.down > 0) {
        _o.position.set(p.x, -50, p.z) // park it far below = hidden while down
        _o.scale.setScalar(0.001)
      } else {
        const bob = Math.abs(Math.sin(p.phase + t * 0.004 * p.speed)) * 0.05
        _o.position.set(p.x, terrainHeight(p.x, p.z) + bob, p.z)
        _o.scale.setScalar(1)
      }
      _o.rotation.set(0, 0, 0)
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]} castShadow>
      <meshStandardMaterial color="#b9b0a0" roughness={0.9} />
    </instancedMesh>
  )
}
