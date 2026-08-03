// Is root motion baked into these clips? Mixamo's "In Place" checkbox is the
// difference, and getting it wrong makes a walk cycle translate the character
// instead of striding on the spot — which the sim then fights.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const stub = () => ({ addEventListener(){}, removeEventListener(){}, style:{}, setAttribute(){}, set src(_){} })
globalThis.self ??= globalThis; globalThis.window ??= globalThis
globalThis.document ??= { createElementNS:()=>({style:{},...stub()}), createElement:()=>({getContext:()=>null,...stub()}) }
const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here,'..','..','public','models','_mixamo_glb')
const loader = new GLTFLoader()
const parse = (b)=>new Promise((res,rej)=>loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',res,rej))
const find=(r,n)=>{let h=null;r.traverse(o=>{if(o.name.replace(/^mixamorig\d*/,'').toLowerCase()===n.toLowerCase())h=o});return h}

for (const slot of ['idle','guthitfall']) {
  const g = await parse(readFileSync(join(dir,`${slot}.glb`)))
  const clip = g.animations.find(a=>a.tracks.length) ?? g.animations[0]
  const mixer = new THREE.AnimationMixer(g.scene)
  mixer.clipAction(clip).play()
  const hips = find(g.scene,'Hips')
  const at=(t)=>{mixer.setTime(t);g.scene.updateMatrixWorld(true);const p=new THREE.Vector3();hips.getWorldPosition(p);return p}
  const a=at(0), b=at(clip.duration-1e-4)
  // horizontal travel is the tell; vertical is just the body bobbing
  const horiz = Math.hypot(b.x-a.x, b.z-a.z)
  // does a Hips POSITION track even exist, and does it move horizontally?
  const t = clip.tracks.find(tr=>/Hips\.position$/.test(tr.name))
  let spanX=0, spanZ=0
  if (t) {
    const xs=[],zs=[]
    for(let i=0;i<t.values.length;i+=3){xs.push(t.values[i]);zs.push(t.values[i+2])}
    spanX=Math.max(...xs)-Math.min(...xs); spanZ=Math.max(...zs)-Math.min(...zs)
  }
  console.log(`${slot.padEnd(9)} hips horiz travel start→end ${horiz.toFixed(1)}u   ` +
    `Hips.position track: ${t?`x-span ${spanX.toFixed(1)}u  z-span ${spanZ.toFixed(1)}u`:'none'}` +
    `   ${horiz>8?'← ROOT MOTION BAKED IN':''}`)
}
