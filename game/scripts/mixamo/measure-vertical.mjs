import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const stub=()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){},set src(_){}} )
globalThis.self??=globalThis; globalThis.window??=globalThis
globalThis.document??={createElementNS:()=>({style:{},...stub()}),createElement:()=>({getContext:()=>null,...stub()})}
const loader=new GLTFLoader()
const g=await new Promise((res,rej)=>{const b=readFileSync('public/models/_mixamo_glb/combo.glb');
 loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',res,rej)})
const clip=g.animations.find(a=>a.tracks.length)
const mixer=new THREE.AnimationMixer(g.scene); mixer.clipAction(clip).play()
let hips=null,lf=null,rf=null
g.scene.traverse(o=>{const n=o.name.replace(/^mixamorig\d*/,'').toLowerCase()
 if(n==='hips')hips=o; if(n==='leftfoot')lf=o; if(n==='rightfoot')rf=o})
const F=Math.round(clip.duration*30)
let minFoot=Infinity,maxHip=-Infinity,minHip=Infinity
const rows=[]
for(let f=0;f<=F;f++){
  mixer.setTime(Math.min(f/30,clip.duration-1e-4)); g.scene.updateMatrixWorld(true)
  const h=new THREE.Vector3(); hips.getWorldPosition(h)
  const a=new THREE.Vector3(),b=new THREE.Vector3(); lf.getWorldPosition(a); rf.getWorldPosition(b)
  const foot=Math.min(a.y,b.y)
  minFoot=Math.min(minFoot,foot); maxHip=Math.max(maxHip,h.y); minHip=Math.min(minHip,h.y)
  if(f%10===0) rows.push(`  f${String(f).padStart(3)} hipY ${h.y.toFixed(1).padStart(6)}  lowest foot ${foot.toFixed(1).padStart(6)}`)
}
console.log(rows.join('\n'))
console.log(`\nhip Y range ${minHip.toFixed(1)} .. ${maxHip.toFixed(1)}  (standing bind = 99.8)`)
console.log(`lowest foot over the whole clip: ${minFoot.toFixed(1)}u  ${minFoot < -3 ? '← CLIPS THROUGH THE FLOOR' : '✓ stays on/above the floor'}`)
