// BUG 2 PART 3: is `b.rotation.x += ...` even a coherent operation on a bone
// the mixer drives with a .quaternion track?
//
// three keeps Object3D.rotation and .quaternion in sync via onChange callbacks,
// so the read-back is "live". BUT Euler.setFromQuaternion(q,'XYZ') always
// returns y in [-90deg, +90deg]; near |y| = 90deg the x/z extraction is
// ill-conditioned and a tiny quaternion change swings x by up to 180deg.
// Measure the spine's extracted Euler across each attack clip.
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
const ATTACK_TRIM = { jab: [11, 26, 1.09], heavy: [18, 43, 1.0], throw: [27, 48, 1.33], jumpattack: [11, 30, 1.8] }
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')
const loader = new GLTFLoader()
const parse = (b) =>
  new Promise((res, rej) => loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej))
const deg = (r) => (r * 180) / Math.PI

for (const [slot, trim] of Object.entries(ATTACK_TRIM)) {
  const gltf = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const root = gltf.scene
  root.traverse((o) => {
    if (o.name) o.name = norm(o.name)
  })
  const spine = []
  root.traverse((o) => {
    if (/^mixamorigSpine[12]?$/.test(o.name)) spine.push(o)
  })
  const src = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  const c = src.clone()
  c.tracks.forEach((t) => (t.name = norm(t.name)))
  const cut = THREE.AnimationUtils.subclip(c, slot, trim[0], trim[1], 30)
  const mixer = new THREE.AnimationMixer(root)
  mixer.clipAction(cut).play()

  const stats = spine.map(() => ({ maxAbsY: 0, maxJumpX: 0, prevX: null }))
  for (let i = 0; i <= 60; i++) {
    mixer.setTime((i / 60) * cut.duration)
    for (let k = 0; k < spine.length; k++) {
      const e = new THREE.Euler().setFromQuaternion(spine[k].quaternion, 'XYZ')
      const s = stats[k]
      s.maxAbsY = Math.max(s.maxAbsY, Math.abs(deg(e.y)))
      if (s.prevX !== null) s.maxJumpX = Math.max(s.maxJumpX, Math.abs(deg(e.x) - s.prevX))
      s.prevX = deg(e.x)
    }
  }
  console.log(slot.toUpperCase())
  spine.forEach((b, k) =>
    console.log(
      `  ${b.name.padEnd(20)} max |euler.y| ${stats[k].maxAbsY.toFixed(1).padStart(6)}deg ` +
        `(gimbal at 90)   max frame-to-frame |d euler.x| ${stats[k].maxJumpX.toFixed(1)}deg`,
    ),
  )
}
