// Follow-up: what the airborne clips do inside the window the sim ACTUALLY plays,
// and what a baseline-subtracting normalisation would produce.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const imageStub = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, setAttribute() {}, set src(_) {} })
globalThis.self ??= globalThis
globalThis.window ??= globalThis
globalThis.document ??= {
  createElementNS: () => ({ style: {}, ...imageStub() }),
  createElement: () => ({ getContext: () => null, ...imageStub() }),
}

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..', '..', 'public', 'models', '_mixamo_glb')
const S = 0.01
const loader = new GLTFLoader()
const parse = (buf) => new Promise((res, rej) => {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  loader.parse(ab, '', res, rej)
})
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')

// sim numbers from fightConfig.ts
const IMPULSE = 4.6, GRAVITY = 13.2
const RISE = IMPULSE / GRAVITY               // s airborne with vy > 0  → 'jump' clip
const APEX = (IMPULSE * IMPULSE) / (2 * GRAVITY)
const AIRTIME = 2 * RISE
console.log(`sim jump: rise ${RISE.toFixed(3)}s, apex ${APEX.toFixed(3)}m, total air ${AIRTIME.toFixed(3)}s`)
console.log(`bind Hips Y (Player_Idle.glb) = 95.70 rig = 0.957 m; leg length 0.942 m\n`)

// window played, in CLIP seconds: [start, end]
const WINDOW = {
  jump: [0, RISE],                    // plays while vy>0, timeScale 1, LoopRepeat
  falling: [0, RISE],                 // plays while vy<=0, timeScale 1
  jumpattack: [11 / 30, 30 / 30],     // ATTACK_TRIM window, timeScale 1.8
}

const STAND = 95.70 // rig units — Player_Idle.glb bind Hips Y

for (const [name, [a, b]] of Object.entries(WINDOW)) {
  const gltf = await parse(readFileSync(join(dir, `${name}.glb`)))
  const src = gltf.animations.find((x) => x.tracks.length) ?? gltf.animations[0]
  const clip = src.clone()
  for (const t of clip.tracks) t.name = norm(t.name)
  const tr = clip.tracks.find((t) => /Hips\.position$/.test(t.name))
  const times = tr.times, v = tr.values
  const inWin = []
  for (let i = 0; i < times.length; i++) if (times[i] >= a - 1e-6 && times[i] <= b + 1e-6) inWin.push({ t: times[i], y: v[i * 3 + 1] })
  const ys = inWin.map((k) => k.y)
  const base = ys[0]
  const min = Math.min(...ys), max = Math.max(...ys)
  console.log(`--- ${name}  window ${a.toFixed(3)}..${b.toFixed(3)}s of a ${clip.duration.toFixed(3)}s clip (${inWin.length} keys in window) ---`)
  console.log(`  raw Y      : ${min.toFixed(1)}..${max.toFixed(1)} rig  (${(min * S).toFixed(3)}..${(max * S).toFixed(3)} m)`)
  console.log(`  baseline   : first key ${base.toFixed(1)} rig = ${(base * S).toFixed(3)} m`)
  console.log(`  RESIDUAL (y - baseline, i.e. what a per-clip re-basing keeps):`)
  console.log(`    ${((min - base) * S).toFixed(3)} .. ${((max - base) * S).toFixed(3)} m   (dip ${((base - min) * S).toFixed(3)} m, lift ${((max - base) * S).toFixed(3)} m)`)
  console.log(`  if instead re-based onto bind height ${STAND} rig: hips would sit ${(((base - STAND)) * S).toFixed(3)} m off the standing pose at t=0`)
  console.log(`  DOUBLE-STACK risk (clip lift + sim apex ${APEX.toFixed(3)} m) = ${(((max - base) * S) + APEX).toFixed(3)} m total rise\n`)
}
