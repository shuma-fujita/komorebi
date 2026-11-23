#!/usr/bin/env node
// User-provided Kaikatsu / Bamiyan logos: OSM naming, floors, UV, local edits.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {matchFoodBuildings,resolveBamiyanPaint,resolveFoodPaint}
 from '../komorebi3d/objects/buildings/food/osm-adapter.js';
import {matchKaikatsuBuildings,resolveKaikatsuPaint}
 from '../komorebi3d/objects/buildings/leisure/osm-adapter.js';
import {paintBamiyanFacade,BAMIYAN_BG}
 from '../komorebi3d/objects/buildings/food/bamiyan-sign.js';
import {paintKaikatsuFacade,KAIKATSU_BG}
 from '../komorebi3d/objects/buildings/leisure/kaikatsu-sign.js';
import {applySavedOsmTagChangesToMap} from '../komorebi3d/maps/osm-pending-changes.js';
import {patchLiveGeofabrikMap} from '../komorebi3d/maps/map-live-osm-changes.js';
const lat=35.78444,lon=139.90061,scale=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/scale});
const project=p=>[(p.lon-lon)*scale,-(p.lat-lat)*111320];
const building={type:'way',id:88442211,version:1,
 tags:{building:'yes','building:levels':'6'},
 geometry:[[-12,-9],[12,-9],[12,9],[-12,9],[-12,-9]].map(([x,z])=>coord(x,z))};
const kai={type:'node',id:88442212,version:1,...coord(-3,0),
 tags:{amenity:'internet_cafe',name:'快活CLUB テスト店',level:'1'}};
const bam={type:'node',id:88442213,version:1,...coord(3,0),
 tags:{amenity:'restaurant',name:'バーミヤン テスト店',level:'2'}};
const tile={id:'0_0',gridX:0,gridY:0,sizeM:2000};
const map=(kt=kai.tags,bt=bam.tags)=>({source:'OpenStreetMap contributors',tile,
 elements:[building,{...kai,tags:{...kt}},{...bam,tags:{...bt}}]});
const build=data=>buildMap(data,{latitude:lat,longitude:lon,halfSize:1000});
const km=matchKaikatsuBuildings(map().elements,project,1000).get(building.id);
const bm=matchFoodBuildings(map().elements,project,1000).get(building.id);
assert.deepEqual(km.map(s=>s.brand.id),['kaikatsu']);
assert.deepEqual(bm.map(s=>s.brand.id),['bamiyan']);
assert.deepEqual(resolveKaikatsuPaint(km,building.tags,18).map(s=>[s.bottom,s.top]),[[3,6]]);
assert.deepEqual(resolveBamiyanPaint(bm,building.tags,18).map(s=>[s.bottom,s.top]),[[6,9]]);
assert.equal(resolveFoodPaint(bm,building.tags,18).length,0);
const actual=build(map());
assert.deepEqual(actual.texturedFaces.map(f=>f.texture).sort(),['bamiyan','kaikatsu']);
for(const face of actual.texturedFaces){
 const [lo,hi]=face.texture==='kaikatsu'?[3,6]:[6,9];
 assert.equal(face.ownerKey,'way/'+building.id);
 assert.equal(face.uvs.length,face.positions.length/3*2);
 assert.ok(face.positions.every((v,i)=>i%3!==1||v>=lo-1e-8&&v<=hi+1e-8));
 assert.equal(face.uvs.filter((_,i)=>i%12===0&&
  face.uvs.slice(i,i+12).join(',')==='1,0,0,0,0,1,1,0,0,1,1,1').length,4);
}
for(const [fn,texture,color] of [
 [paintKaikatsuFacade,'kaikatsu',KAIKATSU_BG],
 [paintBamiyanFacade,'bamiyan',BAMIYAN_BG]
]){
 const walls=[],faces=[],reversed=[];
 const poly=[[0,0],[18,0],[18,12],[0,12]];
 assert.equal(fn((m,a,b,c,d,shade)=>walls.push(shade),{},poly,
  {bottom:3,top:6,texturedFaces:faces}),true);
 assert.deepEqual(walls,[color,color,color,color]);
 assert.equal(faces[0].texture,texture);
 assert.equal(fn(()=>{},{},[...poly].reverse(),{bottom:3,top:6,texturedFaces:reversed}),true);
 assert.equal(reversed[0].uvs.filter((_,i)=>i%12===0&&
  reversed[0].uvs.slice(i,i+12).join(',')==='0,0,1,0,1,1,0,0,1,1,0,1').length,4);
}
assert.equal(build(map({...kai.tags,level:''},{...bam.tags,level:''})).texturedFaces.length,0);
assert.equal(build(map({...kai.tags,level:'bad'},{...bam.tags,level:'6'})).texturedFaces.length,0);
assert.equal(build(map({...kai.tags,name:'別店舗'},{...bam.tags,name:'別店舗'})).texturedFaces.length,0);
assert.equal(build(map({...kai.tags,level:'2'},{...bam.tags,level:'2'})).texturedFaces.length,1);
assert.deepEqual(build(map({...kai.tags,brand:'Kaikatsu CLUB',name:'別店舗'},
 {...bam.tags,brand:'Bamiyan',name:'別店舗'})).texturedFaces.map(f=>f.texture).sort(),['bamiyan','kaikatsu']);
