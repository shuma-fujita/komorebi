#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {identifyLogoBrand,matchLogoBuildings,paintLogoBuilding} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
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
 ['磯丸水産 松戸駅前店',{},'isomaru']
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
const multi=build(poi(880002,'磯丸水産',{amenity:'pub'},'2;3;4')).texturedFaces;
assert.equal(multi.length,1,'contiguous upper floors share one centered logo');
assert.ok(multi[0].positions.every((n,i)=>i%3!==1||(n>=6-1e-8&&n<=15+1e-8)));
const topLogo=[];
for(let i=0;i<multi[0].uvs.length;i+=12)if(multi[0].uvs.slice(i,i+12).join(',')==='1,0,0,0,0,1,1,0,0,1,1,1')topLogo.push(i);
assert.equal(topLogo.length,4);
for(const i of topLogo){const ps=multi[0].positions.slice(i/12*18,i/12*18+18);assert.ok(Math.abs((ps[1]+ps[7])/2-10.5)<1e-8);}
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
console.log('Industry-independent logos: 10 categories, 7 brands, multi-floor, guards and legacy PASS');
