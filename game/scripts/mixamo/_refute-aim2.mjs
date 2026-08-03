// v2: instrument REAL spine setValue calls per frame across a whole move.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const imageStub = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, setAttribute() {}, set src(_) {} })
globalThis.self ??= globalThis
globalThis.window ??= globalThis
globalThis.document ??= { createElementNS: () => ({ style: {}, ...imageStub() }), createElement: () => ({ getContext: () => null, ...imageStub() }) }

const dir = '/Users/rebeccaleung/blocked/game/public/models/_mixamo_glb'
const SOURCE_FPS = 30
const ATTACK_TRIM = { jab: [11, 26, 1.09], heavy: [18, 43, 1.0], throw: [27, 48, 1.33], jumpattack: [11, 30, 1.8] }
const AIRBORNE = new Set(['jump', 'falling', 'jumpattack'])
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')
const loader = new GLTFLoader()
const parse = (b) => new Promise((res, rej) => loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej))
function gameClip(gltf, name) {
  const src = gltf.animations.find((a) => a.tracks.length > 0) ?? gltf.animations[0]
  const clip = src.clone()
  clip.name = name
  const air = AIRBORNE.has(name)
  clip.tracks = clip.tracks.map((t) => {
    t.name = norm(t.name)
    if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = 0; if (air) v[i + 1] = 0; v[i + 2] = 0 } }
    return t
  })
  const trim = ATTACK_TRIM[name]
  if (!trim) return clip
  const cut = THREE.AnimationUtils.subclip(clip, name, trim[0], trim[1], SOURCE_FPS); cut.name = name; return cut
}
const NAMES = ['idle', 'jab', 'heavy', 'throw', 'jumpattack', 'jump', 'falling']
const clips = {}
for (const n of NAMES) clips[n] = gameClip(await parse(readFileSync(join(dir, `${n}.glb`))), n)
const bodyG = await parse(readFileSync(join(dir, 'idle.glb')))
function makeRig() {
  const root = bodyG.scene.clone(true)
  root.traverse((o) => { if (o.name) o.name = norm(o.name) })
  const spine = []
  root.traverse((o) => { if (/^mixamorigSpine[12]?$/.test(o.name)) spine.push(o) })
  return { root, spine }
}

