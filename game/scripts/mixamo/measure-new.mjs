// Measure the freshly imported clips so their ATTACK_TRIM windows, playback
// rates and stride speeds are DERIVED, not guessed. Three questions:
//   1. attacks  → where does each strike actually connect? (peaks, not one max)
//   2. combo    → how many distinct hits, and at what times?
//   3. walks    → what ground speed is baked into the stride? (foot-slide fix)
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
const loader = new GLTFLoader()
const parse = (buf) => new Promise((res, rej) => {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  loader.parse(ab, '', res, rej)
})
const findBone = (root, suffix) => {
  let hit = null
  root.traverse((o) => {
    if (o.name.replace(/^mixamorig\d*/, '').toLowerCase() === suffix.toLowerCase()) hit = o
  })
  return hit
}
const FPS = 30 // Mixamo export rate (SOURCE_FPS in AnimatedFighter)

async function load(slot) {
  const gltf = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const clip = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  return { root: gltf.scene, clip, mixer: new THREE.AnimationMixer(gltf.scene) }
}

// ── attacks: contact = peak SPEED of the striking limb ─────────────────────
// NOT distance-from-hips, which was the first thing I tried and is wrong twice
// over: (a) it is rotation-invariant, so a hurricane kick — where the whole body
// spins and the foot merely orbits — reads as a dead constant; (b) legs are
// longer than arms, so the "furthest limb" is always a foot, which made the
// known-good jab clip report no contact at all. Peak speed works for punches,
// kicks and spins alike, and is where the impact actually is.
async function attack(slot, THRESH = 0.5, profile = false) {
  const { root, clip, mixer } = await load(slot)
  const names = ['RightHand', 'LeftHand', 'RightFoot', 'LeftFoot', 'RightForeArm', 'RightLeg']
  const limbs = names.map((n) => [n, findBone(root, n)]).filter(([, b]) => b)
  mixer.clipAction(clip).play()
  const F = Math.round(clip.duration * FPS)
  const pos = {}
  for (const [n] of limbs) pos[n] = []
  for (let f = 0; f <= F; f++) {
    mixer.setTime(Math.min(f / FPS, clip.duration - 1e-4))
    root.updateMatrixWorld(true)
    for (const [n, b] of limbs) {
      const p = new THREE.Vector3(); b.getWorldPosition(p)
      pos[n].push(p)
    }
  }
  const speed = {}
  for (const [n] of limbs) {
    speed[n] = pos[n].map((p, i) => (i === 0 ? 0 : p.distanceTo(pos[n][i - 1]) * FPS))
  }
  let lead = null, leadMax = 0
  for (const [n] of limbs) {
    const m = Math.max(...speed[n])
    if (m > leadMax) { leadMax = m; lead = n }
  }
  const s = speed[lead]
  const peaks = []
  for (let i = 2; i < s.length - 2; i++) {
    if (s[i] >= s[i - 1] && s[i] >= s[i + 1] && s[i] > leadMax * THRESH) {
      if (!peaks.length || i - peaks[peaks.length - 1] > 5) peaks.push(i)
      else if (s[i] > s[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i
    }
  }
  console.log(`\n${slot.toUpperCase()}  ${clip.duration.toFixed(3)}s  ${F} frames @${FPS}fps  striking limb: ${lead} (peak ${leadMax.toFixed(0)} u/s)`)
  peaks.forEach((p) => console.log(`    contact f${String(p).padStart(3)}  t=${(p / FPS).toFixed(3)}s  speed=${s[p].toFixed(0)}`))
  if (profile) {
    console.log('    profile (speed per 5 frames, bar = 1/40th of peak):')
    for (let i = 0; i < s.length; i += 5) {
      const v = s[i] / leadMax
      console.log(`      f${String(i).padStart(3)} ${'#'.repeat(Math.round(v * 40))}`)
    }
  }
  return { slot, duration: clip.duration, frames: F, lead, peaks }
}

// ── walks: ground speed baked into the stride ──────────────────────────────
async function walk(slot) {
  const gltf = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const clip = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  // root motion is stripped from the GLB, so recover stride from FOOT travel:
  // over one loop a planted foot moves backward through the body by exactly the
  // ground the stride covers.
  const root = gltf.scene
  const mixer = new THREE.AnimationMixer(root)
  mixer.clipAction(clip).play()
  const hips = findBone(root, 'Hips')
  const feet = [findBone(root, 'LeftFoot'), findBone(root, 'RightFoot')]
  const F = Math.round(clip.duration * FPS)
  let minZ = Infinity, maxZ = -Infinity
  for (let f = 0; f <= F; f++) {
    mixer.setTime((f / FPS) % clip.duration)
    root.updateMatrixWorld(true)
    const h = new THREE.Vector3(); hips.getWorldPosition(h)
    for (const b of feet) {
      if (!b) continue
      const p = new THREE.Vector3(); b.getWorldPosition(p)
      const rel = p.z - h.z
      minZ = Math.min(minZ, rel); maxZ = Math.max(maxZ, rel)
    }
  }
  // Mixamo units are cm; CHAR_SCALE maps 100u -> 1m. One full cycle = 2 strides.
  const strideM = ((maxZ - minZ) / 100) * 2
  const speed = strideM / clip.duration
  // LOOPABILITY: a one-shot "step" clip restarts visibly when held down. Compare
  // the first and last pose across every animated bone.
  const poseAt = (t) => {
    mixer.setTime(t); root.updateMatrixWorld(true)
    const out = []
    root.traverse((o) => { if (o.isObject3D) out.push(o.position.clone(), o.quaternion.clone()) })
    return out
  }
  const a = poseAt(0)
  const b = poseAt(clip.duration - 1e-4)
  let drift = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i].isVector3) drift += a[i].distanceTo(b[i])
    else drift += 1 - Math.abs(a[i].dot(b[i]))
  }
  console.log(`\n${slot.toUpperCase()}  ${clip.duration.toFixed(3)}s  ${F} frames`)
  console.log(`  foot travel ${(maxZ-minZ).toFixed(1)}u -> stride ${strideM.toFixed(3)}m/cycle -> ${speed.toFixed(2)} m/s`)
  // Report PER-BONE drift and always alongside a known-looping control, because
  // an absolute threshold on a summed figure means nothing.
  console.log(`  loop seam drift: ${(drift / (a.length / 2)).toFixed(4)} per bone (sum ${drift.toFixed(1)} over ${a.length / 2} bones)`)
  return { slot, speed, drift }
}

await attack('combo', 0.28, true)
await attack('throw', 0.5)
await attack('jab')   // CONTROL: known-good, contact must land inside ATTACK_TRIM [11,26]
console.log('\n── loop seams (idle + walk are the CONTROLS: both are known loops) ──')
await walk('idle')
await walk('walk')
await walk('walkback')
