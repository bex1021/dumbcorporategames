// Renders the whole car fleet (moving + parked) as two InstancedMeshes — one for
// bodies, one for cabins — so hundreds of cars cost two draw calls. The system
// advances the moving cars each frame (updateTraffic) and rewrites the instance
// matrices from the shared trafficState.

import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Color, Vector3, BoxGeometry, CylinderGeometry } from 'three'
import { traffic, updateTraffic, TRAFFIC_COLORS } from './trafficState'
import { terrainHeight } from './terrain'

const _o = new Object3D()
_o.rotation.order = 'YXZ' // yaw FIRST, then pitch — so slope tilts the nose, never rolls the car sideways
const _w = new Object3D() // scratch transform for each wheel
const _v = new Vector3() // scratch: a wheel's local offset → world position

// The car's wheelbase / track — wheels sit at these four local offsets (x = side,
// z = front/back). Front is -Z, matching the heading convention.
const WHEEL_R = 0.42 // wheel radius (m) — the body rides this high off the road
const AXLE = 1.5 // half the wheelbase (front & rear axles sit ±this in z)
const TRACK = 0.92 // half the track width (wheels sit ±this in x)
const WHEELS: [number, number][] = [
  [-TRACK, -AXLE], [TRACK, -AXLE], // front
  [-TRACK, AXLE], [TRACK, AXLE], // rear
]

export function TrafficCars() {
  const bodyRef = useRef<InstancedMesh>(null)
  const cabinRef = useRef<InstancedMesh>(null)
  const wheelRef = useRef<InstancedMesh>(null)
  const n = traffic.cars.length

  // low-poly car: a body box + a smaller cabin box, both pre-lifted so the base
  // sits on the wheels (WHEEL_R off the road). Front is -Z to match the heading.
  const bodyGeo = useMemo(() => new BoxGeometry(1.9, 0.6, 4.2).translate(0, WHEEL_R + 0.3, 0), [])
  const cabinGeo = useMemo(() => new BoxGeometry(1.5, 0.55, 2.0).translate(0, WHEEL_R + 0.82, 0.12), [])
  // one shared wheel: a cylinder laid on its side (axle along local X)
  const wheelGeo = useMemo(() => new CylinderGeometry(WHEEL_R, WHEEL_R, 0.3, 12).rotateZ(Math.PI / 2), [])

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
    const wh = wheelRef.current
    if (!b || !c || !wh) return
    traffic.cars.forEach((car, i) => {
      // Plant the car ON its axles: sample the ground under the front and rear
      // axles, pitch the car to match that line, and set its height so BOTH
      // axles rest on the road — no more guessed lift, no floating or sinking.
      const fx = -Math.sin(car.heading)
      const fz = -Math.cos(car.heading)
      const hF = terrainHeight(car.x + fx * AXLE, car.z + fz * AXLE)
      const hB = terrainHeight(car.x - fx * AXLE, car.z - fz * AXLE)
      const pitch = Math.atan2(hF - hB, 2 * AXLE)
      const gy = (hF + hB) / 2 // road height at the axle midpoint
      // moving cars shrink away in the last few metres of their road, so the
      // loop-around teleport at the map edge happens while they're invisible —
      // no popping in/out of view. Parked cars always stay full size.
      const s = car.parked ? 1 : Math.max(0.001, Math.min(1, Math.min(car.t, 1 - car.t) / 0.012))
      _o.scale.setScalar(s)
      _o.position.set(car.x, gy, car.z)
      _o.rotation.set(pitch, car.heading, 0)
      _o.updateMatrix()
      b.setMatrixAt(i, _o.matrix)
      c.setMatrixAt(i, _o.matrix)
      // place this car's four wheels: each rides at WHEEL_R above the ground
      // directly beneath it, sharing the car's yaw+pitch so they sit flush.
      for (let k = 0; k < 4; k++) {
        const [lx, lz] = WHEELS[k]
        _v.set(lx, 0, lz).applyMatrix4(_o.matrix) // corner in world (_o.matrix already carries scale s)
        const wy = terrainHeight(_v.x, _v.z) + WHEEL_R * s
        _w.position.set(_v.x, wy, _v.z)
        _w.rotation.set(pitch, car.heading, 0)
        _w.scale.setScalar(s)
        _w.updateMatrix()
        wh.setMatrixAt(i * 4 + k, _w.matrix)
      }
    })
    b.instanceMatrix.needsUpdate = true
    c.instanceMatrix.needsUpdate = true
    wh.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={bodyRef} args={[bodyGeo, undefined, n]} castShadow>
        <meshStandardMaterial metalness={0.1} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[cabinGeo, undefined, n]} castShadow>
        <meshStandardMaterial color="#23262c" metalness={0.2} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={wheelRef} args={[wheelGeo, undefined, n * 4]} castShadow>
        <meshStandardMaterial color="#1a1c1f" metalness={0.1} roughness={0.7} />
      </instancedMesh>
    </>
  )
}
