#!/usr/bin/env node
// DAISO PNG facade regression: real OSM-style POI tags, no fixed site IDs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchDaisoBuildings,resolveDaisoPaint}
 from '../komorebi3d/objects/buildings/variety/osm-adapter.js';
import {matchConvenienceBuildings,resolveConveniencePaint}
 from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';
import {matchFoodBuildings,resolveFoodPaint,resolveMcDonaldsPaint}
 from '../komorebi3d/objects/buildings/food/osm-adapter.js';
import {paintDaisoFacade,DAISO_BG}
 from '../komorebi3d/objects/buildings/variety/daiso-sign.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {applySavedOsmTagChangesToMap}
 from '../komorebi3d/maps/osm-pending-changes.js';
import {patchLiveGeofabrikMap}
 from '../komorebi3d/maps/map-live-osm-changes.js';

const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const outline=[[-9,-7],[9,-7],[9,7],[-9,7],[-9,-7]].map(([x,z])=>coord(x,z));
const building={type:'way',id:987654321,version:2,tags:{
 building:'yes','building:levels':'4',name:'テスト複合ビル'
},geometry:outline};
const node={type:'node',id:123456789,version:1,...coord(0,0),
 tags:{shop:'variety_store',name:'DAISO 松戸テスト',level:'1'}};
const mapFor=(tags=node.tags,extras=[])=>({source:'OpenStreetMap contributors',
 tile:{id:'0_0',gridX:0,gridY:0,sizeM:2000},
 elements:[building,{...node,tags:{...tags}},...extras]});
const render=(tags=node.tags,extras=[])=>
 buildMap(mapFor(tags,extras),{latitude:lat,longitude:lon,halfSize:1000});

const matches=matchDaisoBuildings(mapFor().elements,project,1000);
assert.equal(matches.get(building.id)?.[0].brand.id,'daiso');
assert.equal(matches.get(building.id)?.[0].level,'1');
assert.deepEqual(resolveDaisoPaint(matches.get(building.id),building.tags,12)
 .map(s=>[s.bottom,s.top]),[[3,6]],'level 1 is the second floor');
const full=render();
assert.equal(full.counts.buildings,1);
assert.equal(full.texturedFaces.length,1);
const face=full.texturedFaces[0];
assert.equal(face.texture,'daiso');
assert.equal(face.ownerKey,'way/'+building.id);
assert.equal(face.positions.length/3*2,face.uvs.length);
assert.ok(face.positions.every(Number.isFinite)&&face.uvs.every(Number.isFinite));
assert.ok(face.positions.filter((_,i)=>i%3===1).every(y=>y>=3&&y<=6));
assert.equal(full.displayBatches.flatMap(b=>b.texturedFaces||[]).length,1);
const logos=[];
for(let i=0;i<face.uvs.length;i+=12){
 const group=face.uvs.slice(i,i+12);
 if(group.join(',')==='1,0,0,0,0,1,1,0,0,1,1,1')logos.push(i/12);
 else assert.ok(group.every(u=>u===.04),'Other walls sample solid pink corner');
}
assert.equal(logos.length,4,'One logo per main facade');
// Physical exterior view of a footprint edge reverses the path direction.
// Its world-start corner must sample PNG RIGHT (u=1), and its world-end
// corner PNG LEFT (u=0), otherwise DAISO reads as a mirror image.
for(const index of logos){
 const block=face.uvs.slice(index*12,index*12+12);
 assert.deepEqual(block.slice(0,6),[1,0,0,0,0,1],
  'The exterior-facing letter orientation must not be mirrored');
}

for(const index of logos){
 const ps=face.positions.slice(index*18,index*18+18);
 const a=ps.slice(0,3),b=ps.slice(3,6),c=ps.slice(6,9);
 assert.ok(Math.abs(Math.hypot(a[0]-b[0],a[2]-b[2])-(c[1]-b[1]))<1e-5,
  'Image wall patch must remain square');
}
const noShop=render({name:'DAISO',level:'1'});
assert.equal(noShop.texturedFaces.length,1,'Logo identity is independent of shop/amenity categories');
assert.equal(render({shop:'variety_store',name:'別の百円ショップ',level:'1'})
 .texturedFaces.length,0);
assert.equal(render({shop:'variety_store',name:'ダイソー'})
 .texturedFaces.length,0,'Missing level must not color an entire building');
assert.equal(render({shop:'variety_store',name:'ダイソー',level:'bad'})
 .texturedFaces.length,0,'Invalid level is not guessed');
assert.equal(render({shop:'variety_store',name:'ダイソー',level:'9'})
 .texturedFaces.length,0,'Out of range level is rejected');
assert.equal(render({shop:'discount',name:'ザ・ダイソー',level:'2'})
 .texturedFaces[0]?.texture,'daiso');
assert.equal(render({shop:'houseware',name:'違う店',brand:'DAISO',level:'0'})
 .texturedFaces[0]?.texture,'daiso');
