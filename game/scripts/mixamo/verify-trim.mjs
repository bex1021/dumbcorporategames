// Verify ATTACK_TRIM: does each trimmed clip actually CONTAIN the strike?
// Loads the GLB, applies the same AnimationUtils.subclip the game applies, and
// measures how far the striking limb travels from the hips inside the trim.
// A big excursion = a visible strike. A flat curve = the trim missed the punch.
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

const SOURCE_FPS = 30
// must mirror AnimatedFighter.tsx
// KEEP IN SYNC with AnimatedFighter's ATTACK_TRIM. This table went stale once
// already and happily reported PASS on values the game no longer used.
const ATTACK_TRIM = {
  jab: [11, 26, 1.09],
  heavy: [18, 43, 1.0],
  hurricane: [16, 76, 2.2],
  grab: [27, 48, 1.33],
  jumpattack: [40, 58, 1.8],
  combo: [24, 145, 1.7],
}
const LIMB = { jab: 'LeftHand', heavy: 'RightFoot', hurricane: 'LeftFoot', grab: 'RightHand', jumpattack: 'RightHand', combo: 'LeftHand' }
// Distance-from-hips is DEGENERATE for a spinning strike — the limb orbits at a
// constant radius, so the excursion reads 0.000m and the percentage check is
// meaningless. These two are verified by peak limb SPEED instead
// (scripts/mixamo/measure-new.mjs); here we only check that they fit the window.
// Only the hurricane kick is a true spin. The combo is an uppercut now, so it
// gets held to the full excursion assertion rather than the exemption.
// crescent kick EXTENDS (unlike the old orbit-spin), so it takes the full
// excursion assertion again
const SPIN = new Set([])
// gameplay window (startup+active+recovery frames @60) from frameData.ts
const WINDOW60 = { jab: 11 + 3 + 13, heavy: 20 + 4 + 24, hurricane: 22 + 6 + 27, grab: 12 + 5 + 22, jumpattack: 11 + 10 + 4, combo: 14 + 104 + 26 }
// jumpattack is an OVERHEAD SLAM: "distance from hips" peaks on the ARCH (arms
// overhead), not the strike — that metric is exactly what mis-placed the old
// contact. For it, measure VERTICAL hand travel (y range) instead.
const VERTICAL_METRIC = new Set(['jumpattack'])

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })
const find = (root, suffix) => {
  let hit = null
  root.traverse((o) => {
    if (o.name.replace(/^mixamorig\d*/, '').toLowerCase() === suffix.toLowerCase()) hit = o
  })
  return hit
}

let pass = 0
for (const [slot, trim] of Object.entries(ATTACK_TRIM)) {
  const gltf = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const root = gltf.scene
  const src = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  const hips = find(root, 'Hips')
  const limb = find(root, LIMB[slot])
  if (!src || !hips || !limb) {
    console.log(`${slot.padEnd(11)} SKIP (missing data)`)
    continue
  }

  const vertical = VERTICAL_METRIC.has(slot)
  const measure = (clip) => {
    const mixer = new THREE.AnimationMixer(root)
    const a = mixer.clipAction(clip)
    a.play()
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i <= 60; i++) {
      mixer.setTime((i / 60) * clip.duration)
      root.updateMatrixWorld(true)
      const p = new THREE.Vector3()
      const q = new THREE.Vector3()
      hips.getWorldPosition(p)
      limb.getWorldPosition(q)
      const d = vertical ? q.y - p.y : p.distanceTo(q)
      if (d < min) min = d
      if (d > max) max = d
    }
    mixer.stopAllAction()
    return max - min
  }

  const fullRange = measure(src)
  const cut = THREE.AnimationUtils.subclip(src, slot, trim[0], trim[1], SOURCE_FPS)
  const cutRange = measure(cut)

  const wallSec = cut.duration / trim[2]
  const windowSec = WINDOW60[slot] / 60
  const kept = ((cutRange / fullRange) * 100).toFixed(0)
  // A spinning strike has no radial excursion to measure, so for those the only
  // meaningful assertion here is that the clip fits its gameplay window. Their
  // contact frames are verified by peak limb speed in measure-new.mjs.
  const fits = wallSec <= windowSec * 1.15
  const ok = SPIN.has(slot) ? fits : cutRange > fullRange * 0.6 && fits
  if (ok) pass++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${slot.padEnd(11)} ` +
      `${SPIN.has(slot) ? 'spin — excursion N/A' : `strike excursion kept ${kept}%`} (${cutRange.toFixed(3)}m of ${fullRange.toFixed(3)}m full)  ` +
      `| clip ${cut.duration.toFixed(3)}s @${trim[2]}x = ${wallSec.toFixed(3)}s vs window ${windowSec.toFixed(3)}s`,
  )
}
console.log(`\n${pass}/${Object.keys(ATTACK_TRIM).length} trims contain the strike and fit their window.`)
