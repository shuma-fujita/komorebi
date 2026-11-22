#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {findMatsudoMcDonaldsBuilding,paintMatsudoMcDonaldsSign,
 MC_SIGN_BG,MC_SIGN_GOLD,MATSUDO_MCDONALDS_POI_ID,MATSUDO_MCDONALDS_BUILDING_ID
} from '../komorebi3d/objects/buildings/food/mcdonalds-sign.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
const lat=35.78444,lon=139.90061,scale=111320*Math.cos(lat*Math.PI/180);
const xy=p=>[(p.lon-lon)*scale,-(p.lat-lat)*111320];
const root=join('komorebi3d','maps','data','tiles-2km-geofabrik');
const index=JSON.parse(readFileSync(join(root,'index.json'),'utf8'));
const live=JSON.parse(readFileSync(join(root,index.tiles['0_0']),'utf8'));
const node=live.elements.find(e=>e.type==='node'&&String(e.id)===String(MATSUDO_MCDONALDS_POI_ID));
const building=live.elements.find(e=>e.type==='way'&&String(e.id)===String(MATSUDO_MCDONALDS_BUILDING_ID));
assert.ok(node&&building,'The station-front McDonalds and PIAZA building must exist');
assert.equal(building.tags.name,'ピアザ松戸ビル');
assert.equal(findMatsudoMcDonaldsBuilding(live.elements,xy),MATSUDO_MCDONALDS_BUILDING_ID);
assert.equal(findMatsudoMcDonaldsBuilding([{...node,tags:{amenity:'cafe'}},building],xy),null);
assert.equal(findMatsudoMcDonaldsBuilding([node],xy),null);
assert.equal(findMatsudoMcDonaldsBuilding([building],xy),null);
const points=building.geometry.slice(0,-1).map(xy),quads=[];
const height=Number(building.tags['building:levels'])*3;
const paint=(mesh,a,b,c,d,color)=>quads.push({vertices:[a,b,c,d],color});
assert.equal(paintMatsudoMcDonaldsSign(paint,{},points,height,{levels:9}),true);
const floor=height/9;
const walls=points.filter((a,i)=>Math.hypot(points[(i+1)%points.length][0]-a[0],points[(i+1)%points.length][1]-a[1])>.1);
const red=quads.filter(q=>q.color===MC_SIGN_BG);
const gold=quads.filter(q=>q.color===MC_SIGN_GOLD);
assert.equal(red.length,walls.length,'Entire 2F outer perimeter is red');
assert.equal(gold.length,4*36,'Exactly four M logos, 36 gold polygons each');
for(const panel of red){
 assert.equal(panel.vertices[0][1],floor);
 assert.equal(panel.vertices[1][1],floor);
 assert.equal(panel.vertices[2][1],2*floor);
 assert.equal(panel.vertices[3][1],2*floor);
}
assert.ok(gold.every(q=>q.vertices.every(p=>p[1]>floor&&p[1]<2*floor)),
 'All gold arches stay completely inside the second floor');
// A simple four-wall building receives one centered M on each wall.
const rectangle=[[0,0],[18,0],[18,12],[0,12]],simple=[];
assert.equal(paintMatsudoMcDonaldsSign((mesh,a,b,c,d,color)=>simple.push({a,b,c,d,color}),{},
 rectangle,27,{levels:9}),true);
assert.equal(simple.filter(q=>q.color===MC_SIGN_BG).length,4);
assert.equal(simple.filter(q=>q.color===MC_SIGN_GOLD).length,144);
const redCenters=simple.filter(q=>q.color===MC_SIGN_BG).map(q=>
 [0,2].map(axis=>[q.a,q.b,q.c,q.d].reduce((s,p)=>s+p[axis],0)/4));
const logoCenters=Array.from({length:4},(_,i)=>{
 const logo=simple.slice(4+i*36,4+(i+1)*36);
 return [0,2].map(axis=>logo.flatMap(q=>[q.a,q.b,q.c,q.d])
  .reduce((s,p)=>s+p[axis],0)/(logo.length*4));
});
for(const redCenter of redCenters){
 const matches=logoCenters.filter(goldCenter=>
  Math.hypot(goldCenter[0]-redCenter[0],goldCenter[1]-redCenter[1])<.2);
 assert.equal(matches.length,1,'One centered M on each of the four facades');
}
assert.equal(paintMatsudoMcDonaldsSign(paint,{},points,5,{levels:9}),false);
assert.equal(paintMatsudoMcDonaldsSign(paint,{},[[0,0],[10,0],[5,5]],27,{levels:9}),false);
const map={source:'OpenStreetMap contributors',elements:[node,building]};
const rendered=buildMap(map,{latitude:lat,longitude:lon,halfSize:1000});
assert.equal(rendered.counts.buildings,1);
assert.equal(rendered.texturedFaces.length,1,'One UV facade descriptor for the Matsudo building');
assert.equal(rendered.texturedFaces[0].texture,'mcdonalds');
assert.ok(rendered.texturedFaces[0].positions.length>=18*walls.length,
 'The second-floor perimeter has UV triangles');
assert.equal(rendered.displayBatches.flatMap(b=>b.texturedFaces||[]).length,1,
 'UV facade belongs to exactly one generated display batch');
const withoutLogo=buildMap({...map,elements:[building]}, {latitude:lat,longitude:lon,halfSize:1000});
const vertexCount=result=>result.meshes.reduce((n,m)=>n+m.positions.length,0);
assert.equal(withoutLogo.texturedFaces.length,0);
assert.equal(vertexCount(rendered)-vertexCount(withoutLogo),red.length*18,
 'The fixed Engine receives only red fallback quads, not baked-in yellow arch polygons');
const uvFaces=[],uvQuads=[];
assert.equal(paintMatsudoMcDonaldsSign(
 (mesh,a,b,c,d,color)=>uvQuads.push({vertices:[a,b,c,d],color}),{},
 points,height,{levels:9,texturedFaces:uvFaces}),true);
assert.equal(uvFaces.length,1);
assert.equal(uvQuads.length,red.length);
const surface=uvFaces[0];
assert.equal(surface.positions.length/3*2,surface.uvs.length);
assert.ok(surface.positions.every(Number.isFinite));
assert.ok(surface.uvs.every(Number.isFinite));
const logoBlocks=[];
for(let i=0;i<surface.uvs.length;i+=12){
 const block=surface.uvs.slice(i,i+12);
 if(block.join(',')==='0,0,1,0,1,1,0,0,1,1,0,1')
  logoBlocks.push(i/12);
 else assert.ok(block.every(v=>v===.04),'Non-logo areas sample the original PNG red corner');
}
assert.equal(logoBlocks.length,4,'Four square UV logo areas on the four main facades');
for(const i of logoBlocks){
 const p=surface.positions.slice(i*18,i*18+18);
 const vertices=Array.from({length:6},(_,j)=>p.slice(j*3,j*3+3));
 assert.ok(vertices.every(v=>v[1]>floor&&v[1]<2*floor));
 const a=vertices[0],b=vertices[1],c=vertices[2];
 const width=Math.hypot(b[0]-a[0],b[2]-a[2]),height=c[1]-b[1];
 assert.ok(Math.abs(width-height)<.0001,'Square image does not distort on the facade');
}
const asset=readFileSync(join('komorebi3d','assets','textures','brands','mcdonalds.png'));
assert.equal(asset.subarray(1,4).toString(),'PNG');
assert.equal(asset.readUInt32BE(16),554);
assert.equal(asset.readUInt32BE(20),554);
console.log('McDonalds PNG UV facade PASS: 4 centered square logos, red perimeter, A/B-independent map data');
