// Quantify (and OPTIMIZE) the pose jump at a clip-stitch boundary.
//
// "Smoother transition" is not a vibe: at a cut, every bone snaps from its pose
// in clip A to its pose in clip B, and the mean per-bone rotation delta IS the
// jerk. This measures it in degrees, against the baseline of consecutive
// frames inside a single clip (what "smooth" costs), then grid-searches the
// cut frames to find the best-matching pair of poses.
//
//   node scripts/mixamo/measure-stitch.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const stub=()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){},set src(_){}} )
globalThis.self??=globalThis; globalThis.window??=globalThis
globalThis.document??={createElementNS:()=>({style:{},...stub()}),createElement:()=>({getContext:()=>null,...stub()})}
const here=dirname(fileURLToPath(import.meta.url))
const dir=join(here,'..','..','public','models','_mixamo_glb')
const loader=new GLTFLoader()
const parse=(b)=>new Promise((res,rej)=>loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',res,rej))

async function rig(slot){
  const g=await parse(readFileSync(join(dir,`${slot}.glb`)))
  const clip=g.animations.find(a=>a.tracks.length)
  const mixer=new THREE.AnimationMixer(g.scene)
  mixer.clipAction(clip).play()
  return {scene:g.scene,mixer,clip}
}
function pose(r,frame){
  r.mixer.setTime(Math.min(frame/30, r.clip.duration-1e-4))
  r.scene.updateMatrixWorld(true)
  const out={}
  r.scene.traverse(o=>{ if(o.name.startsWith('mixamorig')) out[o.name.replace(/^mixamorig\d*/,'')]=o.quaternion.clone() })
  return out
}
function delta(a,b){
  let sum=0,n=0,worst=0,worstBone=''
  for(const k of Object.keys(a)){
    if(!b[k])continue
    const d=2*Math.acos(Math.min(1,Math.abs(a[k].dot(b[k]))))*180/Math.PI
    sum+=d;n++
    if(d>worst){worst=d;worstBone=k}
  }
  return {mean:sum/n,worst,worstBone}
}

const jump=await rig('jump')      // kickprep + kickland source
const spin=await rig('hurricane') // the spin

// baseline: what "smooth" costs — consecutive-frame deltas inside each clip
const b1=delta(pose(jump,14),pose(jump,15))
const b2=delta(pose(spin,14),pose(spin,15))
console.log(`baseline consecutive-frame delta: jump ${b1.mean.toFixed(1)}° mean, spin ${b2.mean.toFixed(1)}° mean\n`)

// current cuts
const cutA=delta(pose(jump,18),pose(spin,10))
const cutB=delta(pose(spin,28),pose(jump,33))
console.log(`CURRENT cut A (jump f18 → spin f10): mean ${cutA.mean.toFixed(1)}°, worst ${cutA.worst.toFixed(0)}° (${cutA.worstBone})`)
console.log(`CURRENT cut B (spin f28 → jump f33): mean ${cutB.mean.toFixed(1)}°, worst ${cutB.worst.toFixed(0)}° (${cutB.worstBone})\n`)

// search: best prep-end within the launch (f14–19) × spin-start (any frame —
// the spin is cyclic) and best spin-end × land-start (f30–40)
let bestA={mean:1e9}
for(let pe=14;pe<=19;pe++)for(let ss=0;ss<=27;ss++){
  const d=delta(pose(jump,pe),pose(spin,ss))
  if(d.mean<bestA.mean)bestA={...d,pe,ss}
}
let bestB={mean:1e9}
for(let se=20;se<=44;se++)for(let ls=30;ls<=40;ls++){
  const d=delta(pose(spin,se),pose(jump,ls))
  if(d.mean<bestB.mean)bestB={...d,se,ls}
}
console.log(`BEST cut A: jump f${bestA.pe} → spin f${bestA.ss}   mean ${bestA.mean.toFixed(1)}°, worst ${bestA.worst.toFixed(0)}° (${bestA.worstBone})`)
console.log(`BEST cut B: spin f${bestB.se} → jump f${bestB.ls}   mean ${bestB.mean.toFixed(1)}°, worst ${bestB.worst.toFixed(0)}° (${bestB.worstBone})`)
