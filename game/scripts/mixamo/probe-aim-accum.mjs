// BUG 2 PART 2: quantify the AIM accumulation.
//
// PropertyMixer.apply() only calls binding.setValue() when its own accumulator
// changed between frames:
//     for ( let i = stride, e = stride + stride; i !== e; ++ i )
//       if ( buffer[ i ] !== buffer[ i + stride ] ) { binding.setValue(...); break; }
// So a bone whose animated value is STATIC (clip clamped after LoopOnce, or the
// whole mixer at timeScale 0) is never written to the scene graph again — and
// AnimatedFighter's `b.rotation.x += per` then integrates forever.
//
// This measures the two static windows the new code creates, and the per-frame
// AIM step for each matchup.
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
const ATTACK_TRIM = { jab: [11, 26, 1.09], heavy: [18, 43, 1.0], throw: [27, 48, 1.33], jumpattack: [11, 30, 1.8] }
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })
const gameClip = (gltf, name) => {
  const src = gltf.animations.find((a) => a.tracks.length > 0) ?? gltf.animations[0]
  const clip = src.clone()
  clip.name = name
  clip.tracks.forEach((t) => (t.name = norm(t.name)))
  const trim = ATTACK_TRIM[name]
  if (!trim) return clip
  const cut = THREE.AnimationUtils.subclip(clip, name, trim[0], trim[1], SOURCE_FPS)
  cut.name = name
  return cut
}

// ── A. hitstop: mixer.timeScale = 0 → does the mixer still write the spine? ──
{
  const gltf = await parse(readFileSync(join(dir, 'jab.glb')))
  const clip = gameClip(gltf, 'jab')
  const root = gltf.scene
  root.traverse((o) => {
    if (o.name) o.name = norm(o.name)
  })
  const spine = []
  root.traverse((o) => {
    if (/^mixamorigSpine[12]?$/.test(o.name)) spine.push(o)
  })
  const mixer = new THREE.AnimationMixer(root)
  const a = mixer.clipAction(clip)
  a.setLoop(THREE.LoopOnce, Infinity)
  a.clampWhenFinished = true
  a.timeScale = 1.09
  a.play()
  for (let i = 0; i < 6; i++) mixer.update(1 / 60) // mid-swing

  const before = spine.map((b) => b.quaternion.clone())
  mixer.timeScale = 0 // AnimatedFighter line 261, during fight.hitstop
  let writes = 0
  const last = spine.map((b) => b.quaternion.clone())
  for (let f = 0; f < 11; f++) {
    // FEEL.hitstopHeavy
    mixer.update(1 / 60)
    for (let i = 0; i < spine.length; i++) {
      if (!spine[i].quaternion.equals(last[i])) writes++
      last[i].copy(spine[i].quaternion)
      spine[i].rotation.x += 0.5 / 3 // AIM at full clamp
      last[i].copy(spine[i].quaternion)
    }
  }
  console.log('A. HITSTOP (mixer.timeScale = 0, 11 frames = FEEL.hitstopHeavy)')
  console.log(`   spine quaternion writes by mixer: ${writes} / ${11 * spine.length}`)
  console.log(
    `   spine rotation.x drift: ${spine
      .map((b, i) => `${((b.rotation.x - new THREE.Euler().setFromQuaternion(before[i]).x) * 180) / Math.PI | 0}deg`)
      .join(', ')}\n`,
  )
}

// ── B. clip runs out before the move's state window ends ────────────────────
const MOVES = {
  'Leonard clarify  (jab)': { clip: 'jab', s: 11, a: 3, r: 13, stop: 5 },
  'Leonard pushback (heavy)': { clip: 'heavy', s: 20, a: 4, r: 24, stop: 11 },
  'Leonard offline  (throw)': { clip: 'throw', s: 12, a: 5, r: 22, stop: 7 },
  'Leonard jumpIn   (jumpattack)': { clip: 'jumpattack', s: 10, a: 10, r: 4, stop: 11, extra: 13 },
  'Exec jab': { clip: 'jab', s: 15, a: 3, r: 14, stop: 5 },
  'Exec heavy': { clip: 'heavy', s: 30, a: 4, r: 26, stop: 11 },
  'Exec grab': { clip: 'throw', s: 20, a: 2, r: 24, stop: 7 },
  'Exec PIP': { clip: 'throw', s: 40, a: 2, r: 32, stop: 7 },
  'Brent wellActually': { clip: 'jab', s: 16, a: 3, r: 16, stop: 5 },
  'Brent scopeConcern': { clip: 'heavy', s: 34, a: 4, r: 28, stop: 11 },
  'Priya tinyThought': { clip: 'jab', s: 13, a: 3, r: 9, stop: 5 },
  'Priya circleBack': { clip: 'jab', s: 26, a: 3, r: 22, stop: 5 },
}
const clipFrames = {}
for (const slot of Object.keys(ATTACK_TRIM)) {
  const g = await parse(readFileSync(join(dir, `${slot}.glb`)))
  const c = gameClip(g, slot)
  clipFrames[slot] = (c.duration / ATTACK_TRIM[slot][2]) * 60
}

