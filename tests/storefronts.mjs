#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {identifyLogoBrand,matchLogoBuildings,paintLogoBuilding,contiguousLogoGroups} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
import {matchFoodBuildings,resolveFoodPaint} from '../komorebi3d/objects/buildings/food/osm-adapter.js';
import {applySavedOsmTagChangesToMap} from '../komorebi3d/maps/osm-pending-changes.js';
import {patchLiveGeofabrikMap} from '../komorebi3d/maps/map-live-osm-changes.js';
import {matchConvenienceBuildings} from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';
const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const building={type:'way',id:880001,tags:{building:'yes','building:levels':'6'},geometry:[[-12,-10],[12,-10],[12,10],[-12,10],[-12,-10]].map(([x,z])=>coord(x,z))};
const poi=(id,name,category,level='2')=>({type:'node',id,...coord(0,0),tags:{...category,name,level}});
const map=tenant=>({elements:[building,tenant]});
const build=tenant=>buildMap(map(tenant),{latitude:lat,longitude:lon,halfSize:1000});
const cases=[
 ['星乃珈琲店',{},'hoshino'],
 ['ローソン',{},'lawson'],
 ['ドトールコーヒーショップ 松戸店',{amenity:'cafe'},'doutor'],
 ['DOUTOR Matsudo',{},'doutor'],
 ['大黒屋 松戸店',{shop:'pawnbroker'},'daikokuya'],
 ['チケット大黒屋 松戸店',{},'daikokuya'],
 ['ウエルシア 松戸店',{shop:'chemist'},'welcia'],
 ['ウェルシア 松戸店',{amenity:'pharmacy'},'welcia'],
 ['Welcia Matsudo',{},'welcia'],
 ['磯丸水産 松戸駅前店',{amenity:'pub'},'isomaru'],
 ['磯丸水産 松戸駅前店',{amenity:'restaurant'},'isomaru'],
 ['磯丸水産 松戸駅前店',{office:'company'},'isomaru'],
 ['マクドナルド 松戸店',{shop:'yes'},'mcdonalds'],
 ['ダイソー 松戸店',{amenity:'restaurant'},'daiso'],
 ['快活CLUB 松戸店',{office:'company'},'kaikatsu'],
 ['ガスト 松戸店',{shop:'yes'},'gusto'],
 ['バーミヤン 松戸店',{amenity:'pub'},'bamiyan'],
 ['鳥貴族 松戸店',{shop:'yes'},'torikizoku'],
 ['磯丸水産 松戸駅前店',{},'isomaru'],
 ['吉野家 松戸駅前店',{amenity:'fast_food'},'yoshinoya'],
 ['熱烈中華食堂日高屋 松戸店',{amenity:'restaurant'},'hidakaya'],
 ['とんかつとん一',{amenity:'restaurant'},'tonkatsuTonichi'],
 ['とんかつとん一 松戸店',{shop:'yes'},'tonkatsuTonichi']
];
for(const [name,category,texture] of cases){
 const tenant=poi(880002,name,category);
 assert.equal(identifyLogoBrand(tenant.tags)?.id,texture,name);
 const matches=matchLogoBuildings(map(tenant).elements,project,1000).get(building.id);
 assert.equal(matches?.[0]?.brand.id,texture,name+' matched to footprint');
 const faces=build(tenant).texturedFaces;
 assert.equal(faces.length,1,name+' should paint exactly one storey');
 assert.equal(faces[0].texture,texture);
 assert.equal(faces[0].ownerKey,'way/'+building.id);
 assert.ok(faces[0].positions.every((n,i)=>i%3!==1||(n>=6-1e-8&&n<=9+1e-8)));
}
for(const [name,id] of [['DOUTOR','doutor'],['大黒屋','daikokuya']]){
 assert.equal(identifyLogoBrand({brand:name})?.id,id);
 for(const level of ['0','0;1','2']){
  const faces=build(poi(880002,name,{},level)).texturedFaces;
  assert.equal(faces.length,1);
  assert.equal(faces[0].texture,id);
 }
 for(const level of ['','6','1;;2'])assert.equal(build(poi(880002,name,{},level)).texturedFaces.length,0);
}
assert.equal(identifyLogoBrand({brand:'Welcia'})?.id,'welcia');
assert.equal(build(poi(880002,'ウエルシア',{shop:'chemist'},'')).texturedFaces.length,0);
assert.equal(build(poi(880002,'ウエルシア',{shop:'chemist'},'6')).texturedFaces.length,0);
for(const level of ['0','0;1','2']){
 const faces=build(poi(880002,'ウエルシア',{shop:'chemist'},level)).texturedFaces;
 assert.equal(faces.length,1);
 assert.equal(faces[0].texture,'welcia');
}
// A similarly named unrelated restaurant must never claim the Tonichi branding.
assert.notEqual(identifyLogoBrand({name:'とんかつ松乃家'})?.id,'tonkatsuTonichi');
assert.equal(build(poi(880002,'とんかつとん一',{amenity:'restaurant'},'')).texturedFaces.length,0);
assert.equal(build(poi(880002,'とんかつとん一',{amenity:'restaurant'},'6')).texturedFaces.length,0);
// One fixed-size logo centered across each contiguous group, including level=0.
const fullLogoUV=new Set(['1,0,0,0,0,1,1,0,0,1,1,1','0,0,1,0,1,1,0,0,1,1,0,1']);
function logoCenters(face){
 const centers=[],heights=[];
 for(let i=0;i<face.uvs.length;i+=12){
  if(!fullLogoUV.has(face.uvs.slice(i,i+12).join(',')))continue;
  const p=face.positions.slice(i/12*18,i/12*18+18);
  centers.push((p[1]+p[7])/2);
  heights.push(p[7]-p[1]);
 }
 return {centers,heights};
}
const baseline=build(poi(880002,'磯丸水産',{amenity:'pub'},'2')).texturedFaces;
assert.equal(baseline.length,1);
const baseHeight=logoCenters(baseline[0]).heights[0];
const groundBaseline=build(poi(880002,'磯丸水産',{amenity:'pub'},'0')).texturedFaces;
assert.equal(groundBaseline.length,1);
const groundHeight=logoCenters(groundBaseline[0]).heights[0];
assert.ok(groundHeight<baseHeight,'Ground-only stores use the compact convenience sign');
assert.ok(Math.abs(baseHeight-2.65)<1e-8,'Full-size upper-floor brand logo remains 2.65m');
for(const [name,level,low,high,center] of [
 ['磯丸水産','2;3;4',6,15,10.5], // Three floors -> middle floor
 ['磯丸水産','0;1;2',0,9,5.7],  // Ground joins the upper levels
 ['磯丸水産','0;1;2;3',0,12,7.2], // Four floors -> boundary of middle floors
 ['快活CLUB','1;2;3;4',3,15,9]
]){
 const faces=build(poi(880002,name,{amenity:'pub'},level)).texturedFaces;
 assert.equal(faces.length,1,name+' contiguous levels must make one wall surface');
 assert.equal(faces[0].texture,name==='快活CLUB'?'kaikatsu':'isomaru');
 assert.ok(faces[0].positions.every((n,i)=>i%3!==1||(n>=low-1e-8&&n<=high+1e-8)));
 const logos=logoCenters(faces[0]);
 assert.equal(logos.centers.length,level.startsWith('0;')?1:4,
  'Ground-inclusive groups use entrance face only; upper-only groups keep four faces');
 for(const y of logos.centers)assert.ok(Math.abs(y-center)<1e-8,'Logo must be vertically centered');
 for(const h of logos.heights)assert.ok(Math.abs(h-baseHeight)<1e-8,
  'Ground+upper groups restore the full-size brand logo; upper-only stays unchanged');
}
assert.equal(build(poi(880002,'ウエルシア',{shop:'chemist'},'1;2;3;')).texturedFaces.length,1);
assert.equal(build(poi(880002,'ウエルシア',{shop:'chemist'},'1;;3')).texturedFaces.length,0);
const split=build(poi(880002,'磯丸水産',{amenity:'pub'},'0;1;3;4')).texturedFaces;
assert.equal(split.length,2,'Non-contiguous groups keep separate centered logos');
assert.deepEqual(split.map(f=>logoCenters(f).centers[0]),[4.2,12]);
assert.deepEqual(contiguousLogoGroups([
 {bottom:9,top:12},{bottom:0,top:3},{bottom:3,top:6}
]).map(g=>[g.bottom,g.top]),[[0,6],[9,12]]);
assert.equal(build(poi(880002,'磯丸水産',{amenity:'pub'},'')).texturedFaces.length,0);
assert.equal(build(poi(880002,'磯丸水産',{amenity:'pub'},'6')).texturedFaces.length,0);
assert.equal(build(poi(880002,'知らない店舗',{amenity:'pub'})).texturedFaces.length,0);
const noPoint={...poi(880002,'磯丸水産',{amenity:'pub'}),lat:lat+0.02};
assert.equal(build(noPoint).texturedFaces.length,0);
const mcd=poi(880002,'マクドナルド',{amenity:'fast_food'});
assert.equal(matchFoodBuildings(map(mcd).elements,project,1000).get(building.id)[0].brand.id,'mcdonalds');
assert.equal(resolveFoodPaint(matchFoodBuildings(map(mcd).elements,project,1000).get(building.id),building.tags,18).length,0,'legacy opaque food renderer must not draw image-backed logos');
// Public adapter remains available for callers outside the map builder.
const painted=[];
const matched=matchLogoBuildings(map(mcd).elements,project,1000).get(building.id);
assert.equal(paintLogoBuilding(()=>{}, {},[[0,0],[24,0],[24,20],[0,20]],matched,building.tags,18,null,painted,'way/880001',[]),1);
console.log('Industry-independent logos: category independence, Yoshinoya/Hidakaya migration, multi-floor and guards PASS');

for(const name of ['ローソンストア100','LAWSON STORE 100','ナチュラルローソン','Natural LAWSON']){
 assert.notEqual(identifyLogoBrand({name,brand:'LAWSON'})?.id,'lawson');
}
assert.equal(identifyLogoBrand({name:'楽天モバイル 松戸店'})?.id,'rakuten-mobile');
assert.equal(identifyLogoBrand({name:'楽天銀行'}),null);
assert.equal(matchConvenienceBuildings(map(poi(880002,'ローソン',{shop:'convenience'},'0')).elements,project,1000).has(building.id),false);
assert.equal(matchConvenienceBuildings(map(poi(880002,'LAWSON STORE 100',{shop:'convenience',brand:'LAWSON'},'0')).elements,project,1000).get(building.id)?.[0]?.brand.id,'lawson-store100');
assert.equal(build(poi(880002,'ローソン',{},'')).texturedFaces.length,0);
assert.equal(build(poi(880002,'楽天モバイル',{},'0')).texturedFaces[0]?.texture,'rakutenMobile');

// Representative two-tenant saved overlay and live geometry update.
{
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
}
