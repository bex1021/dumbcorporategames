// BUG A PROBE — "Leonard doesn't visibly punch/kick on J/K/L".
//
// Replays AnimatedFighter.tsx's playback EXACTLY on a headless three
// AnimationMixer (LoopOnce, clampWhenFinished, the contact-alignment SEEK, the
// MAX_ATTACK_RATE cap, the fade cap, the crossfade out of idle) and measures
// the striking limb's motion RELATIVE TO HIPS across the window the attack clip
// is actually on screen: startup + active frames at 60 Hz. (From `recovery` on,
// clipFor() returns 'idle', so the attack clip is gone.)
//
// Every run is IDLE-PRE-ROLLED for 60 frames first, so the fighter starts in a
// settled fighting stance — otherwise the bind-pose to stance snap dwarfs the
// strike and every config looks identical.
//
// CONTROL: the same measurement on a fighter who just keeps idling. That is the
// numeric definition of "no visible punch".
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

// ── constants copied verbatim from AnimatedFighter.tsx ─────────────────────
const FADE = 0.12
const RETURN_FADE = 0.2
const MAX_ATTACK_RATE = 1.8
const CONTACT = { jab: 0.17, heavy: 0.38, throw: 0.58, jumpattack: 0.18 }
const AIRBORNE_CLIPS = new Set(['jump', 'falling', 'jumpattack'])
const ATTACK_CLIPS = new Set(['jab', 'heavy', 'throw', 'jumpattack'])
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')

// Leonard's moves (frameData.ts) → the clip clipFor() picks for them
const MOVES = {
  'J  clarify  (strike)':    { clip: 'jab',        startup: 11, active: 3,  recovery: 13, limb: 'RightHand' },
  'K  pushback (heavy)':     { clip: 'heavy',      startup: 20, active: 4,  recovery: 24, limb: 'RightFoot' },
  'L  offline  (throw)':     { clip: 'throw',      startup: 12, active: 5,  recovery: 22, limb: 'RightHand' },
  'air jumpIn (air strike)': { clip: 'jumpattack', startup: 6,  active: 10, recovery: 4,  limb: 'RightHand' },
}

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })
const cache = new Map()
async function loadGlb(name) {
  if (!cache.has(name)) cache.set(name, await parse(readFileSync(join(dir, `${name}.glb`))))
  return cache.get(name)
}

// EXACT copy of useFightClips()'s track surgery
function normalizeClip(gltf, name) {
  const src = gltf.animations.find((a) => a.tracks.length > 0) ?? gltf.animations[0]
  const clip = src.clone()
  clip.name = name
  const airborne = AIRBORNE_CLIPS.has(name)
  clip.tracks = clip.tracks.map((t) => {
    t.name = norm(t.name)
    if (/Hips\.position$/.test(t.name)) {
      const v = t.values
      for (let i = 0; i < v.length; i += 3) { v[i] = 0; if (airborne) v[i + 1] = 0; v[i + 2] = 0 }
    }
    return t
  })
  return clip
}

function findBone(root, suffix) {
  let hit = null
  root.traverse((o) => { if (o.name.replace(/^mixamorig\d*/, '').toLowerCase() === suffix.toLowerCase()) hit = o })
  return hit
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion()
// limb position in the HIPS' own frame, in cm (Mixamo units; ~180 cm fighter)
function sample(root, hips, limb) {
  root.updateMatrixWorld(true)
  hips.getWorldPosition(_a); limb.getWorldPosition(_b); hips.getWorldQuaternion(_q)
  return _b.clone().sub(_a).applyQuaternion(_q.clone().invert())
}

function stats(s) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  let path = 0, reachMin = Infinity, reachMax = -Infinity
  for (let i = 0; i < s.length; i++) {
    min.min(s[i]); max.max(s[i])
    const r = s[i].length(); reachMin = Math.min(reachMin, r); reachMax = Math.max(reachMax, r)
    if (i > 0) path += s[i].distanceTo(s[i - 1])
  }
  return { boxDiag: max.clone().sub(min).length(), path, reachRange: reachMax - reachMin,
           netTravel: s[s.length - 1].distanceTo(s[0]) }
}

// ── a rig + mixer + the drei-style lazy action map ─────────────────────────
async function makeRig(def) {
  const gltf = await loadGlb(def.clip)
  await loadGlb('idle')
  const root = gltf.scene.clone(true)
  root.traverse((o) => { if (o.name) o.name = norm(o.name) })
  const hips = findBone(root, 'Hips'), limb = findBone(root, def.limb)
  if (!hips || !limb) throw new Error(`missing bone ${def.limb} in ${def.clip}`)
  const mixer = new THREE.AnimationMixer(root)
  const rig = { root, hips, limb, mixer, actions: null, gltf }
  rig.build = () => {                       // == drei's useMemo([clips]) rebuild
    rig.actions = {
      idle: mixer.clipAction(normalizeClip(cache.get('idle'), 'idle'), root),
      [def.clip]: mixer.clipAction(normalizeClip(rig.gltf, def.clip), root),
    }
  }
  rig.build()
  return rig
}