function run({ clipName, startup, active, recovery, hitstopAt, hitstopLen, freeze, label }) {
  const { root, spine } = makeRig()
  const mixer = new THREE.AnimationMixer(root)
  const idle = mixer.clipAction(clips.idle); idle.play()
  const act = mixer.clipAction(clips[clipName])
  act.setLoop(THREE.LoopOnce, Infinity); act.clampWhenFinished = true
  act.timeScale = ATTACK_TRIM[clipName]?.[2] ?? 1
  const fade = Math.min(0.12, (startup / 60) * 0.5)
  idle.fadeOut(fade); act.reset().fadeIn(fade).play()
  // instrument
  let frameWrites = 0
  for (const pm of mixer._bindings) {
    if (pm.binding.parsedPath?.propertyName === 'quaternion' && /^mixamorigSpine[12]?$/.test(pm.binding.node?.name ?? '')) {
      const orig = pm.binding.setValue.bind(pm.binding)
      pm.binding.setValue = (...a) => { frameWrites++; return orig(...a) }
    }
  }
  const total = startup + active + recovery
  let simFrame = 0, hitstop = 0, rf = 0, run0 = 0, maxRun = 0
  const marks = []
  while (simFrame < total && rf < 400) {
    rf++
    mixer.timeScale = hitstop > 0 && freeze ? 0 : 1
    frameWrites = 0
    mixer.update(1 / 60)
    if (frameWrites === 0) { run0++; if (run0 > maxRun) maxRun = run0 } else run0 = 0
    marks.push(frameWrites === 0 ? (hitstop > 0 ? 'H' : '.') : '#')
    if (hitstop > 0) { hitstop--; continue }
    simFrame++
    if (simFrame === hitstopAt) hitstop = hitstopLen
  }
  console.log(`   ${label.padEnd(42)} renderFrames=${String(rf).padStart(3)} longestStaticRun=${String(maxRun).padStart(3)}  ${marks.join('')}`)
  return maxRun
}
console.log('legend: # = mixer wrote the spine this frame,  . = static (no write),  H = static during hitstop\n')
console.log('HEAVY (20/4/24, hitstop 11 at f21), clip = 50 render frames')
const a1 = run({ clipName: 'heavy', startup: 20, active: 4, recovery: 24, hitstopAt: 21, hitstopLen: 11, freeze: true, label: 'CURRENT (freeze on hit)' })
const a2 = run({ clipName: 'heavy', startup: 20, active: 4, recovery: 24, hitstopAt: 21, hitstopLen: 11, freeze: false, label: 'PRE-CHANGE-5 (mixer runs in hitstop)' })
const a3 = run({ clipName: 'heavy', startup: 20, active: 4, recovery: 24, hitstopAt: 999, hitstopLen: 0, freeze: true, label: 'WHIFF (no hitstop)' })
console.log('\nTHROW (12/5/22, hitstop 7 at f13), clip = 28.6 render frames')
const b1 = run({ clipName: 'throw', startup: 12, active: 5, recovery: 22, hitstopAt: 13, hitstopLen: 7, freeze: true, label: 'CURRENT (freeze on hit)' })
const b2 = run({ clipName: 'throw', startup: 12, active: 5, recovery: 22, hitstopAt: 13, hitstopLen: 7, freeze: false, label: 'PRE-CHANGE-5' })
const b3 = run({ clipName: 'throw', startup: 12, active: 5, recovery: 22, hitstopAt: 999, hitstopLen: 0, freeze: true, label: 'WHIFF (no hitstop)' })
console.log('\nJAB (11/3/13, hitstop 5 at f12), clip = 25.7 render frames')
run({ clipName: 'jab', startup: 11, active: 3, recovery: 13, hitstopAt: 12, hitstopLen: 5, freeze: true, label: 'CURRENT (freeze on hit)' })
run({ clipName: 'jab', startup: 11, active: 3, recovery: 13, hitstopAt: 12, hitstopLen: 5, freeze: false, label: 'PRE-CHANGE-5' })
run({ clipName: 'jab', startup: 11, active: 3, recovery: 13, hitstopAt: 999, hitstopLen: 0, freeze: true, label: 'WHIFF (no hitstop)' })

const AIM = (dy, dx, n = 3) => Math.max(-0.5, Math.min(0.5, Math.atan2(dy, Math.max(0.5, dx)) * 0.8)) / n
console.log('\nAIM step per bone per frame:')
for (const [k, v] of Object.entries({
  'vs Brent/Priya grounded (scale 1.0)': AIM(0, 1.1),
  'vs Exec grounded (scale 1.28), dx 1.14': AIM(1.75 * 0.28 * 0.72, 1.14),
  'Leonard airborne apex 0.8 vs grounded foe': AIM(-0.8, 1.0),
})) console.log(`   ${k.padEnd(45)} ${((v * 180) / Math.PI).toFixed(2)} deg/frame/bone  (chain x3 = ${((v * 3 * 180) / Math.PI).toFixed(2)} deg/frame)`)
console.log('\nTorso chain drift = longestStaticRun x 3 x step:')
console.log(`   heavy vs Exec, CURRENT      ${(a1 * 3 * AIM(1.75*0.28*0.72,1.14) * 180 / Math.PI).toFixed(0)} deg`)
console.log(`   heavy vs Exec, PRE-CHANGE-5 ${(a2 * 3 * AIM(1.75*0.28*0.72,1.14) * 180 / Math.PI).toFixed(0)} deg`)
console.log(`   heavy vs Exec, WHIFF        ${(a3 * 3 * AIM(1.75*0.28*0.72,1.14) * 180 / Math.PI).toFixed(0)} deg`)
console.log(`   throw vs Exec, CURRENT      ${(b1 * 3 * AIM(1.75*0.28*0.72,1.04) * 180 / Math.PI).toFixed(0)} deg`)
console.log(`   throw vs Exec, PRE-CHANGE-5 ${(b2 * 3 * AIM(1.75*0.28*0.72,1.04) * 180 / Math.PI).toFixed(0)} deg`)
console.log(`   throw vs Exec, WHIFF        ${(b3 * 3 * AIM(1.75*0.28*0.72,1.04) * 180 / Math.PI).toFixed(0)} deg`)