const third=render({...node.tags,level:'2'});
assert.ok(third.texturedFaces[0].positions.filter((_,i)=>i%3===1)
 .every(y=>y>=6-1e-8&&y<=9+1e-8));

// The full-band pink background is the exact same surface technique as McD.
const quads=[],uv=[];
assert.equal(paintDaisoFacade((mesh,a,b,c,d,color)=>quads.push({a,b,c,d,color}),{},
 [[0,0],[18,0],[18,12],[0,12]],{bottom:3,top:6,texturedFaces:uv}),true);
assert.equal(quads.length,4);
assert.ok(quads.every(q=>q.color===DAISO_BG));
assert.equal(uv[0].texture,'daiso');
// Reversed OSM polygon winding reverses the visible wall direction. The
// generator must adapt U so the letters remain readable from outside.
const cwUV=[];
assert.equal(paintDaisoFacade(()=>{},{},
 [[0,12],[18,12],[18,0],[0,0]],{bottom:3,top:6,texturedFaces:cwUV}),true);
const normalUV='1,0,0,0,0,1,1,0,0,1,1,1';
const reversedUV='0,0,1,0,1,1,0,0,1,1,0,1';
assert.equal(uv[0].uvs.filter((_,i)=>i%12===0&&
 uv[0].uvs.slice(i,i+12).join(',')===normalUV).length,4,
 'Positive-winding facades sample PNG right-to-left along the edge');
assert.equal(cwUV[0].uvs.filter((_,i)=>i%12===0&&
 cwUV[0].uvs.slice(i,i+12).join(',')===reversedUV).length,4,
 'Negative-winding facades sample PNG left-to-right along the edge');
const withoutDaiso=render({shop:'books',name:'架空書店',level:'1'});
const verts=r=>r.meshes.reduce((sum,m)=>sum+m.positions.length,0);
assert.equal(verts(full)-verts(withoutDaiso),8*18,
 'Each original wall is split into two ordinary bands and one fallback band');
const otherTenant={type:'node',id:333222444,version:1,...coord(2,0),
 tags:{shop:'convenience',name:'ファミリーマート 松戸',level:'1'}};
assert.equal(render(node.tags,[otherTenant]).texturedFaces.length,0,
 'DAISO must not paint over an existing convenience-store facade');
const unknownFloorYoshinoya={type:'node',id:222999888,version:1,...coord(1,0),
 tags:{amenity:'fast_food',name:'吉野家'}};
assert.deepEqual(render(node.tags,[unknownFloorYoshinoya]).texturedFaces.map(f=>f.texture),['daiso'],
 'A logo tenant with UNKNOWN level may not block an explicitly leveled DAISO floor');
const knownFloorYoshinoya={...unknownFloorYoshinoya,
 tags:{...unknownFloorYoshinoya.tags,level:'1'}};
assert.deepEqual(render(node.tags,[knownFloorYoshinoya]).texturedFaces.map(f=>f.texture),['daiso'],
 'One explicit shared floor must have one image facade, never both DAISO and Yoshinoya');
assert.deepEqual(render({...node.tags,name:'架空書店'},[knownFloorYoshinoya])
 .texturedFaces.map(f=>f.texture),['yoshinoya'],
 'Yoshinoya must paint its own level when DAISO is absent');
const otherMc={type:'node',id:444333222,version:1,...coord(2,0),
 tags:{amenity:'fast_food',name:'マクドナルド',level:'2'}};
assert.deepEqual(render(node.tags,[otherMc]).texturedFaces.map(s=>s.texture).sort(),
 ['daiso','mcdonalds'],'Distinct levels can carry different PNGs');

// Canonical localStorage overlays must apply to new Geofabrik only.
const cache=new Map();
globalThis.localStorage={
 get length(){return cache.size;},
 key(i){return [...cache.keys()][i]??null;},
 getItem(k){return cache.get(k)??null;},
 setItem(k,v){cache.set(k,String(v));},
 removeItem(k){cache.delete(k);}
};
cache.set('komorebi3d:osm-tag-changes:v2:node/'+node.id,
 JSON.stringify({type:'node',id:String(node.id),osmVersion:null,
 changes:{level:'2'},tags:null,baseTags:null}));
const old=mapFor();
assert.equal(applySavedOsmTagChangesToMap(old,{source:'old'}),0);
assert.equal(old.elements[1].tags.level,'1');
const changed=mapFor();
assert.equal(applySavedOsmTagChangesToMap(changed,{source:'new'}),1);
assert.equal(changed.elements[1].tags.level,'2');
assert.ok(buildMap(changed,{latitude:lat,longitude:lon,halfSize:1000})
 .texturedFaces[0].positions.filter((_,i)=>i%3===1).every(y=>y>=6&&y<=9));

// A live local save/release must replace the one owner's UV facade.
const original=mapFor();
const result=buildMap(original,{latitude:lat,longitude:lon,halfSize:1000});
const world={ready:true,sourceMap:original,
 meshes:result.meshes.map((m,i)=>({...m,id:'daiso-test:'+i})),
 texturedFaces:[...result.texturedFaces],liveMeshes:new Map(),
 buildingSlices:new Map(),mapFeatures:result.mapFeatures,labels:result.labels};