assert.equal(matchKaikatsuBuildings([building,{...kai,tags:{name:'快活CLUB',level:'1'}}],project,1000).size,0);
assert.equal(matchFoodBuildings([building,{...bam,tags:{shop:'variety_store',name:'バーミヤン',level:'2'}}],project,1000).size,0);
for(const [name,size] of [['kaikatsu',256],['bamiyan',224]]){
 const png=readFileSync('komorebi3d/assets/textures/brands/'+name+'.png');
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),size);
 assert.equal(png.readUInt32BE(20),size);
}
const saved=globalThis.localStorage,cache=new Map();
globalThis.localStorage={
 get length(){return cache.size;},key(i){return [...cache.keys()][i]??null;},
 getItem(k){return cache.get(k)??null;},setItem(k,v){cache.set(k,String(v));},
 removeItem(k){cache.delete(k);}
};
try{
 cache.set('komorebi3d:osm-tag-changes:v2:node/'+kai.id,JSON.stringify({
  type:'node',id:String(kai.id),osmVersion:null,changes:{level:'3'},tags:null,baseTags:null}));
 const old=map(),next=map();
 assert.equal(applySavedOsmTagChangesToMap(old,{source:'old'}),0);
 assert.equal(applySavedOsmTagChangesToMap(next,{source:'new'}),1);
 assert.ok(build(next).texturedFaces.find(f=>f.texture==='kaikatsu').positions
  .every((v,i)=>i%3!==1||v>=9-1e-8&&v<=12+1e-8));
}finally{
 if(saved===undefined)delete globalThis.localStorage;
 else globalThis.localStorage=saved;
}
const data=map(),original=build(data);
const world={ready:true,sourceMap:data,
 meshes:original.meshes.map((m,i)=>({...m,id:'test:'+i})),
 texturedFaces:[...original.texturedFaces],liveMeshes:new Map(),
 buildingSlices:new Map(),labels:original.labels,mapFeatures:original.mapFeatures};
let offset=0;
for(const batch of original.displayBatches){
 for(const s of batch.buildingSlices||[])world.buildingSlices.set(s.osmKey,
  {meshIndex:offset+s.meshIndex,start:s.start,end:s.end});
 offset+=batch.meshes.length;
}
const geometry=({id,positions,normals,colors})=>({id,positions,normals,colors});
assert.equal(patchLiveGeofabrikMap(world,{type:'node',id:bam.id,
 version:1,changes:{level:'4'}},geometry).applied,true);
assert.ok(world.texturedFaces.find(f=>f.texture==='bamiyan').positions
 .every((v,i)=>i%3!==1||v>=12-1e-8&&v<=15+1e-8));
assert.equal(patchLiveGeofabrikMap(world,{type:'node',id:kai.id,
 version:1,changes:{name:'別店舗',brand:'別店舗'}},geometry).applied,true);
assert.deepEqual(world.texturedFaces.map(f=>f.texture),['bamiyan']);
// Actual POIs are diagnostic only. Unknown levels must never be fabricated.
const root='komorebi3d/maps/data/tiles-2km-geofabrik/';
const index=JSON.parse(readFileSync(root+'index.json','utf8'));
const real=JSON.parse(readFileSync(root+index.tiles['0_0'],'utf8'));
const pois=real.elements.filter(e=>e.type==='node'&&
 [e.tags?.name,e.tags?.brand,e.tags?.['name:ja'],e.tags?.['brand:ja']]
 .some(v=>/快活|kaikatsu|バーミヤン|bamiyan/i.test(String(v||''))));
console.log('Kaikatsu/Bamiyan Geofabrik POIs: '+JSON.stringify(pois.map(e=>({
 id:e.id,name:e.tags?.name,amenity:e.tags?.amenity,shop:e.tags?.shop,level:e.tags?.level}))));
console.log('Kaikatsu/Bamiyan PNG facades PASS: 4-sided UV, zero-based floors, localStorage and live updates');
