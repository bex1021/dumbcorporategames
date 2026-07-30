// BUG 1 "SINKING JUMP" — measure what zeroing the Hips.position Y channel does.
// Loads each clip GLB, reports the raw Hips.position track stats, then samples
// the posed rig with Y KEPT vs Y ZEROED and reports world hips/foot heights in
// metres after CHAR_SCALE (0.01).
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
// The BODY glb carries real textures; headless image decode would hang the
// parse forever, so hand GLTFLoader a fake decoded bitmap.
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })
globalThis.URL.createObjectURL ??= () => 'blob:stub'
globalThis.URL.revokeObjectURL ??= () => {}

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..', '..', 'public', 'models', '_mixamo_glb')
const CHAR_SCALE = 0.01

const loader = new GLTFLoader()
const parse = (buf) =>
  new Promise((res, rej) => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    loader.parse(ab, '', res, rej)
  })
const norm = (s) => s.replace(/^mixamorig\d+/, 'mixamorig')
const find = (root, suffix) => {
  let hit = null
  root.traverse((o) => {
    if (o.name.replace(/^mixamorig\d*/, '').toLowerCase() === suffix.toLowerCase()) hit = o
  })
  return hit
}

const CLIPS = ['jump', 'falling', 'jumpattack', 'idle', 'walk', 'jab', 'knockdown']
const AIRBORNE = new Set(['jump', 'falling', 'jumpattack'])

// The BODY rig the game actually skins (Leonard). Clips bind onto it.
const bodyGltf = await parse(readFileSync(join(here, '..', '..', 'public', 'models', 'Player_Idle.glb')))
const body = bodyGltf.scene
body.traverse((o) => { if (o.name) o.name = norm(o.name) })
const bodyHips = find(body, 'Hips')
const bodyFoot = find(body, 'LeftToeBase') ?? find(body, 'LeftFoot')
body.updateMatrixWorld(true)
console.log('=== BODY RIG (Player_Idle.glb, Leonard) — BIND/REST POSE ===')
console.log(`  root scale        : ${body.scale.x}`)
console.log(`  Hips.position     : (${bodyHips.position.x.toFixed(2)}, ${bodyHips.position.y.toFixed(2)}, ${bodyHips.position.z.toFixed(2)}) rig units`)
{
  const p = new THREE.Vector3(); bodyHips.getWorldPosition(p)
  const q = new THREE.Vector3(); bodyFoot?.getWorldPosition(q)
  console.log(`  Hips world Y      : ${p.y.toFixed(2)} rig units → ${(p.y * CHAR_SCALE).toFixed(3)} m at CHAR_SCALE`)
  if (bodyFoot) console.log(`  ${bodyFoot.name} world Y: ${q.y.toFixed(2)} → ${(q.y * CHAR_SCALE).toFixed(3)} m  (leg length ${((p.y - q.y) * CHAR_SCALE).toFixed(3)} m)`)
}

const results = {}
for (const name of CLIPS) {
  const gltf = await parse(readFileSync(join(dir, `${name}.glb`)))
  const src = gltf.animations.find((a) => a.tracks.length) ?? gltf.animations[0]
  const clip = src.clone()
  for (const t of clip.tracks) t.name = norm(t.name)
  const hipTrack = clip.tracks.find((t) => /Hips\.position$/.test(t.name))
  if (!hipTrack) { console.log(`\n${name}: NO Hips.position track`); continue }

  const v = hipTrack.values
  const triples = v.length / 3
  const ys = []
  for (let i = 1; i < v.length; i += 3) ys.push(v[i])
  const min = Math.min(...ys), max = Math.max(...ys)
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length
  console.log(`\n=== ${name}.glb ${AIRBORNE.has(name) ? '(AIRBORNE — my change zeroes Y)' : '(grounded — Y kept)'} ===`)
  console.log(`  clip duration     : ${clip.duration.toFixed(3)}s, ${clip.tracks.length} tracks`)
  console.log(`  Hips.position     : ${triples} value triples, ${hipTrack.times.length} keyframes`)
  console.log(`  Hips Y raw        : min ${min.toFixed(2)}  max ${max.toFixed(2)}  mean ${mean.toFixed(2)}  span ${(max - min).toFixed(2)} rig units`)
  console.log(`  Hips Y in metres  : min ${(min * CHAR_SCALE).toFixed(3)}  max ${(max * CHAR_SCALE).toFixed(3)}  mean ${(mean * CHAR_SCALE).toFixed(3)}  span ${((max - min) * CHAR_SCALE).toFixed(3)} m`)
  console.log(`  first key Y       : ${ys[0].toFixed(2)} (${(ys[0] * CHAR_SCALE).toFixed(3)} m)  ← the standing baseline for this clip`)

  // Sample the posed rig, keeping Y vs zeroing Y.
  const sample = (zeroY) => {
    const c = clip.clone()
    for (const t of c.tracks) {
      if (!/Hips\.position$/.test(t.name)) continue
      const w = t.values
      for (let i = 0; i < w.length; i += 3) { w[i] = 0; if (zeroY) w[i + 1] = 0; w[i + 2] = 0 }
    }
    const mixer = new THREE.AnimationMixer(body)
    mixer.clipAction(c).play()
    const rows = []
    for (let s = 0; s <= 10; s++) {
      mixer.setTime((s / 10) * c.duration * 0.999)
      body.updateMatrixWorld(true)
      const h = new THREE.Vector3(); bodyHips.getWorldPosition(h)
      const f = new THREE.Vector3(); bodyFoot?.getWorldPosition(f)
      rows.push({ t: (s / 10) * c.duration, hipY: h.y * CHAR_SCALE, footY: (bodyFoot ? f.y : NaN) * CHAR_SCALE })
    }
    mixer.stopAllAction()
    return rows
  }
  const kept = sample(false)
  const zeroed = sample(true)
  const fmt = (rows) => `hipY ${Math.min(...rows.map(r => r.hipY)).toFixed(3)}..${Math.max(...rows.map(r => r.hipY)).toFixed(3)} m | lowest foot ${Math.min(...rows.map(r => r.footY)).toFixed(3)} m`
  console.log(`  POSED, Y KEPT     : ${fmt(kept)}`)
  console.log(`  POSED, Y ZEROED   : ${fmt(zeroed)}   ← current build`)
  const drop = kept[0].hipY - zeroed[0].hipY
  console.log(`  >>> SINK at t=0   : ${drop.toFixed(3)} m  (feet end up ${Math.min(...zeroed.map(r => r.footY)).toFixed(3)} m relative to the group origin)`)
  results[name] = { triples, min, max, mean, first: ys[0], kept, zeroed, drop }
}

console.log('\n=== SUMMARY (metres, after CHAR_SCALE 0.01) ===')
for (const [k, r] of Object.entries(results)) {
  console.log(
    `${k.padEnd(11)} baselineY ${(r.first * CHAR_SCALE).toFixed(3)}  relative tuck span ${((r.max - r.min) * CHAR_SCALE).toFixed(3)}  ` +
    `sink-if-zeroed ${r.drop.toFixed(3)} m`,
  )
}
