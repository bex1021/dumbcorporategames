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

// Cars ride on the ROAD SURFACE, which the road ribbons draw at terrain + 0.08.
// Planting them at raw terrain height buried every tyre 8 cm into the asphalt —
// most visibly on the hill roads, where it read as wheels sunk into the ground.
const ROAD_LIFT = 0.08

const _o = new Object3D()
_o.rotation.order = 'YXZ' // yaw first, then pitch/roll in the car's own frame
const _w = new Object3D()
_w.rotation.order = 'YXZ' // match the body so wheels tilt with it
const _v = new Vector3()
const _col = new Color()

// Deterministic per-car cant for a write-off, so wrecks lean different ways but
// never re-randomise between frames.
function wreckTilt(i: number): number {
  const h = Math.sin(i * 12.9898) * 43758.5453
  return ((h - Math.floor(h)) - 0.5) * 0.5
}

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
  // 6 sides, not 10: a low-poly wheel's own silhouette flickers as it turns, so
  // the spin reads at a distance. A smooth cylinder is rotationally symmetric
  // and looks static no matter how fast it's actually rolling.
  const wheelGeo = useMemo(() => new CylinderGeometry(spec.wheelR, spec.wheelR, 0.32, 6).rotateZ(Math.PI / 2), [spec])
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

  // rolling angle per car, accumulated from how far it actually travelled
  const roll = useRef<Float32Array>(new Float32Array(0))
  const lastPos = useRef<Float32Array>(new Float32Array(0))
  const wrecked = useRef<boolean[]>([])

  useFrame(() => {
    const b = bodyRef.current
    const c = cabinRef.current
    const wh = wheelRef.current
    if (!b || !c || !wh) return
    if (roll.current.length !== members.length) {
      roll.current = new Float32Array(members.length)
      lastPos.current = new Float32Array(members.length * 2)
      wrecked.current = new Array(members.length).fill(false)
      for (let k = 0; k < members.length; k++) {
        const car = traffic.cars[members[k]]
        lastPos.current[k * 2] = car.x
        lastPos.current[k * 2 + 1] = car.z
      }
    }
    for (let k = 0; k < members.length; k++) {
      const car = traffic.cars[members[k]]
      // Spin the wheels by the distance actually covered (not by dt × speed), so
      // they stay correct while a car is stalled, queuing at a light or mid
      // U-turn. Static wheels on a moving car is the loudest "nothing is really
      // moving" tell in a driving game.
      if (!car.parked) {
        const dx = car.x - lastPos.current[k * 2]
        const dz = car.z - lastPos.current[k * 2 + 1]
        const travelled = Math.hypot(dx, dz)
        if (travelled < 20) roll.current[k] += travelled / spec.wheelR // ignore teleports
        lastPos.current[k * 2] = car.x
        lastPos.current[k * 2 + 1] = car.z
      }
      // plant on the axles: pitch to the front/rear ground line, sit at their mid
      const fx = -Math.sin(car.heading)
      const fz = -Math.cos(car.heading)
      const rx = Math.cos(car.heading) // car's right vector
      const rz = -Math.sin(car.heading)
      const hF = terrainHeight(car.x + fx * spec.axle, car.z + fz * spec.axle)
      const hB = terrainHeight(car.x - fx * spec.axle, car.z - fz * spec.axle)
      const hR = terrainHeight(car.x + rx * spec.track, car.z + rz * spec.track)
      const hL = terrainHeight(car.x - rx * spec.track, car.z - rz * spec.track)
      const pitch = Math.atan2(hF - hB, 2 * spec.axle)
      // roll with the cross-slope too — pitch alone left the uphill-side tyres
      // and skirt buried on cambered hill roads (same fix the player car has)
      // A totalled car sits wrong: slumped on its suspension and canted over,
      // so a wreck is readable at a glance without needing crumpled geometry
      // (the fleet shares one body mesh per type, so we can't deform it).
      const w = Math.min(1, car.wreck)
      const bank = Math.atan2(hR - hL, 2 * spec.track) + (w >= 1 ? wreckTilt(k) : 0)
      const gy = (hF + hB) / 2 + ROAD_LIFT - w * 0.16
      // Cars are always full size. The old shrink-to-nothing fade at road ends
      // played out in plain sight and read as cars popping in; they now make a
      // real U-turn instead (see trafficState).
      _o.scale.setScalar(1)
      _o.position.set(car.x, gy, car.z)
      _o.rotation.set(pitch + (w >= 1 ? 0.07 : 0), car.heading, bank)
      _o.updateMatrix()
      b.setMatrixAt(k, _o.matrix)
      c.setMatrixAt(k, _o.matrix)
      // soot the paint down once it's a write-off — one setColorAt per car, and
      // only on the frame the state actually flips
      if (wrecked.current[k] !== (w >= 1)) {
        wrecked.current[k] = w >= 1
        const base = spec.colors[car.colorIdx % spec.colors.length]
        b.setColorAt(k, _col.set(base).multiplyScalar(w >= 1 ? 0.42 : 1))
        if (b.instanceColor) b.instanceColor.needsUpdate = true
      }
      const spin = roll.current[k]
      for (let j = 0; j < 4; j++) {
        const [lx, lz] = wheelOffsets[j]
        _v.set(lx, 0, lz).applyMatrix4(_o.matrix) // corner in world
        const wy = terrainHeight(_v.x, _v.z) + ROAD_LIFT + spec.wheelR
        _w.position.set(_v.x, wy, _v.z)
        // wheel geometry's axle lies along local X, so the roll angle adds there
        _w.rotation.set(pitch + spin, car.heading, bank)
        _w.scale.setScalar(1)
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
