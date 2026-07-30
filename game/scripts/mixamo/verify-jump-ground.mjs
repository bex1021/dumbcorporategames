// Verify the airborne hip re-base: simulate the real 60Hz jump arc with the real
// clip swap and assert NO frame puts a foot below the floor, and that the apex
// head is HIGHER than the standing head (i.e. the hop reads as going up).
// Mirrors the normalisation in AnimatedFighter.tsx useFightClips.
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

const CHAR_SCALE = 0.01
const STAND_HIP_Y = 95.7
const AIR_LIFT_KEEP = 0
const AIRBORNE = new Set(['jump', 'falling', 'jumpattack'])
const AIR_HIP_LOCK = new Set(['jumpattack']) // mirrors AnimatedFighter
const ATTACK_TRIM = { jumpattack: [40, 58] }
// JUMP physics from fightConfig
const IMPULSE = 4.6
const GRAVITY = 13.2
const FRAME = 1 / 60

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')

function normalise(clip, name) {
  for (const t of clip.tracks) {
    t.name = norm(t.name)
    if (!/Hips\.position$/.test(t.name)) continue
    const v = t.values
    if (v.length < 3) continue
    const airborne = AIRBORNE.has(name)
    const lockHips = AIR_HIP_LOCK.has(name)
    const baseY = v[1]
    for (let j = 0; j < v.length; j += 3) {
      v[j] = 0
      v[j + 2] = 0
      if (!airborne) continue
      if (lockHips) {
        v[j + 1] = STAND_HIP_Y
        continue
      }
      let r = v[j + 1] - baseY
      if (r > 0) r *= AIR_LIFT_KEEP
      v[j + 1] = STAND_HIP_Y + r
    }
  }
  return clip
}

const load = async (slot) => {
  const gltf = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const src = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  let clip = src.clone()
  clip.name = slot
  for (const t of clip.tracks) t.name = norm(t.name)
  const trim = ATTACK_TRIM[slot]
  if (trim) {
    clip = THREE.AnimationUtils.subclip(clip, slot, trim[0], trim[1], 30)
    clip.name = slot
  }
  return { root: gltf.scene, clip: normalise(clip, slot) }
}

const jump = await load('jump')
const falling = await load('falling')

function lowestFootAndHead(root) {
  root.updateMatrixWorld(true)
  let lowest = Infinity
  let head = -Infinity
  root.traverse((o) => {
    const n = o.name.replace(/^mixamorig\d*/, '')
    if (/Toe|Foot/.test(n)) {
      const p = new THREE.Vector3()
      o.getWorldPosition(p)
      if (p.y < lowest) lowest = p.y
    }
    if (/^Head$/.test(n)) {
      const p = new THREE.Vector3()
      o.getWorldPosition(p)
      head = p.y
    }
  })
  return { lowest: lowest * CHAR_SCALE, head: head * CHAR_SCALE }
}

// standing reference from the jump rig at t=0
const mJump = new THREE.AnimationMixer(jump.root)
mJump.clipAction(jump.clip).play()
mJump.setTime(0)
const stand = lowestFootAndHead(jump.root)

let y = 0
let vy = IMPULSE
let t = 0
let minFoot = Infinity
let maxHead = -Infinity
let below = 0
let frames = 0
while (y > 0 || frames === 0) {
  const rising = vy > 0
  const src = rising ? jump : falling
  const mixer = new THREE.AnimationMixer(src.root)
  mixer.clipAction(src.clip).play()
  mixer.setTime(Math.min(t, src.clip.duration))
  const { lowest, head } = lowestFootAndHead(src.root)
  const footWorld = lowest + y
  const headWorld = head + y
  if (footWorld < -0.005) below++
  if (footWorld < minFoot) minFoot = footWorld
  if (headWorld > maxHead) maxHead = headWorld
  y += vy * FRAME
  vy -= GRAVITY * FRAME
  t += FRAME
  frames++
  if (frames > 200) break
}

console.log(`standing: lowest foot ${stand.lowest.toFixed(3)}m, head ${stand.head.toFixed(3)}m`)
console.log(`airborne frames simulated: ${frames}`)
console.log(`frames with a foot below the floor: ${below}   (min foot ${minFoot.toFixed(3)}m)`)
console.log(`apex head ${maxHead.toFixed(3)}m vs standing head ${stand.head.toFixed(3)}m`)
const ok = below === 0 && maxHead > stand.head
console.log(`\n${ok ? 'PASS' : 'FAIL'} — ${ok ? 'feet stay on/above the floor and the hop reads as UP' : 'still clipping through the floor or not rising'}`)
