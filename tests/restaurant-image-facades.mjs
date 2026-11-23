#!/usr/bin/env node
// PNG/UV restaurant regression: Gusto white wall, Torikizoku yellow wall.
// Uses OSM-style POI data, not hard-coded real shop or building IDs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {matchFoodBuildings,resolveFoodPaint,resolveGustoPaint,resolveTorikizokuPaint}
 from '../komorebi3d/objects/buildings/food/osm-adapter.js';
import {paintGustoFacade,GUSTO_BG}
 from '../komorebi3d/objects/buildings/food/gusto-sign.js';
import {paintTorikizokuFacade,TORIKIZOKU_BG}
 from '../komorebi3d/objects/buildings/food/torikizoku-sign.js';
import {applySavedOsmTagChangesToMap}
 from '../komorebi3d/maps/osm-pending-changes.js';
import {patchLiveGeofabrikMap}
 from '../komorebi3d/maps/map-live-osm-changes.js';

const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const corners=[[-11,-8],[11,-8],[11,8],[-11,8],[-11,-8]].map(([x,z])=>coord(x,z));
const building={type:'way',id:99110011,version:1,
 tags:{building:'yes','building:levels':'6',name:'テスト店舗ビル'},geometry:corners};
const gust={type:'node',id:99110012,version:1,...coord(-3,0),
 tags:{amenity:'restaurant',name:'ガスト テスト店',level:'1'}};
const tori={type:'node',id:99110013,version:1,...coord(3,0),
 tags:{amenity:'restaurant',name:'鳥貴族 テスト店',level:'2'}};
const tile={id:'0_0',gridX:0,gridY:0,sizeM:2000};
const map=(a=gust.tags,b=tori.tags)=>({source:'OpenStreetMap contributors',tile,
 elements:[building,{...gust,tags:{...a}},{...tori,tags:{...b}}]});
const build=data=>buildMap(data,{latitude:lat,longitude:lon,halfSize:1000});
const matched=matchFoodBuildings(map().elements,project,1000);
const found=matched.get(building.id);
assert.deepEqual(found.map(x=>x.brand.id),['gusto','torikizoku']);
assert.equal(resolveFoodPaint(found,building.tags,18).length,0,
 'Image-backed restaurant logos must not paint ordinary food-color stripes');
assert.deepEqual(resolveGustoPaint(found,building.tags,18).map(s=>[s.bottom,s.top]),[[3,6]]);
assert.deepEqual(resolveTorikizokuPaint(found,building.tags,18).map(s=>[s.bottom,s.top]),[[6,9]]);
const result=build(map());
assert.equal(result.counts.buildings,1);
assert.deepEqual(result.texturedFaces.map(x=>x.texture).sort(),['gusto','torikizoku']);
assert.equal(result.displayBatches.flatMap(x=>x.texturedFaces||[]).length,2);
const expectedUV=['1,0,0,0,0,1,1,0,0,1,1,1','0,0,1,0,1,1,0,0,1,1,0,1'];
for(const face of result.texturedFaces){
 assert.equal(face.ownerKey,'way/'+building.id);
 assert.equal(face.uvs.length,face.positions.length/3*2);
 assert.ok(face.uvs.every(Number.isFinite)&&face.positions.every(Number.isFinite));
 const groups=[];
 for(let i=0;i<face.uvs.length;i+=12){
  const group=face.uvs.slice(i,i+12);
  if(expectedUV.includes(group.join(',')))groups.push(i);
  else assert.ok(group.every(v=>v===.04),
   'Every remaining wall samples the same solid brand background');
 }
 assert.equal(groups.length,4,'Four centered logos for '+face.texture);
 const lo=face.texture==='gusto'?3:6,hi=lo+3;
 assert.ok(face.positions.every((p,i)=>i%3!==1||p>=lo-1e-8&&p<=hi+1e-8));
 for(const index of groups){
  const p=face.positions.slice(index/12*18,index/12*18+18);
  const a=p.slice(0,3),b=p.slice(3,6),c=p.slice(6,9);
  assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[2]-a[2])-(c[1]-b[1]))<1e-5,
   'Logo patch must remain square');
 }
}
const wall=[[0,0],[20,0],[20,15],[0,15]];
const walls=[
 {paint:paintGustoFacade,color:GUSTO_BG,texture:'gusto'},
 {paint:paintTorikizokuFacade,color:TORIKIZOKU_BG,texture:'torikizoku'}
];
for(const {paint,color,texture} of walls){
 const quads=[],surfaces=[];
 assert.equal(paint((mesh,a,b,c,d,c0)=>quads.push(c0),{},wall,
  {bottom:3,top:6,texturedFaces:surfaces}),true);
 assert.equal(quads.length,4);
 assert.ok(quads.every(c=>c===color));
 assert.equal(surfaces[0].texture,texture);
 const reversed=[];
 assert.equal(paint(()=>{},{},[wall[3],wall[2],wall[1],wall[0]],
  {bottom:3,top:6,texturedFaces:reversed}),true);
 for(const face of [surfaces[0],reversed[0]])
  assert.equal(face.uvs.filter((_,i)=>i%12===0&&
   expectedUV.includes(face.uvs.slice(i,i+12).join(','))).length,4);
}
assert.equal(build(map({...gust.tags,level:'bad'})).texturedFaces.length,1);
assert.equal(build(map({...gust.tags,level:''}, {...tori.tags,level:''})).texturedFaces.length,0,
 'Missing levels never paint the entire building');
