// Re-attach a Mixamo character's embedded textures to its converted GLB.
//
// Why this exists: fbx2glb.mjs runs headless, where three's texture path needs
// a DOM to decode images — so it flattens every material to a flat colour. For
// animation clips that's fine (no visible mesh). For a CHARACTER it isn't: the
// Exec came out as a featureless black silhouette with no face.
//
// Binary FBX stores its textures as whole PNG files inside Video nodes, so we
// can lift them out byte-for-byte without decoding anything, then bind them to
// the GLB's materials by name. No image library required.
//
//   node scripts/mixamo/fbx-textures.mjs <in.fbx> <inout.glb>

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { dedup, prune } from '@gltf-transform/functions'

const [, , fbxPath, glbPath, maxPxArg] = process.argv
const MAX_PX = Number(maxPxArg ?? 2048)

// Mixamo ships 4K+ diffuse maps — one was 15 MB, which alone pushed the GLB to
// 28 MB. Downscale with macOS's built-in `sips` so we need no image library and
// no new dependency. Falls back to the original bytes anywhere sips is absent.
function downscale(png, label) {
  try {
    const dir = mkdtempSync(join(tmpdir(), 'mixtex-'))
    const src = join(dir, 'in.png')
    const dst = join(dir, 'out.png')
    writeFileSync(src, png)
    execFileSync('sips', ['-Z', String(MAX_PX), src, '--out', dst], { stdio: 'ignore' })
    const small = readFileSync(dst)
    if (small.length && small.length < png.length) {
      console.log(
        `      ${label}: ${(png.length / 1024 / 1024).toFixed(1)} MB → ${(small.length / 1024 / 1024).toFixed(1)} MB (max ${MAX_PX}px)`,
      )
      return small
    }
  } catch {
    console.log(`      ${label}: sips unavailable, keeping original size`)
  }
  return png
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const IEND = Buffer.from('IEND')

/** Lift every complete PNG out of the FBX blob, in file order. */
function extractPngs(buf) {
  const out = []
  let i = 0
  while ((i = buf.indexOf(PNG_MAGIC, i)) !== -1) {
    const end = buf.indexOf(IEND, i)
    if (end === -1) break
    out.push(buf.subarray(i, end + 8)) // IEND + 4-byte CRC
    i = end + 8
  }
  return out
}

/** The texture filenames, in the same order the Video nodes declare them. */
function extractNames(buf) {
  const seen = []
  const re = /[A-Za-z0-9_]+\.(?:png|jpg|jpeg)/g
  let m
  const text = buf.toString('latin1')
  while ((m = re.exec(text))) if (!seen.includes(m[0])) seen.push(m[0])
  return seen
}

const fbx = readFileSync(fbxPath)
const pngs = extractPngs(fbx)
const names = extractNames(fbx)
console.log(`  found ${pngs.length} embedded PNG(s), ${names.length} filename(s)`)
names.forEach((n, i) => console.log(`    [${i}] ${n}${pngs[i] ? ` → ${(pngs[i].length / 1024).toFixed(0)} KB` : ' (no data)'}`))

// Diffuse/base-colour only. Normal + specular + glossiness maps are Mixamo's
// non-PBR set and don't map cleanly onto glTF's metal-rough model; the diffuse
// alone is what makes him read as a person with a face.
const diffuseFor = (matName) => {
  const stem = matName === 'Ch33_hair' ? '1002' : '1001'
  const idx = names.findIndex((n) => n.includes(stem) && /diffuse/i.test(n))
  return idx === -1 ? null : { name: names[idx], data: pngs[idx] }
}

const io = new NodeIO()
const doc = await io.read(glbPath)
const root = doc.getRoot()

const cache = new Map()
let bound = 0
for (const mat of root.listMaterials()) {
  const name = mat.getName()
  const hit = diffuseFor(name)
  if (!hit?.data) continue
  if (!cache.has(hit.name)) {
    const bytes = downscale(hit.data, hit.name)
    cache.set(
      hit.name,
      doc.createTexture(hit.name).setImage(new Uint8Array(bytes)).setMimeType('image/png'),
    )
  }
  mat
    .setBaseColorTexture(cache.get(hit.name))
    .setBaseColorFactor([1, 1, 1, 1]) // let the texture speak; no tint over it
    .setMetallicFactor(0)
    .setRoughnessFactor(0.85)
  bound++
  console.log(`    material "${name}" ← ${hit.name}`)
}

// FLIP V. FBX measures texture space from the bottom-left, glTF from the
// top-left. three's loader normally papers over this with texture.flipY, but we
// bolt the PNG on directly, so nothing compensates and the atlas samples upside
// down — skin-toned patches landing on the suit and shoes. Flip the UVs of
// every primitive we just textured. Guarded so re-running is idempotent.
const flipped = new Set()
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (!prim.getMaterial()?.getBaseColorTexture()) continue
    const uv = prim.getAttribute('TEXCOORD_0')
    if (!uv || flipped.has(uv)) continue
    flipped.add(uv)
    const a = uv.getArray()
    for (let i = 1; i < a.length; i += 2) a[i] = 1 - a[i]
    uv.setArray(a)
  }
}
console.log(`  flipped V on ${flipped.size} UV set(s) for FBX→glTF texture space`)

// Drop duplicate/unused data. NOT `quantize()` — it was tried and it breaks
// these rigs: the skinned GLB then fails to parse in three and drei retries the
// fetch forever, leaving an empty scene. Texture downscaling is where the real
// saving is anyway.
await doc.transform(dedup(), prune())

await io.write(glbPath, doc)
console.log(`  bound ${bound} material(s), wrote ${glbPath}`)
