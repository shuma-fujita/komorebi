#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {paintMcDonaldsFacade,MC_SIGN_BG,MC_SIGN_GOLD}
 from '../komorebi3d/objects/buildings/food/mcdonalds-sign.js';
import {matchFoodBuildings,resolveMcDonaldsPaint,resolveFoodPaint}
 from '../komorebi3d/objects/buildings/food/osm-adapter.js';
import {applySavedOsmTagChangesToMap}
 from '../komorebi3d/maps/osm-pending-changes.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';

const lat=35.78444,lon=139.90061,scale=111320*Math.cos(lat*Math.PI/180);
const xy=p=>[(p.lon-lon)*scale,-(p.lat-lat)*111320];
const root=join('komorebi3d','maps','data','tiles-2km-geofabrik');
const index=JSON.parse(readFileSync(join(root,'index.json'),'utf8'));
const live=JSON.parse(readFileSync(join(root,index.tiles['0_0']),'utf8'));
// Fixture IDs locate real OSM geometry for the test only. Production source
// never depends on these identifiers, so renaming them MUST still work.
const node=live.elements.find(e=>e.type==='node'&&String(e.id)==='2992364618');
const building=live.elements.find(e=>e.type==='way'&&String(e.id)==='72709443');
assert.ok(node&&building,'Expected station-front OSM fixtures');
assert.equal(building.tags.name,'ピアザ松戸ビル');
const poi={...node,id:92223333,tags:{...node.tags,name:"McDonald's 松戸テスト",level:'2'}};
const way={...building,id:83332222};
const elements=[poi,way];
const matched=matchFoodBuildings(elements,xy,1000);
assert.equal(matched.get(way.id)?.[0].brand.id,'mcdonalds');
assert.equal(matched.get(way.id)?.[0].level,'2');
assert.equal(resolveFoodPaint(matched.get(way.id),way.tags,27).length,0,
 'McDonalds must not be painted as an ordinary food stripe');
const height=Number(way.tags['building:levels'])*3;
const floor=height/Number(way.tags['building:levels']);
const spans=resolveMcDonaldsPaint(matched.get(way.id),way.tags,height);
assert.deepEqual(spans.map(s=>[s.bottom,s.top]),[[2*floor,3*floor]],
 'Zero-based level 2 is the third floor, not the second');
function renderAt(level,poiTags={}){
 const shop={...poi,tags:{...poi.tags,...poiTags,level:String(level)}};
 return buildMap({source:'OpenStreetMap contributors',elements:[way,shop]},
  {latitude:lat,longitude:lon,halfSize:1000});
}
const rendered=renderAt(2);
assert.equal(rendered.counts.buildings,1);
assert.equal(rendered.texturedFaces.length,1);
assert.equal(rendered.texturedFaces[0].texture,'mcdonalds');
assert.equal(rendered.texturedFaces[0].ownerKey,'way/'+way.id);
const surface=rendered.texturedFaces[0];
assert.ok(surface.positions.every(Number.isFinite));
assert.ok(surface.uvs.every(Number.isFinite));
assert.equal(surface.uvs.length,surface.positions.length/3*2);
const squares=[];
for(let i=0;i<surface.uvs.length;i+=12){
 const block=surface.uvs.slice(i,i+12);
 if(block.join(',')==='0,0,1,0,1,1,0,0,1,1,0,1')squares.push(i);
 else assert.ok(block.every(v=>v===.04),'All non-logo walls sample PNG corner red');
}
assert.equal(squares.length,4,'One image on each of four primary walls');
for(const i of squares){
 const p=surface.positions.slice(i/12*18,i/12*18+18);
 const vertices=Array.from({length:6},(_,j)=>p.slice(j*3,j*3+3));
 assert.ok(vertices.every(v=>v[1]>2*floor&&v[1]<3*floor));
 const a=vertices[0],b=vertices[1],c=vertices[2];
 assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[2]-a[2])-(c[1]-b[1]))<1e-5,
  'PNG must retain square aspect on wall');
}
assert.equal(rendered.displayBatches.flatMap(b=>b.texturedFaces||[]).length,1);
const raised=renderAt(1);
assert.equal(raised.texturedFaces.length,1);
const uvAtLevel=result=>result.texturedFaces[0].positions.filter((_,i)=>i%3===1);
assert.ok(Math.min(...uvAtLevel(raised))>=floor-1e-8);
assert.ok(Math.max(...uvAtLevel(raised))<=2*floor+1e-8);
assert.equal(renderAt('x').texturedFaces.length,0,'Invalid level: no facade');
const missing=buildMap({source:'OpenStreetMap contributors',
 elements:[way,{...poi,tags:{amenity:'fast_food',name:'McDonalds'}}]},
 {latitude:lat,longitude:lon,halfSize:1000});