assert.equal(build(map({...gust.tags,level:'6'}, {...tori.tags,level:'7'})).texturedFaces.length,0);
assert.equal(build(map({...gust.tags,name:'別のお店'})).texturedFaces.length,1);
assert.equal(build(map({...gust.tags,name:'Gusto South',level:'0'},
 {...tori.tags,name:'TORIKIZOKU West',level:'2'})).texturedFaces.length,2);
assert.equal(build(map({...gust.tags,level:'2'}, {...tori.tags,level:'2'})).texturedFaces.length,1,
 'Two logos with the same explicit level may not overlap');
// Real Matsudo uses amenity=pub for Torikizoku; do not require restaurant.
assert.equal(matchFoodBuildings([building,{...tori,tags:{
 amenity:'pub',name:'鳥貴族',level:'2'}}],project,1000)
 .get(building.id)?.[0].brand.id,'torikizoku');
assert.equal(matchFoodBuildings([building,{...tori,tags:{
 amenity:'pub',name:'無関係な居酒屋',level:'2'}}],project,1000).size,0);
const nodal={...gust,tags:{...gust.tags,name:'他の店',brand:'ガスト'}};
assert.equal(matchFoodBuildings([building,nodal],project,1000).get(building.id)[0].brand.id,'gusto');
const noBrand=build({source:'OpenStreetMap contributors',tile,elements:[building]});
assert.equal(noBrand.texturedFaces.length,0);
const verts=data=>data.meshes.reduce((sum,m)=>sum+m.positions.length,0);
assert.equal(verts(result)-verts(noBrand),2*4*18,'Only two four-face wall color strips added');

// Validate supplied PNG files are indexed, square, and their actual corner
// palette colors match the intended complete-wall background colors.
function pngCorner(file){
 const data=readFileSync(file),sig=Buffer.from('89504e470d0a1a0a','hex');
 assert.deepEqual(data.subarray(0,8),sig);
 let at=8,palette=null,width=0,height=0,bitDepth=0,colorType=0;
 const idat=[];
 while(at<data.length){
  const len=data.readUInt32BE(at),type=data.toString('ascii',at+4,at+8);
  const bytes=data.subarray(at+8,at+8+len);
  if(type==='IHDR'){width=bytes.readUInt32BE(0);height=bytes.readUInt32BE(4);
   bitDepth=bytes[8];colorType=bytes[9];}
  if(type==='PLTE')palette=bytes;
  if(type==='IDAT')idat.push(bytes);
  at+=len+12;
 }
 assert.equal(width,height,'Logo PNG must be square');
 assert.ok(width>=256,'Logo PNG should have sufficient resolution');
 assert.equal(bitDepth,8);assert.equal(colorType,3);
 const decompressed=inflateSync(Buffer.concat(idat));
 const index=decompressed[1]; // First pixel: filter left/up both start at 0
 return {width,rgb:(palette[index*3]<<16)|(palette[index*3+1]<<8)|palette[index*3+2]};
}
assert.equal(pngCorner('komorebi3d/assets/textures/brands/gusto.png').rgb,GUSTO_BG);
assert.equal(pngCorner('komorebi3d/assets/textures/brands/torikizoku.png').rgb,TORIKIZOKU_BG);

