// BUG 2 PROBE: does ATTACK_TRIM's subclip leave the Spine bones unwritten,
// letting AnimatedFighter's AIM block (`b.rotation.x += ...`) accumulate?
//
// Measures, per attack clip:
//   (a) every Spine/Spine1/Spine2 track in the SOURCE  (count + time range)
//   (b) the same tracks AFTER AnimationUtils.subclip with the game's windows
//   (c) any track in the trimmed clip left with 0 or 1 keyframes
//   (d) a live mixer sim: how many frames each Spine bone's quaternion is
//       actually re-written to the scene graph, and how far the game's AIM
//       `rotation.x +=` accumulates over the move.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

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
const ATTACK_TRIM = {
  jab: [11, 26, 1.09],
  heavy: [18, 43, 1.0],
  throw: [27, 48, 1.33],
  jumpattack: [11, 30, 1.8],
}
const AIRBORNE = new Set(['jump', 'falling', 'jumpattack'])
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')
const SPINE_RE = /^mixamorigSpine[12]?\./

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })

// Mirror AnimatedFighter.useFightClips exactly.
function buildGameClip(gltf, name) {
  const src = gltf.animations.find((a) => a.tracks.length > 0) ?? gltf.animations[0]
  const clip = src.clone()
  clip.name = name
  const airborne = AIRBORNE.has(name)
  clip.tracks = clip.tracks.map((t) => {
    t.name = norm(t.name)
    if (/Hips\.position$/.test(t.name)) {
      const v = t.values
      for (let i = 0; i < v.length; i += 3) {
        v[i] = 0
        if (airborne) v[i + 1] = 0
        v[i + 2] = 0
      }
    }
    return t
  })
  const trim = ATTACK_TRIM[name]
  if (!trim) return { pre: clip, cut: clip, trim: null }
  const preSnapshot = clip.clone()
  const cut = THREE.AnimationUtils.subclip(clip, name, trim[0], trim[1], SOURCE_FPS)
  cut.name = name
  return { pre: preSnapshot, cut, trim }
}

// exec_body.glb / Player_Idle.glb carry textures and never settle headlessly,
// so use each clip GLB's own (identical, normalised) mixamorig hierarchy as the
// bind target. Same bone names → same binding behaviour as in game.
const idleGltf = await parse(readFileSync(join(dir, 'idle.glb')))
const { cut: idleClip } = buildGameClip(idleGltf, 'idle')

console.log('three', THREE.REVISION, '\n')