assert.equal(missing.texturedFaces.length,0,'Missing level does not paint whole building');
const buildingOnly=buildMap({source:'OpenStreetMap contributors',
 elements:[{...way,tags:{...way.tags,level:'2'}},{...poi,tags:{amenity:'fast_food',name:'マクドナルド'}}]},
 {latitude:lat,longitude:lon,halfSize:1000});
assert.equal(buildingOnly.texturedFaces.length,0,
 'Building level alone is not a tenant floor');
const nonMc=buildMap({source:'OpenStreetMap contributors',
 elements:[way,{...poi,tags:{amenity:'fast_food',name:'別の飲食店',level:'2'}}]},
 {latitude:lat,longitude:lon,halfSize:1000});
assert.equal(nonMc.texturedFaces.length,0);
const noPoi=buildMap({source:'OpenStreetMap contributors',elements:[way]},
 {latitude:lat,longitude:lon,halfSize:1000});
assert.equal(noPoi.texturedFaces.length,0);
const vertexCount=result=>result.meshes.reduce((n,m)=>n+m.positions.length,0);
const redQuads=rendered.meshes.flatMap(mesh=>mesh.colors).length-
 noPoi.meshes.flatMap(mesh=>mesh.colors).length;
const walls=way.geometry.slice(0,-1).length;
assert.equal(redQuads,walls*18,'Only red fallback perimeter adds fixed Engine triangles');
assert.equal(vertexCount(rendered)-vertexCount(noPoi),walls*18);
const notched=[[0,0],[18,0],[18,12],[0,12]],quads=[],uv=[];
assert.equal(paintMcDonaldsFacade((mesh,a,b,c,d,color)=>quads.push({a,b,c,d,color}),{},notched,
 {bottom:6,top:9,texturedFaces:uv}),true);
assert.equal(quads.filter(q=>q.color===MC_SIGN_BG).length,4);
assert.equal(quads.filter(q=>q.color===MC_SIGN_GOLD).length,0);
assert.equal(uv.length,1);
assert.equal(paintMcDonaldsFacade(()=>{}, {},notched,{bottom:10,top:10}),false);
const fallback=[];
assert.equal(paintMcDonaldsFacade((m,a,b,c,d,color)=>fallback.push(color),{},notched,
 {bottom:6,top:9}),true);
assert.equal(fallback.filter(c=>c===MC_SIGN_GOLD).length,144,
 'Editor fallback still draws four yellow M polygons without PNG');

// Simulate the canonical v2 localStorage record. Only the NEW Geofabrik
// source should apply its level to the map before matching POIs and generating
// the facade; old data remains unchanged.
const data=new Map();
const storage={
 get length(){return data.size;},
 key(i){return [...data.keys()][i]??null;},
 getItem(k){return data.get(k)??null;},
 setItem(k,v){data.set(k,String(v));},
 removeItem(k){data.delete(k);}
};
const priorStorage=globalThis.localStorage;
globalThis.localStorage=storage;
try{
 const key='komorebi3d:osm-tag-changes:v2:node/'+poi.id;
 data.set(key,JSON.stringify({type:'node',id:String(poi.id),osmVersion:null,
  changes:{level:'2'},tags:null,baseTags:null}));
 const original={...poi,tags:{...poi.tags,level:'1'}};
 const oldMap={source:'OpenStreetMap contributors',elements:[way,{...original,tags:{...original.tags}}]};
 assert.equal(applySavedOsmTagChangesToMap(oldMap,{source:'old'}),0);
 assert.equal(oldMap.elements[1].tags.level,'1');
 const newMap={source:'OpenStreetMap contributors',elements:[way,{...original,tags:{...original.tags}}]};
 assert.equal(applySavedOsmTagChangesToMap(newMap,{source:'new'}),1);
 assert.equal(newMap.elements[1].tags.level,'2');
 assert.deepEqual(buildMap(newMap,{latitude:lat,longitude:lon,halfSize:1000})
  .texturedFaces[0]?.positions.filter((_,i)=>i%3===1).every(y=>y>=2*floor-1e-8&&y<=3*floor+1e-8),true,
  'LocalStorage level 2 is consumed before the map builder');
}finally{
 if(priorStorage===undefined)delete globalThis.localStorage;
 else globalThis.localStorage=priorStorage;
}
const asset=readFileSync(join('komorebi3d','assets','textures','brands','mcdonalds.png'));
assert.equal(asset.subarray(1,4).toString(),'PNG');
assert.equal(asset.readUInt32BE(16),554);
assert.equal(asset.readUInt32BE(20),554);
console.log('McDonalds name/level PNG PASS: arbitrary building, third floor, UV four faces, v2 localStorage, other buildings unaffected');
