#!/usr/bin/env node
// Hoshino Coffee is an image brand, not tied to amenity=cafe.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {identifyLogoBrand,matchLogoBuildings} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
import {paintHoshinoFacade,HOSHINO_BG,HOSHINO_ASPECT} from '../komorebi3d/objects/buildings/logos/brands/hoshino-sign.js';
const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const building={type:'way',id:880099,tags:{building:'yes','building:levels':'6'},
 geometry:[[-12,-10],[12,-10],[12,10],[-12,10],[-12,-10]].map(([x,z])=>coord(x,z))};
const store=(tags)=>({type:'node',id:880100,...coord(0,0),tags});
const scene=(tags)=>({elements:[building,store(tags)]});
const render=(tags)=>buildMap(scene(tags),{latitude:lat,longitude:lon,halfSize:1000});
const tags={amenity:'cafe',name:'星乃珈琲店 松戸店',level:'1'};
assert.equal(identifyLogoBrand(tags)?.id,'hoshino');
assert.equal(matchLogoBuildings(scene(tags).elements,project,1000).get(building.id)[0].brand.id,'hoshino');
for(const [name,category] of [
 ['星乃珈琲店 駅前店',{amenity:'cafe'}],
 ['星乃珈琲 松戸店',{amenity:'restaurant'}],
 ['HOSHINO COFFEE Matsudo',{shop:'coffee'}],
 ['別の名前',{office:'company',brand:'星乃珈琲店'}],
 ['星乃珈琲店',{}]
]){
 const faces=render({...category,name,level:'1'}).texturedFaces;
 assert.equal(faces.length,1,'Common logo by name or brand independent of OSM category');
 assert.equal(faces[0].texture,'hoshino');
 assert.ok(faces[0].positions.every((n,i)=>i%3!==1||(n>=3-1e-8&&n<=6+1e-8)));
}
assert.equal(render({...tags,level:''}).texturedFaces.length,0);
assert.equal(render({...tags,level:'7'}).texturedFaces.length,0);
assert.equal(render({...tags,name:'別のカフェ'}).texturedFaces.length,0);
const quads=[],faces=[],poly=[[0,0],[20,0],[20,15],[0,15]];
assert.equal(paintHoshinoFacade((mesh,a,b,c,d,color)=>quads.push(color),{},poly,
 {bottom:3,top:6,texturedFaces:faces}),true);
assert.deepEqual(quads,[HOSHINO_BG,HOSHINO_BG,HOSHINO_BG,HOSHINO_BG]);
const face=faces[0];assert.equal(face.texture,'hoshino');
assert.equal(face.uvs.length,face.positions.length/3*2);
const uvA=['1,0,0,0,0,1,1,0,0,1,1,1','0,0,1,0,1,1,0,0,1,1,0,1'];
let logos=0;
for(let i=0;i<face.uvs.length;i+=12){
 const uv=face.uvs.slice(i,i+12);
 if(uvA.includes(uv.join(','))){
  logos++;
  const p=face.positions.slice(i/12*18,i/12*18+18);
  const width=Math.hypot(p[3]-p[0],p[5]-p[2]),height=p[7]-p[1];
  assert.ok(Math.abs(width/height-HOSHINO_ASPECT)<1e-6,'Keep lettering unstretched');
 }else assert.ok(uv.every(n=>n===.04),'Brown wall uses uniform image corner');
}
assert.equal(logos,4);
const reversed=[];paintHoshinoFacade(()=>{},{},[...poly].reverse(),{bottom:3,top:6,texturedFaces:reversed});
assert.equal(reversed[0].uvs.filter((_,i)=>i%12===0&&uvA.includes(reversed[0].uvs.slice(i,i+12).join(','))).length,4);
const asset=readFileSync('komorebi3d/assets/textures/brands/hoshino.webp');
assert.equal(asset.toString('ascii',0,4),'RIFF');
assert.equal(asset.toString('ascii',8,12),'WEBP');
console.log('Hoshino Coffee facade PASS: cafe/restaurant/shop/office, floors, color, UV, artwork');
