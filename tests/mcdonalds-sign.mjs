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
assert.equal(quads.length,37,'One red sign plus 36 golden-arch polygons');
assert.equal(quads.filter(q=>q.color===MC_SIGN_BG).length,1);
assert.equal(quads.filter(q=>q.color===MC_SIGN_GOLD).length,36);
const panel=quads[0].vertices;
assert.ok(panel.every(p=>p[1]>3&&p[1]<6),'The sign sits entirely on 2F');
assert.ok(quads.slice(1).every(q=>q.vertices.every(p=>p[1]>3&&p[1]<6)),
 'Golden arches stay within the second floor');
const centerZ=panel.reduce((acc,p)=>acc+p[2],0)/panel.length;
const northMost=Math.min(...points.map(p=>p[1]));
assert.ok(centerZ<northMost+15,'Logo should be placed on the station-facing northern facade');
assert.equal(paintMatsudoMcDonaldsSign(paint,{},points,5,{levels:9}),false);
const map={source:'OpenStreetMap contributors',elements:[node,building]};
const rendered=buildMap(map,{latitude:lat,longitude:lon,halfSize:1000});
assert.equal(rendered.counts.buildings,1);
assert.ok(rendered.meshes.some(mesh=>mesh.colors.some((v,i)=>i%3===0&&Math.abs(v-(MC_SIGN_GOLD>>16)/255)<1e-6)),
 'Yellow logo triangles must reach the shared A/B mesh outputs');
const withoutLogo=buildMap({...map,elements:[building]}, {latitude:lat,longitude:lon,halfSize:1000});
const vertexCount=result=>result.meshes.reduce((n,m)=>n+m.positions.length,0);
assert.equal(vertexCount(rendered)-vertexCount(withoutLogo),quads.length*18,
 'Only the target building receives 37 extra colored quads');
console.log('McDonalds sign PASS: exact OSM node+building, 2F north facade, 37 colored quads, no other building');