// the exact block from AnimatedFighter.tsx's useFrame
function startClip(rig, def, want, fromName) {
  const next = rig.actions[want]
  let fade = want === 'idle' && ATTACK_CLIPS.has(fromName) ? RETURN_FADE : FADE
  if (ATTACK_CLIPS.has(want)) fade = Math.min(fade, (def.startup / 60) * 0.5)
  rig.actions[fromName]?.fadeOut(fade)
  next.reset()
  next.setLoop(ATTACK_CLIPS.has(want) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
  next.clampWhenFinished = ATTACK_CLIPS.has(want)
  let seek = 0, rate = 1
  if (ATTACK_CLIPS.has(want)) {
    const contactWall = Math.max(1 / 60, def.startup / 60)
    const preContact = (CONTACT[want] ?? 0.35) * next.getClip().duration
    rate = preContact / contactWall
    if (rate > MAX_ATTACK_RATE) {
      rate = MAX_ATTACK_RATE
      seek = Math.max(0, preContact - MAX_ATTACK_RATE * contactWall)
      next.time = seek
    }
    rate = Math.max(0.5, rate)
  }
  next.timeScale = rate
  next.fadeIn(fade).play()
  return { seek, rate, fade }
}

const PREROLL = 60 // frames of idle so we start from a settled fighting stance

// mode:
//  'current'    — shipped config (seek + rate cap + fade), attack runs to completion
//  'baseline'   — attack clip from t=0 at 1x, full weight
//  'idleonly'   — CONTROL: never leaves idle
//  'rerender:k' — shipped config, but a React re-render (drei clips-identity
//                 change) lands at frame k: mixer.stopAllAction() +
//                 uncacheAction(all) + fresh clips/actions + AnimatedFighter's
//                 useEffect replays idle. The component's `current` ref survives
//                 the render, so `want === current.current` and the guard
//                 `if (want !== current.current)` never restarts the attack.
async function run(def, mode) {
  const rig = await makeRig(def)
  const frames = def.startup + def.active
  rig.actions.idle.reset().play()
  for (let i = 0; i < PREROLL; i++) rig.mixer.update(1 / 60)

  let cfg = { seek: 0, rate: 1, fade: 0 }
  const rerenderAt = mode.startsWith('rerender:') ? +mode.split(':')[1] : -1

  if (mode === 'current' || rerenderAt >= 0) cfg = startClip(rig, def, def.clip, 'idle')
  else if (mode === 'baseline') {
    const a = rig.actions[def.clip]
    a.reset(); a.setLoop(THREE.LoopOnce, Infinity); a.clampWhenFinished = true
    a.timeScale = 1; a.setEffectiveWeight(1); a.play()
    rig.actions.idle.stop()
  }

  const out = [sample(rig.root, rig.hips, rig.limb).clone()]
  for (let f = 0; f < frames; f++) {
    if (f === rerenderAt) {
      rig.mixer.stopAllAction()
      for (const a of Object.values(rig.actions)) rig.mixer.uncacheAction(a, rig.root)
      rig.build()
      rig.actions.idle.reset().play()      // AnimatedFighter's useEffect([actions])
    }
    rig.mixer.update(1 / 60)
    out.push(sample(rig.root, rig.hips, rig.limb).clone())
  }
  return { s: stats(out), cfg, frames }
}

const p = (n, w = 6) => n.toFixed(1).padStart(w)

console.log('All figures: striking limb, measured in the HIPS frame, centimetres.')
console.log('Window = startup+active frames @60Hz (the only time the attack clip is on screen).\n')

for (const [name, def] of Object.entries(MOVES)) {
  const clipDur = normalizeClip(await loadGlb(def.clip), def.clip).duration
  const cur = await run(def, 'current')
  const base = await run(def, 'baseline')
  const idle = await run(def, 'idleonly')

  console.log(`=== ${name} -> clip "${def.clip}" (${clipDur.toFixed(2)}s), limb ${def.limb}`)
  console.log(`    window ${def.startup}+${def.active}=${cur.frames}f (${(cur.frames / 60 * 1000).toFixed(0)}ms); ` +
              `seek=${cur.cfg.seek.toFixed(2)}s timeScale=${cur.cfg.rate.toFixed(2)} fade=${(cur.cfg.fade * 1000).toFixed(0)}ms`)
  console.log(`    ${'config'.padEnd(30)} pathLen bboxDiag reachRng`)
  const row = (l, r) => console.log(`    ${l.padEnd(30)} ${p(r.s.path, 7)} ${p(r.s.boxDiag, 8)} ${p(r.s.reachRange, 8)}`)
  row('CURRENT config (attack plays)', cur)
  row('attack from t=0 @1x', base)
  row('CONTROL: idle only, no attack', idle)

  console.log(`    -- if a React re-render lands mid-move (drei stopAllAction + uncache):`)
  for (const k of [0, 1, 2, 3, 5]) {
    if (k >= cur.frames) break
    const r = await run(def, `rerender:${k}`)
    console.log(`    ${('re-render @ frame ' + k).padEnd(30)} ${p(r.s.path, 7)} ${p(r.s.boxDiag, 8)} ${p(r.s.reachRange, 8)}` +
                `   -> ${((r.s.path / cur.s.path) * 100).toFixed(0)}% of the intact strike`)
  }
  console.log()
}