// Current localStorage v2 overlay applies before new-Geofabrik map generation.
const previousStorage=globalThis.localStorage;
const raw=new Map();
globalThis.localStorage={
 get length(){return raw.size;},key(i){return [...raw.keys()][i]??null;},
 getItem(k){return raw.get(k)??null;},setItem(k,v){raw.set(k,String(v));},
 removeItem(k){raw.delete(k);}
};
try{
 raw.set('komorebi3d:osm-tag-changes:v2:node/'+tori.id,
  JSON.stringify({type:'node',id:String(tori.id),osmVersion:null,
   changes:{level:'3'},tags:null,baseTags:null}));
 const old=map();assert.equal(applySavedOsmTagChangesToMap(old,{source:'old'}),0);
 assert.equal(old.elements[2].tags.level,'2');
 const fresh=map();assert.equal(applySavedOsmTagChangesToMap(fresh,{source:'new'}),1);
 assert.equal(fresh.elements[2].tags.level,'3');
 assert.ok(build(fresh).texturedFaces.find(x=>x.texture==='torikizoku')
  ?.positions.every((p,i)=>i%3!==1||p>=9-1e-8&&p<=12+1e-8));
}finally{
 if(previousStorage===undefined)delete globalThis.localStorage;
 else globalThis.localStorage=previousStorage;
}
// Live editing should replace the building's material set without a full reload.
const data=map();
const built=build(data);
const world={ready:true,sourceMap:data,
 meshes:built.meshes.map((m,i)=>({...m,id:'test:'+i})),
 texturedFaces:[...built.texturedFaces],liveMeshes:new Map(),buildingSlices:new Map(),
 labels:built.labels,mapFeatures:built.mapFeatures};
let offset=0;
for(const batch of built.displayBatches){
 for(const slice of batch.buildingSlices||[])
  world.buildingSlices.set(slice.osmKey,
   {meshIndex:offset+slice.meshIndex,start:slice.start,end:slice.end});
 offset+=batch.meshes.length;
}
const geometry=({id,positions,normals,colors})=>({id,positions,normals,colors});
const changed=patchLiveGeofabrikMap(world,{type:'node',id:gust.id,
 version:1,changes:{level:'3'}},geometry);
assert.equal(changed.applied,true);
assert.equal(world.texturedFaces.length,2);
assert.ok(world.texturedFaces.find(x=>x.texture==='gusto').positions
 .every((p,i)=>i%3!==1||p>=9-1e-8&&p<=12+1e-8));
const removed=patchLiveGeofabrikMap(world,{type:'node',id:tori.id,
 version:1,changes:{name:'別店',brand:'別店'}},geometry);
assert.equal(removed.applied,true);
assert.deepEqual(world.texturedFaces.map(x=>x.texture),['gusto']);

// Diagnostic only for actual OSM POIs (possibly without level or footprint):
// actual Matsudo data is authoritative, so never invent a floor.
const index=JSON.parse(readFileSync('komorebi3d/maps/data/tiles-2km-geofabrik/index.json','utf8'));
const live=JSON.parse(readFileSync('komorebi3d/maps/data/tiles-2km-geofabrik/'+index.tiles['0_0'],'utf8'));
const names=live.elements.filter(e=>
 [e.tags?.name,e.tags?.brand,e.tags?.['name:ja'],e.tags?.['brand:ja']]
  .some(n=>/ガスト|鳥貴族|gusto|torikizoku/i.test(String(n||''))));
console.log('Restaurant logo actual Geofabrik POIs: '+JSON.stringify(names.slice(0,30).map(e=>({
 type:e.type,id:e.id,amenity:e.tags?.amenity,shop:e.tags?.shop,
 name:e.tags?.name,brand:e.tags?.brand,level:e.tags?.level
}))));
const realMatched=matchFoodBuildings(live.elements,project,1000);
const realBuilder=buildMap(live,{halfSize:1000});
const realFacades=realBuilder.texturedFaces.filter(f=>['gusto','torikizoku'].includes(f.texture));
const ownerList=[...realMatched.entries()].flatMap(([id,stores])=>
 stores.filter(s=>['gusto','torikizoku'].includes(s.brand.id))
  .map(s=>({id,brand:s.brand.id,level:s.level})));
console.log('Restaurant actual Matsudo matched buildings: '+JSON.stringify(ownerList));
console.log('Restaurant actual Matsudo UV facades: '+JSON.stringify(
 realFacades.map(f=>({texture:f.texture,owner:f.ownerKey,
  minY:Math.min(...f.positions.filter((_,i)=>i%3===1)),
  maxY:Math.max(...f.positions.filter((_,i)=>i%3===1))}))));
const validRealBrands=new Set(ownerList.filter(s=>/^\d+$/.test(String(s.level||''))).map(s=>s.brand));
for(const brand of validRealBrands)
 assert.ok(realFacades.some(f=>f.texture===brand),
  'Actual tagged Matsudo '+brand+' must generate at least one UV wall');
console.log('Restaurant PNG brand facades PASS: white Gusto, cropped-yellow Torikizoku, four UV sides, levels, localStorage, live edit, regression');
