import { readFileSync } from 'node:fs'; import { join } from 'node:path'
import * as THREE from 'three'; import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const st=()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){},set src(_){}})
globalThis.self??=globalThis; globalThis.window??=globalThis
globalThis.document??={createElementNS:()=>({style:{},...st()}),createElement:()=>({getContext:()=>null,...st()})}
const dir='/Users/rebeccaleung/blocked/game/public/models/_mixamo_glb'
const TRIM={jab:[11,26,1.09],heavy:[18,43,1.0],throw:[27,48,1.33],jumpattack:[11,30,1.8]}
const norm=s=>s.replace(/^mixamorig\d+/,'mixamorig')
const L=new GLTFLoader(); const p=b=>new Promise((r,j)=>L.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',r,j))
console.log('RAW Hips.position Y range per clip (cm, Mixamo units; x0.01 => metres):')
for(const n of ['idle','jump','falling','jumpattack','walk','heavy']){
  const g=await p(readFileSync(join(dir,`${n}.glb`)))
  const a=g.animations.find(x=>x.tracks.length>0)
  const t=a.tracks.find(t=>/Hips\.position$/.test(norm(t.name)))
  if(!t){console.log(`  ${n}: no hips track`);continue}
  const ys=[];for(let i=1;i<t.values.length;i+=3)ys.push(t.values[i])
  console.log(`  ${n.padEnd(11)} min=${Math.min(...ys).toFixed(1)} max=${Math.max(...ys).toFixed(1)}  => zeroing drops the rig by ~${(Math.min(...ys)*0.01).toFixed(2)} m`)
}
console.log('\nTracks left with <2 keyframes after subclip (would freeze / mis-evaluate):')
for(const n of Object.keys(TRIM)){
  const g=await p(readFileSync(join(dir,`${n}.glb`)))
  const src=g.animations.find(x=>x.tracks.length>0); const c=src.clone(); c.tracks.forEach(t=>t.name=norm(t.name))
  const cut=THREE.AnimationUtils.subclip(c,n,TRIM[n][0],TRIM[n][1],30)
  const bad=cut.tracks.filter(t=>t.times.length<2).map(t=>`${t.name.replace('mixamorig','')}(${t.times.length})`)
  const zero=cut.tracks.filter(t=>t.times.length===0).length
  console.log(`  ${n.padEnd(11)} tracks=${cut.tracks.length}/${c.tracks.length} dur=${cut.duration.toFixed(3)} zeroKey=${zero} sparse=${bad.length?bad.join(' '):'none'}`)
}
