#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {matchFloorTenants,floorDistricts,paintFloorDistricts} from '../komorebi3d/objects/buildings/store-floor-zones.js';
import {matchConvenienceBuildings} from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';
import {matchFoodBuildings} from '../komorebi3d/objects/buildings/food/osm-adapter.js';
const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const building={type:'way',id:778800,tags:{building:'yes','building:levels':'4'},
 geometry:[[-20,-10],[20,-10],[20,10],[-20,10],[-20,-10]].map(([x,z])=>coord(x,z))};
const poi=(id,x,z,name,attrs={})=>({type:'node',id,...coord(x,z),tags:{amenity:'cafe',name,level:'0',...attrs}});
const map=(...stores)=>({elements:[building,...stores]});
const render=m=>buildMap(m,{latitude:lat,longitude:lon,halfSize:1000});
const tenants=m=>matchFloorTenants(m.elements,project,1000,
 matchConvenienceBuildings(m.elements,project,1000),matchFoodBuildings(m.elements,project,1000)).get(building.id);
const m1=map(poi(71,-14,-2,'ガスト'));
assert.equal(floorDistricts(tenants(m1),building.tags,12).length,1);
assert.equal(render(m1).texturedFaces.length,1,'Single-brand legacy remains one texture');
const m2=map(poi(72,-14,-2,'ガスト'),poi(73,15,4,'星乃珈琲店'));
const f2=floorDistricts(tenants(m2),building.tags,12);
assert.equal(f2.length,1);
assert.equal(f2[0].stores.length,2);
const r2=render(m2);
assert.ok(r2.texturedFaces.some(f=>f.texture==='gusto'));
assert.ok(r2.texturedFaces.some(f=>f.texture==='hoshino'));
for(const f of r2.texturedFaces){
 assert.ok(f.positions.every((n,i)=>i%3!==1||n>=-1e-8&&n<=3+1e-8),'Never paint other levels');
 assert.ok(f.uvs.every(n=>n>=0&&n<=1));
 const x=f.positions.filter((_,i)=>i%3===0);
 if(f.texture==='gusto')assert.ok(x.every(n=>n<=1e-5),'Left store stays in left rectangle');
 if(f.texture==='hoshino')assert.ok(x.every(n=>n>=-1e-5),'Right store stays in right rectangle');
}
const m3=map(poi(74,-14,-2,'ガスト'),poi(75,15,-2,'星乃珈琲店'),
 poi(76,0,8,'街の喫茶店',{amenity:'cafe'}));
const f3=floorDistricts(tenants(m3),building.tags,12);
assert.equal(f3[0].stores.length,3,'Unbranded shop keeps its own zone');
const p3=[],tex3=[];
const polygon=[[-20,-10],[20,-10],[20,10],[-20,10]];
const n3=paintFloorDistricts((mesh,...args)=>p3.push(args),{},polygon,f3,tex3,'way/778800');
assert.equal(n3,3);
assert.ok(p3.length>15,'Three separate glass/entrance facades painted');
const m4=map(poi(77,-14,-8,'ガスト'),poi(78,14,-8,'星乃珈琲店'),
 poi(79,-14,8,'街の喫茶店'),poi(80,14,8,'珈琲専門店'));
const f4=floorDistricts(tenants(m4),building.tags,12);
const colors=[],tex4=[];
assert.equal(paintFloorDistricts((mesh,...args)=>colors.push(args.at(-1)),{},polygon,f4,tex4,'way/778800'),4);
assert.ok(colors.includes(0xbcd3dd),'Glass on each storefront');
const upper=map(poi(81,-14,-2,'ガスト',{level:'1;2;3'}),poi(82,15,4,'星乃珈琲店',{level:'2'}));
const upperRender=render(upper);
assert.ok(upperRender.texturedFaces.some(f=>f.texture==='gusto'));
assert.ok(upperRender.texturedFaces.some(f=>f.texture==='hoshino'));
const missing=map(poi(90,0,0,'星乃珈琲店',{level:''}));
assert.equal(render(missing).texturedFaces.length,0);
console.log('Multi-tenant floor districts PASS: 1/2/3/4 shops, separate glass, logos, upper, missing level');