let offset=0;
for(const batch of result.displayBatches){
 for(const span of batch.buildingSlices||[])
  world.buildingSlices.set(span.osmKey,{
   meshIndex:offset+span.meshIndex,start:span.start,end:span.end
  });
 offset+=batch.meshes.length;
}
const geometry=({id,positions,normals,colors})=>({id,positions,normals,colors});
const update=patchLiveGeofabrikMap(world,{type:'node',id:node.id,
 version:1,changes:{level:'2'}},geometry);
assert.equal(update.applied,true);
assert.equal(world.texturedFaces.length,1);
assert.notStrictEqual(world.texturedFaces[0],result.texturedFaces[0]);
assert.ok(world.texturedFaces[0].positions.filter((_,i)=>i%3===1)
 .every(y=>y>=6-1e-8&&y<=9+1e-8));
assert.equal(patchLiveGeofabrikMap(world,{type:'node',id:node.id,
 version:1,changes:{name:'ほかのお店'}},geometry).applied,true);
assert.equal(world.texturedFaces.length,0);

const image=readFileSync('komorebi3d/assets/textures/brands/daiso.png');
assert.equal(image.subarray(1,4).toString(),'PNG');
assert.equal(image.readUInt32BE(16),554);
assert.equal(image.readUInt32BE(20),554);
assert.deepEqual([...image.subarray(41,44)],[245,0,140],
 'The uploaded image corner must be the bright pink used on DAISO walls');
// Read-only diagnostic: distinguish working code from actual OSM POI data
// in the checked-in Geofabrik 2km tile, without inventing a missing level.
const tileRoot='komorebi3d/maps/data/tiles-2km-geofabrik/';
const tileIndex=JSON.parse(readFileSync(tileRoot+'index.json','utf8'));
const tile=JSON.parse(readFileSync(tileRoot+tileIndex.tiles['0_0'],'utf8'));
const realShops=tile.elements.filter(e=>e.tags?.shop&&
 [e.tags.name,e.tags.brand,e.tags['name:ja'],e.tags['brand:ja']]
  .some(s=>/daiso|ダイソー/i.test(String(s||''))));
console.log('DAISO current Geofabrik tile POIs: '+JSON.stringify(
 realShops.map(e=>({type:e.type,id:e.id,shop:e.tags.shop,
  name:e.tags.name,brand:e.tags.brand,level:e.tags.level})).slice(0,20)));
const actualMatched=matchDaisoBuildings(tile.elements,project,1000);
const ownerIds=[...actualMatched.keys()];
console.log('DAISO actual footprint owner IDs: '+JSON.stringify(ownerIds));
for(const id of ownerIds){
 const way=tile.elements.find(e=>e.type==='way'&&String(e.id)===String(id));
 const tags=way?.tags||{};
 const levels=Number(tags['building:levels']);
 const height=Number(tags.height)||levels*3;
 console.log('DAISO actual owner metadata: '+JSON.stringify({
  id,tags:{height:tags.height,'building:levels':tags['building:levels'],
   'building:min_level':tags['building:min_level'],min_height:tags.min_height},
  computedHeight:height,
  spans:resolveDaisoPaint(actualMatched.get(id),tags,height)
   .map(x=>({bottom:x.bottom,top:x.top,brand:x.brand.id})),
  convenienceSpans:resolveConveniencePaint(
   matchConvenienceBuildings(tile.elements,project,1000).get(id),tags,height)
   .map(x=>({bottom:x.bottom,top:x.top,brand:x.brand?.id})),
  foodSpans:resolveFoodPaint(
   matchFoodBuildings(tile.elements,project,1000).get(id),tags,height)
   .map(x=>({bottom:x.bottom,top:x.top,brand:x.brand?.id})),
  mcSpans:resolveMcDonaldsPaint(
   matchFoodBuildings(tile.elements,project,1000).get(id),tags,height)
   .map(x=>({bottom:x.bottom,top:x.top,brand:x.brand?.id}))
 }));
}
if(realShops.some(e=>e.type==='node'&&/^\d+$/.test(String(e.tags.level||'')))){
 const actual3D=buildMap(tile,{halfSize:1000});
 const actualFaces=actual3D.texturedFaces.filter(f=>f.texture==='daiso');
 console.log('DAISO actual UV faces: '+JSON.stringify(actualFaces.map(f=>({
  owner:f.ownerKey,vertices:f.positions.length/3,
  minY:Math.min(...f.positions.filter((_,i)=>i%3===1)),
  maxY:Math.max(...f.positions.filter((_,i)=>i%3===1))
 }))));
 assert.ok(actualFaces.length>0,'A tagged real-tile DAISO must produce a textured facade');
}
console.log('DAISO PNG facade PASS: name/brand/level, four square UV logos, localStorage, live updates, McDonalds coexistence');
