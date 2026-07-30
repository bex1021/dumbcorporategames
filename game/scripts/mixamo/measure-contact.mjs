// Find the CONTACT frame of each attack clip: the moment the striking limb is
// furthest from the body (fist/foot fully extended). We retime clips so this
// moment lands on the gameplay "active" frames — the fix for strikes that play
// too fast to see. Output: for each clip, the contact as a FRACTION of the clip
// (0 = start, 1 = end) and its natural length.
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

// striking limb per attack clip (Mixamo bone names, post-normalize prefix)
const LIMB = {
  jab: 'RightHand',
  heavy: 'RightFoot', // Roundhouse Kick
  throw: 'RightHand',
  jumpattack: 'RightHand',
}

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })

function findBone(root, suffix) {
  let hit = null
  root.traverse((o) => {
    // exported joints come through as plain Object3D (isBone false), so match
    // on the normalized name only.
    if (o.name.replace(/^mixamorig\d*/, '').toLowerCase() === suffix.toLowerCase()) hit = o
  })
  return hit
}

for (const [slot, limbName] of Object.entries(LIMB)) {
  const buf = readFileSync(join(dir, `${slot}.glb`))
  const gltf = await parse(buf)
  const root = gltf.scene
  const clip = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  const hips = findBone(root, 'Hips')
  const limb = findBone(root, limbName)
  if (!clip || !hips || !limb) {
    console.log(`${slot.padEnd(11)} — missing ${!clip ? 'clip' : !hips ? 'hips' : limbName}`)
    continue
  }
  const mixer = new THREE.AnimationMixer(root)
  const action = mixer.clipAction(clip)
  action.play()

  const N = 120
  let best = 0
  let bestF = 0
  for (let i = 0; i <= N; i++) {
    const f = i / N
    mixer.setTime(f * clip.duration)
    root.updateMatrixWorld(true)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    hips.getWorldPosition(a)
    limb.getWorldPosition(b)
    const reach = a.distanceTo(b)
    if (reach > best) {
      best = reach
      bestF = f
    }
  }
  console.log(
    `${slot.padEnd(11)} contact @ ${(bestF * 100).toFixed(0)}% of clip  ` +
      `(${(bestF * clip.duration).toFixed(2)}s of ${clip.duration.toFixed(2)}s, limb=${limbName})`,
  )
}
