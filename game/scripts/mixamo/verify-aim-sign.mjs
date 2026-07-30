// Which way does a POSITIVE Rx premultiply on the spine chain pitch the body?
// Loads the real player rig, applies exactly the game's aim composition, and
// reports whether the head goes down (bow forward) or up (arch back). Settles
// the AIM sign question with measurement instead of guessing.
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
// idle.glb: animation-only export, same mixamorig skeleton as the bodies, and
// parses headless (the textured body GLB stalls on image decode without a DOM).
const buf = readFileSync(join(here, '..', '..', 'public', 'models', '_mixamo_glb', 'idle.glb'))
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej))

const root = gltf.scene
const bones = []
let head = null
root.traverse((o) => {
  const n = o.name.replace(/^mixamorig\d*/, '')
  if (/^Spine[12]?$/.test(n)) bones.push(o)
  if (/^Head$/.test(n)) head = o
})
if (!head || bones.length === 0) {
  console.log('missing bones: spine=' + bones.length + ' head=' + !!head)
  process.exit(1)
}
root.updateMatrixWorld(true)
const wp = (o) => {
  const e = o.matrixWorld.elements
  return [e[12], e[13], e[14]]
}
const before = wp(head)
const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.1)
for (const b of bones) b.quaternion.copy(q.clone().multiply(b.quaternion))
root.updateMatrixWorld(true)
const after = wp(head)
console.log('spine bones: ' + bones.length)
console.log('head dy=' + (after[1] - before[1]).toFixed(2) + '  dz=' + (after[2] - before[2]).toFixed(2))
console.log(after[1] < before[1] ? 'Rx(+) = BOW FORWARD / DOWN' : 'Rx(+) = ARCH BACK / UP')
