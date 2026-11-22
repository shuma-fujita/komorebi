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
assert.ok(rendered.meshes.some(mesh=>mesh.colors.some((v,i)=>i%3===0&&Math.abs(v-(MC_SIGN_GOLD>>16)/255)<1e-6)),
 'Yellow logo triangles must reach shared A/B mesh outputs');
const withoutLogo=buildMap({...map,elements:[building]}, {latitude:lat,longitude:lon,halfSize:1000});
const vertexCount=result=>result.meshes.reduce((n,m)=>n+m.positions.length,0);
assert.equal(vertexCount(rendered)-vertexCount(withoutLogo),quads.length*18,
 'Only the target building receives extra colored quads');
console.log('McDonalds 2F facade PASS: perimeter red, 4 centered M logos, other buildings unchanged');