console.log('B. CLIP EXHAUSTED BEFORE THE MOVE ENDS (clip clamps → mixer stops writing)')
console.log('   move                            window(f)  clip(f)  STATIC frames (+hitstop)')
const staticFrames = {}
for (const [name, m] of Object.entries(MOVES)) {
  const win = m.s + m.a + m.r + (m.extra ?? 0)
  const cf = clipFrames[m.clip]
  const gap = Math.max(0, win - cf)
  const total = gap + m.stop
  staticFrames[name] = total
  console.log(
    `   ${name.padEnd(31)} ${String(win).padStart(6)}  ${cf.toFixed(1).padStart(7)}  ` +
      `${gap.toFixed(1).padStart(6)} + ${String(m.stop).padStart(2)} = ${total.toFixed(1).padStart(5)}`,
  )
}

// ── C. per-frame AIM step for each real matchup ─────────────────────────────
const BODY_H = 1.75
const CHEST_FRAC = 0.72
const AIM_STRENGTH = 0.8
const AIM_CLAMP = 0.5
const SPINE_N = 3
const step = (dyMeters, dxMeters) => {
  const aim = Math.atan2(dyMeters, Math.max(0.5, dxMeters)) * AIM_STRENGTH
  return Math.max(-AIM_CLAMP, Math.min(AIM_CLAMP, aim)) / SPINE_N
}
const scenarios = {
  'vs Brent  (oppScale 1.00), both grounded': step(0, 1.0),
  'vs Priya  (oppScale 1.00), both grounded': step(0, 1.0),
  'vs EXEC   (oppScale 1.28), both grounded': step(BODY_H * 0.28 * CHEST_FRAC, 1.0),
  'vs EXEC   (oppScale 1.28), close (dx 0.7)': step(BODY_H * 0.28 * CHEST_FRAC, 0.7),
  'LEONARD AIRBORNE at apex y=0.80, dx 1.0': step(-0.8, 1.0),
  'LEONARD AIRBORNE at apex, vs EXEC': step(BODY_H * 0.28 * CHEST_FRAC - 0.8, 1.0),
  'OPPONENT airborne at apex (Leonard aims up)': step(0.8, 1.0),
}
console.log('\nC. AIM STEP PER FRAME PER SPINE BONE  (b.rotation.x += per)')
for (const [k, v] of Object.entries(scenarios)) {
  console.log(`   ${k.padEnd(45)} ${((v * 180) / Math.PI).toFixed(2).padStart(6)} deg/frame`)
}

console.log('\nD. TOTAL UNCORRECTED TORSO PITCH = static frames x step')
const worst = [
  ['Leonard offline  (throw)', 'vs EXEC   (oppScale 1.28), close (dx 0.7)'],
  ['Leonard jumpIn   (jumpattack)', 'LEONARD AIRBORNE at apex, vs EXEC'],
  ['Leonard jumpIn   (jumpattack)', 'LEONARD AIRBORNE at apex, dx 1.0'],
  ['Exec PIP', 'vs EXEC   (oppScale 1.28), close (dx 0.7)'],
  ['Exec heavy', 'vs EXEC   (oppScale 1.28), close (dx 0.7)'],
  ['Leonard pushback (heavy)', 'vs EXEC   (oppScale 1.28), close (dx 0.7)'],
  ['Brent scopeConcern', 'vs Brent  (oppScale 1.00), both grounded'],
]
for (const [mv, sc] of worst) {
  const key = Object.keys(scenarios).find((k) => k.startsWith(sc.slice(0, 24)))
  const per = scenarios[key]
  const f = staticFrames[mv]
  console.log(`   ${mv.padEnd(31)} x ${key.padEnd(45)} = ${(((per * f) * 180) / Math.PI).toFixed(0).padStart(5)} deg`)
}
console.log('\n   (KO: FEEL.koFreeze = 30 static frames, and `victory` is a clamped one-shot →')
console.log('    after it finishes the spine is NEVER written again for the rest of the scene.)')
