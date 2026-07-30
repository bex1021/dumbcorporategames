// Reproduce the SHIPPED render path headlessly and measure where the body
// actually is during a jump, with and without the AIRBORNE hip-Y zeroing.
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const imageStub = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, setAttribute() {}, set src(_) {} })
globalThis.self ??= globalThis
globalThis.window ??= globalThis
globalThis.document ??= {
  createElementNS: () => ({ style: {}, ...imageStub() }),
  createElement: () => ({ getContext: () => null, ...imageStub() }),
}

const ROOT = '/Users/rebeccaleung/blocked/game/public/models'
const norm = (s) => (s ? s.replace(/^mixamorig\d+/, 'mixamorig') : s)

function glbJson(path) {
  const buf = readFileSync(path)
  let off = 12
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    if (type === 0x4e4f534a) return JSON.parse(buf.toString('utf8', off + 8, off + 8 + len))
    off += 8 + len
  }
  throw new Error('no JSON chunk')
}
function buildRig(path) {
  const j = glbJson(path)
  const objs = j.nodes.map((n) => {
    const o = new THREE.Object3D()
    o.name = norm(n.name ?? '')
    if (n.translation) o.position.fromArray(n.translation)
    if (n.rotation) o.quaternion.fromArray(n.rotation)
    if (n.scale) o.scale.fromArray(n.scale)
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale)
    return o
  })
  j.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => objs[i].add(objs[c])))
  const scene = new THREE.Object3D()
  objs.filter((o) => !o.parent).forEach((r) => scene.add(r))
  return scene
}

const loader = new GLTFLoader()
const parse = (p) => new Promise((res, rej) => {
  const b = readFileSync(p)
  loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)
})

const IMPULSE = 4.6, GRAVITY = 13.2, FRAME = 1 / 60
const CHAR_SCALE = 0.01
const clipG = await parse(`${ROOT}/_mixamo_glb/jump.glb`)

function buildClip(zeroY) {
  const src = clipG.animations.find((a) => a.tracks.length > 0) ?? clipG.animations[0]
  const clip = src.clone()
  clip.name = 'jump'
  clip.tracks = clip.tracks.map((t) => {
    t.name = norm(t.name)
    if (/Hips\.position$/.test(t.name)) {
      const v = t.values
      for (let i = 0; i < v.length; i += 3) {
        v[i] = 0
        if (zeroY) v[i + 1] = 0
        v[i + 2] = 0
      }
    }
    return t
  })
  return clip
}

function makeRig() {
  const c = buildRig(`${ROOT}/Player_Idle.glb`)
  const outer = new THREE.Group()
  const inner = new THREE.Group()
  inner.scale.setScalar(CHAR_SCALE)
  inner.add(c)
  outer.add(inner)
  return { outer, inner, c }
}
const boneY = (root, name) => {
  let b = null
  root.traverse((o) => { if (o.name === name) b = o })
  return b ? b.getWorldPosition(new THREE.Vector3()).y : NaN
}
const lowest = (root) => {
  let lo = Infinity, who = ''
  root.traverse((o) => {
    if (!/^mixamorig/.test(o.name)) return
    const y = o.getWorldPosition(new THREE.Vector3()).y
    if (y < lo) { lo = y; who = o.name }
  })
  return [lo, who]
}

{
  const { outer, c } = makeRig()
  outer.updateMatrixWorld(true)
  const [lo, who] = lowest(c)
  console.log(`BIND POSE (outer y=0): hips=${boneY(c, 'mixamorigHips').toFixed(3)} head=${boneY(c, 'mixamorigHead').toFixed(3)} lToe=${boneY(c, 'mixamorigLeftToeBase').toFixed(3)} lowest=${lo.toFixed(3)} (${who})`)
}

for (const zeroY of [false, true]) {
  const { outer, inner, c } = makeRig()
  const mixer = new THREE.AnimationMixer(inner)
  const a = mixer.clipAction(buildClip(zeroY))
  a.setLoop(THREE.LoopRepeat, Infinity)
  a.play()
  console.log(`\n===== AIRBORNE hip-Y zeroing = ${zeroY} (${zeroY ? 'SHIPPED' : 'PREVIOUS'}) =====`)
  let y = 0, vy = IMPULSE, t = 0
  for (let f = 0; f < 25; f++) {
    y += vy * FRAME
    vy -= GRAVITY * FRAME
    if (y <= 0) break
    t += FRAME
    mixer.setTime(t)
    outer.position.set(0, y, 0)
    outer.updateMatrixWorld(true)
    if (f % 4 !== 0 && f !== 20) continue
    const [lo, who] = lowest(c)
    console.log(`f${String(f).padStart(2)} t=${t.toFixed(3)} simY=${y.toFixed(3)}  hips=${boneY(c, 'mixamorigHips').toFixed(3)}  head=${boneY(c, 'mixamorigHead').toFixed(3)}  lToe=${boneY(c, 'mixamorigLeftToeBase').toFixed(3)}  lowest=${lo.toFixed(3)} (${who})`)
  }
}
