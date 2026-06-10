// Renders the whole car fleet (moving + parked) as two InstancedMeshes — one for
// bodies, one for cabins — so hundreds of cars cost two draw calls. The system
// advances the moving cars each frame (updateTraffic) and rewrites the instance
// matrices from the shared trafficState.

import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Color, BoxGeometry } from 'three'
import { traffic, updateTraffic, TRAFFIC_COLORS } from './trafficState'
import { terrainHeight } from './terrain'

const _o = new Object3D()
_o.rotation.order = 'YXZ' // yaw FIRST, then pitch — so slope tilts the nose, never rolls the car sideways

export function TrafficCars() {
  const bodyRef = useRef<InstancedMesh>(null)
  const cabinRef = useRef<InstancedMesh>(null)
  const n = traffic.cars.length

  // low-poly car: a body box + a smaller cabin box, both pre-lifted so the base
  // sits on the ground. Front is -Z to match the heading convention.
  const bodyGeo = useMemo(() => new BoxGeometry(1.9, 0.6, 4.2).translate(0, 0.38, 0), []) // sits flush on the road
  const cabinGeo = useMemo(() => new BoxGeometry(1.5, 0.55, 2.0).translate(0, 0.9, 0.12), []) // lower, less boxy

  // body colors are per-instance (variety); cabins share one dark "glass" tone
  useLayoutEffect(() => {
    const b = bodyRef.current
    if (!b) return
    const col = new Color()
    traffic.cars.forEach((c, i) => b.setColorAt(i, col.set(TRAFFIC_COLORS[c.colorIdx])))
    if (b.instanceColor) b.instanceColor.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    updateTraffic(Math.min(delta, 0.05))
    const b = bodyRef.current
    const c = cabinRef.current
    if (!b || !c) return
    traffic.cars.forEach((car, i) => {
      // pitch the car to the slope so it drives OVER hills instead of rising
      // flat like an elevator (front sinking into the grade)
      const fx = -Math.sin(car.heading)
      const fz = -Math.cos(car.heading)
      const L = 2.1
      const hF = terrainHeight(car.x + fx * L, car.z + fz * L)
      const hB = terrainHeight(car.x - fx * L, car.z - fz * L)
      const pitch = Math.atan2(hF - hB, 2 * L)
      // moving cars shrink away in the last few metres of their road, so the
      // loop-around teleport at the map edge happens while they're invisible —
      // no popping in/out of view. Parked cars always stay full size.
      const s = car.parked ? 1 : Math.max(0.001, Math.min(1, Math.min(car.t, 1 - car.t) / 0.012))
      _o.scale.setScalar(s)
      _o.position.set(car.x, terrainHeight(car.x, car.z), car.z)
      _o.rotation.set(pitch, car.heading, 0)
      _o.updateMatrix()
      b.setMatrixAt(i, _o.matrix)
      c.setMatrixAt(i, _o.matrix)
    })
    b.instanceMatrix.needsUpdate = true
    c.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={bodyRef} args={[bodyGeo, undefined, n]} castShadow>
        <meshStandardMaterial metalness={0.1} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[cabinGeo, undefined, n]} castShadow>
        <meshStandardMaterial color="#23262c" metalness={0.2} roughness={0.3} />
      </instancedMesh>
    </>
  )
}
