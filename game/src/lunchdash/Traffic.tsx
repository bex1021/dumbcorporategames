// Renders the whole car fleet as one instanced set PER vehicle type (sedan, SUV,
// taxi, pickup, van, sports car, bus) — each type its own body + cabin/window
// band + wheels, so the streets read as a diverse, colourful fleet instead of
// one repeated car. A single <TrafficSim> advances the shared trafficState once
// per frame; each <Fleet> just reads its members' live transforms and writes
// matrices. Still only a handful of draw calls total.

import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Color, Vector3, BoxGeometry, CylinderGeometry } from 'three'
import { traffic, updateTraffic, VEHICLE_SPECS, type VehicleSpec } from './trafficState'
import { terrainHeight } from './terrain'

const _o = new Object3D()
_o.rotation.order = 'YXZ' // yaw first, then pitch — slope tilts the nose, never rolls the car
const _w = new Object3D()
const _v = new Vector3()

export function TrafficCars() {
  return (
    <>
      <TrafficSim />
      {VEHICLE_SPECS.map((s) => (
        <Fleet key={s.key} spec={s} />
      ))}
    </>
  )
}

// advances every moving car once per frame (the fleets are render-only)
function TrafficSim() {
  useFrame((_, delta) => updateTraffic(Math.min(delta, 0.05)))
  return null
}

function Fleet({ spec }: { spec: VehicleSpec }) {
  // indices into traffic.cars belonging to this type — deterministic + stable
  const members = useMemo(() => {
    const arr: number[] = []
    traffic.cars.forEach((c, i) => {
      if (c.vtype === spec.key) arr.push(i)
    })
    return arr
  }, [spec.key])
  const n = members.length

  const bodyRef = useRef<InstancedMesh>(null)
  const cabinRef = useRef<InstancedMesh>(null)
  const wheelRef = useRef<InstancedMesh>(null)

  // geometry, pre-lifted so the wheels touch the road and the body/cabin ride on
  // top. 'band' cabins (bus/van) sit low as a window stripe; 'roof' cabins perch.
  const bodyY = spec.wheelR + spec.body[1] / 2
  const cabinY =
    spec.cabinMode === 'roof'
      ? bodyY + spec.body[1] / 2 + spec.cabin[1] / 2 - 0.12
      : bodyY + spec.body[1] * 0.12
  const bodyGeo = useMemo(() => new BoxGeometry(spec.body[0], spec.body[1], spec.body[2]).translate(0, bodyY, 0), [spec, bodyY])
  const cabinGeo = useMemo(() => new BoxGeometry(spec.cabin[0], spec.cabin[1], spec.cabin[2]).translate(0, cabinY, spec.cabinZ), [spec, cabinY])
  const wheelGeo = useMemo(() => new CylinderGeometry(spec.wheelR, spec.wheelR, 0.32, 10).rotateZ(Math.PI / 2), [spec])
  const wheelOffsets = useMemo<[number, number][]>(
    () => [
      [-spec.track, -spec.axle],
      [spec.track, -spec.axle],
      [-spec.track, spec.axle],
      [spec.track, spec.axle],
    ],
    [spec],
  )

  // per-instance body colour from this type's palette (set once)
  useLayoutEffect(() => {
    const b = bodyRef.current
    if (!b) return
    const col = new Color()
    members.forEach((idx, k) => b.setColorAt(k, col.set(spec.colors[traffic.cars[idx].colorIdx % spec.colors.length])))
    if (b.instanceColor) b.instanceColor.needsUpdate = true
  }, [members, spec])

  useFrame(() => {
    const b = bodyRef.current
    const c = cabinRef.current
    const wh = wheelRef.current
    if (!b || !c || !wh) return
    for (let k = 0; k < members.length; k++) {
      const car = traffic.cars[members[k]]
      // plant on the axles: pitch to the front/rear ground line, sit at their mid
      const fx = -Math.sin(car.heading)
      const fz = -Math.cos(car.heading)
      const hF = terrainHeight(car.x + fx * spec.axle, car.z + fz * spec.axle)
      const hB = terrainHeight(car.x - fx * spec.axle, car.z - fz * spec.axle)
      const pitch = Math.atan2(hF - hB, 2 * spec.axle)
      const gy = (hF + hB) / 2
      // moving cars shrink away in the last metres of their road (invisible loop-around)
      const s = car.parked ? 1 : Math.max(0.001, Math.min(1, Math.min(car.t, 1 - car.t) / 0.012))
      _o.scale.setScalar(s)
      _o.position.set(car.x, gy, car.z)
      _o.rotation.set(pitch, car.heading, 0)
      _o.updateMatrix()
      b.setMatrixAt(k, _o.matrix)
      c.setMatrixAt(k, _o.matrix)
      for (let j = 0; j < 4; j++) {
        const [lx, lz] = wheelOffsets[j]
        _v.set(lx, 0, lz).applyMatrix4(_o.matrix) // corner in world (matrix carries scale s)
        const wy = terrainHeight(_v.x, _v.z) + spec.wheelR * s
        _w.position.set(_v.x, wy, _v.z)
        _w.rotation.set(pitch, car.heading, 0)
        _w.scale.setScalar(s)
        _w.updateMatrix()
        wh.setMatrixAt(k * 4 + j, _w.matrix)
      }
    }
    b.instanceMatrix.needsUpdate = true
    c.instanceMatrix.needsUpdate = true
    wh.instanceMatrix.needsUpdate = true
  })

  if (n === 0) return null
  return (
    <>
      <instancedMesh ref={bodyRef} args={[bodyGeo, undefined, n]} castShadow>
        <meshStandardMaterial metalness={0.12} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[cabinGeo, undefined, n]} castShadow>
        <meshStandardMaterial color={spec.cabinColor} metalness={0.2} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={wheelRef} args={[wheelGeo, undefined, n * 4]} castShadow>
        <meshStandardMaterial color="#1a1c1f" metalness={0.1} roughness={0.7} />
      </instancedMesh>
    </>
  )
}
