#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {identifyLogoBrand,matchLogoBuildings,paintLogoBuilding,contiguousLogoGroups} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
import {matchFoodBuildings,resolveFoodPaint} from '../komorebi3d/objects/buildings/food/osm-adapter.js';
const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const building={type:'way',id:880001,tags:{building:'yes','building:levels':'6'},geometry:[[-12,-10],[12,-10],[12,10],[-12,10],[-12,-10]].map(([x,z])=>coord(x,z))};
const poi=(id,name,category,level='2')=>({type:'node',id,...coord(0,0),tags:{...category,name,level}});
const map=tenant=>({elements:[building,tenant]});
const build=tenant=>buildMap(map(tenant),{latitude:lat,longitude:lon,halfSize:1000});
const cases=[
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
 for(const h of logos.heights)assert.ok(Math.abs(h-baseHeight)<1e-8,'Logo size must not grow across floors');
}
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
