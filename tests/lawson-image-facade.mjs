#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {identifyLogoBrand,matchLogoBuildings} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
import {matchConvenienceBuildings} from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';

const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const building={type:'way',id:77201,tags:{building:'yes','building:levels':'4'},
 geometry:[[-12,-10],[12,-10],[12,10],[-12,10]].concat([[-12,-10]]).map(([x,z])=>coord(x,z))};
const poi=(name,level,brand='LAWSON')=>({type:'node',id:77202,...coord(0,0),
 tags:{shop:'convenience',brand,name,...(level===undefined?{}:{level})}});
const scene=node=>({elements:[building,node]});
const project=p=>[(p.lon-lon)*sx,-(p.lat-lat)*111320];
const fullLogo=new Set(['1,0,0,0,0,1,1,0,0,1,1,1','0,0,1,0,1,1,0,0,1,1,0,1']);
function logoCenters(face){
 const centers=[];
 for(let i=0;i<face.uvs.length;i+=12){
  if(!fullLogo.has(face.uvs.slice(i,i+12).join(',')))continue;
  const p=face.positions.slice(i/12*18,i/12*18+18);
  centers.push((p[1]+p[7])/2);
 }
 return centers;
}
for(const [name,level,center,num] of [
 ['ローソン 松戸駅前店','0',2.7,1],
 ['LAWSON Station','0;1;2;3',7.2,1],
 ['ローソン','1;2;3',7.5,4],
 ['LAWSON','0',2.7,1]
]){
 const node=poi(name,level);
 assert.equal(identifyLogoBrand(node.tags)?.id,'lawson',name);
 const matched=matchLogoBuildings(scene(node).elements,project,100).get(building.id);
 assert.equal(matched?.[0].brand.id,'lawson',name+' should match');
 const legacy=matchConvenienceBuildings(scene(node).elements,project,100);
 assert.equal(legacy.has(building.id),false,'Standard Lawson must not have a duplicate old storefront');
 const rendered=buildMap(scene(node),{latitude:lat,longitude:lon,halfSize:200});
 assert.equal(rendered.texturedFaces.length,1,name);
 assert.equal(rendered.texturedFaces[0].texture,'lawson');
 const logos=logoCenters(rendered.texturedFaces[0]);
 assert.equal(logos.length,num,name+' logo count');
 assert.ok(logos.every(y=>Math.abs(y-center)<1e-8),name+' centered logo');
}
for(const [name,brand] of [
 ['ローソンストア100 松戸店','LAWSON'],
 ['LAWSON STORE 100','LAWSON'],
 ['ナチュラルローソン 松戸店','ローソン'],
 ['Natural LAWSON','LAWSON']
]){
 const node=poi(name,'0',brand);
 assert.notEqual(identifyLogoBrand(node.tags)?.id,'lawson',name+' must not use ordinary Lawson logo');
 assert.equal(buildMap(scene(node),{latitude:lat,longitude:lon,halfSize:200}).texturedFaces.some(f=>f.texture==='lawson'),false);
}
const store100=poi('LAWSON STORE 100','0','LAWSON');
assert.equal(matchConvenienceBuildings(scene(store100).elements,project,100).get(building.id)?.[0].brand.id,'lawson-store100');
for(const level of [undefined,'','invalid','4','0;broken']){
 const noLevel=buildMap(scene(poi('ローソン 松戸駅前店',level)),
  {latitude:lat,longitude:lon,halfSize:200});
 assert.equal(noLevel.texturedFaces.length,0,'Missing, invalid or out-of-range OSM level must not paint Lawson: '+level);
}
const missing={...building,tags:{building:'yes'}};
const noLevels=buildMap({elements:[missing,poi('ローソン 松戸駅前店')]},
 {latitude:lat,longitude:lon,halfSize:200});
assert.equal(noLevels.texturedFaces.length,0,'No OSM level means no Lawson facade, including buildings without floor metadata');
// localStorage overlays are merged into the map before this pipeline:
const edited=buildMap(scene(poi('ローソン 松戸駅前店','0')),
 {latitude:lat,longitude:lon,halfSize:200});
assert.equal(edited.texturedFaces[0].texture,'lawson',
 'A locally supplied level=0 is handled without any store-specific fallback');
assert.ok(readFileSync('komorebi3d/assets/textures/brands/lawson.webp').subarray(0,4).equals(Buffer.from('RIFF')));
console.log('Lawson image transition PASS: normal logo, glass, floor groups, variants, strict OSM levels');