for (const [slot, trim] of Object.entries(ATTACK_TRIM)) {
  const gltf = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const { pre, cut } = buildGameClip(gltf, slot)

  console.log('='.repeat(78))
  console.log(
    `${slot.toUpperCase()}   trim frames [${trim[0]}, ${trim[1]}) @${SOURCE_FPS}fps ` +
      `= ${(trim[0] / SOURCE_FPS).toFixed(3)}s–${(trim[1] / SOURCE_FPS).toFixed(3)}s  timeScale ${trim[2]}`,
  )
  console.log(
    `  source: ${pre.tracks.length} tracks, duration ${pre.duration.toFixed(3)}s  ` +
      `→ trimmed: ${cut.tracks.length} tracks, duration ${cut.duration.toFixed(3)}s`,
  )

  // (a) + (b) SPINE TRACKS
  const preSpine = pre.tracks.filter((t) => SPINE_RE.test(t.name))
  const cutByName = new Map(cut.tracks.map((t) => [t.name, t]))
  console.log('\n  SPINE TRACKS')
  for (const t of preSpine) {
    const n = t.times.length
    const t0 = t.times[0]
    const t1 = t.times[n - 1]
    const after = cutByName.get(t.name)
    const nAfter = after ? after.times.length : 0
    const inWindow = [...t.times].filter((tt) => tt * SOURCE_FPS >= trim[0] && tt * SOURCE_FPS < trim[1]).length
    const flag = nAfter === 0 ? '  <<< DROPPED (0 keys)' : nAfter === 1 ? '  <<< SINGLE KEY (constant)' : ''
    console.log(
      `    ${t.name.padEnd(34)} src keys ${String(n).padStart(4)}  ` +
        `t ${t0.toFixed(3)}–${t1.toFixed(3)}s (frames ${(t0 * SOURCE_FPS).toFixed(1)}–${(t1 * SOURCE_FPS).toFixed(1)})  ` +
        `| in-window ${String(inWindow).padStart(3)}  → after subclip ${String(nAfter).padStart(3)}${flag}`,
    )
  }

  // (c) EVERY track in the trimmed clip with <= 1 keyframe, plus dropped tracks
  const dropped = pre.tracks.filter((t) => !cutByName.has(t.name)).map((t) => t.name)
  const singles = cut.tracks.filter((t) => t.times.length === 1).map((t) => t.name)
  console.log(`\n  DROPPED ENTIRELY (0 keys in window): ${dropped.length}`)
  for (const n of dropped) console.log(`    - ${n}`)
  console.log(`  SINGLE-KEYFRAME AFTER TRIM (constant → mixer stops writing): ${singles.length}`)
  for (const n of singles) console.log(`    - ${n}`)

  // (d) LIVE MIXER SIM — is the Spine quaternion actually re-written per frame?
  const root = cloneSkinned(gltf.scene)
  root.traverse((o) => {
    if (o.name) o.name = norm(o.name)
  })
  const spine = []
  root.traverse((o) => {
    if (/^mixamorigSpine[12]?$/.test(o.name)) spine.push(o)
  })

  const mixer = new THREE.AnimationMixer(root)
  const idle = mixer.clipAction(idleClip)
  idle.play()

  const atk = mixer.clipAction(cut)
  atk.setLoop(THREE.LoopOnce, Infinity)
  atk.clampWhenFinished = true
  atk.timeScale = trim[2]

  const DT = 1 / 60
  // settle idle for 30 frames, then crossfade to the attack like the game does
  for (let i = 0; i < 30; i++) mixer.update(DT)
  idle.fadeOut(0.09)
  atk.reset()
  atk.timeScale = trim[2]
  atk.fadeIn(0.09).play()

  // instrument: count scene-graph writes to each spine quaternion
  const writes = spine.map(() => 0)
  const lastQ = spine.map((b) => b.quaternion.clone())
  // AIM constants from AnimatedFighter.tsx (worst realistic case: full clamp)
  const AIM_CLAMP = 0.5
  const per = AIM_CLAMP / spine.length // clamped magnitude / spine.length
  const accum = spine.map(() => 0)

  const frames = Math.ceil((cut.duration / trim[2]) * 60) + 30
  for (let f = 0; f < frames; f++) {
    mixer.update(DT)
    for (let i = 0; i < spine.length; i++) {
      const b = spine[i]
      if (!b.quaternion.equals(lastQ[i])) {
        writes[i]++
        lastQ[i].copy(b.quaternion)
      }
      // the game's AIM line
      b.rotation.x += per
      accum[i] += per
      lastQ[i].copy(b.quaternion) // AIM's euler write syncs the quaternion too
    }
  }

  console.log(`\n  LIVE MIXER (${frames} frames @60Hz, idle→${slot} crossfade, AIM applied each frame)`)
  for (let i = 0; i < spine.length; i++) {
    const deg = (spine[i].rotation.x * 180) / Math.PI
    console.log(
      `    ${spine[i].name.padEnd(22)} mixer re-wrote quaternion on ${String(writes[i]).padStart(3)}/${frames} frames  ` +
        `| AIM added ${((accum[i] * 180) / Math.PI).toFixed(0)}deg total  | final rotation.x = ${deg.toFixed(1)}deg`,
    )
  }
  console.log()
}

// Control: what does an UNTRIMMED clip do? (the pre-change behaviour)
console.log('='.repeat(78))
console.log('CONTROL — jab UNTRIMMED (the behaviour before ATTACK_TRIM landed)')
{
  const gltf = await parse(readFileSync(join(dir, 'jab.glb')))
  const { pre } = buildGameClip(gltf, 'jab')
  const root = cloneSkinned(gltf.scene)
  root.traverse((o) => {
    if (o.name) o.name = norm(o.name)
  })
  const spine = []
  root.traverse((o) => {
    if (/^mixamorigSpine[12]?$/.test(o.name)) spine.push(o)
  })
  const mixer = new THREE.AnimationMixer(root)
  const a = mixer.clipAction(pre)
  a.play()
  const writes = spine.map(() => 0)
  const lastQ = spine.map((b) => b.quaternion.clone())
  const per = 0.5 / spine.length
  const frames = 60
  for (let f = 0; f < frames; f++) {
    mixer.update(1 / 60)
    for (let i = 0; i < spine.length; i++) {
      const b = spine[i]
      if (!b.quaternion.equals(lastQ[i])) writes[i]++
      b.rotation.x += per
      lastQ[i].copy(b.quaternion)
    }
  }
  for (let i = 0; i < spine.length; i++) {
    console.log(
      `    ${spine[i].name.padEnd(22)} mixer re-wrote quaternion on ${String(writes[i]).padStart(3)}/${frames} frames  ` +
        `| final rotation.x = ${((spine[i].rotation.x * 180) / Math.PI).toFixed(1)}deg`,
    )
  }
}
