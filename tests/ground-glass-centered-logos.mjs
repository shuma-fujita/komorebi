#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {resolveConveniencePaint} from '../komorebi3d/objects/buildings/convenience/osm-adapter.js';
const la=35.78444,lo=139.90061,sx=111320*Math.cos(la*Math.PI/180);
const at=(x,z)=>({lat:la-z/111320,lon:lo+x/sx});
const b={type:'way',id:700,tags:{building:'yes','building:levels':'7'},geometry:[[-12,-10],[12,-10],[12,10],[-12,10],[-12,-10]].map(([x,z])=>at(x,z))};
const poi=(level,name='ガスト')=>({type:'node',id:701,...at(0,0),tags:{amenity:'restaurant',name,level}});
const render=(level,name='ガスト')=>buildMap({elements:[b,poi(level,name)]},{latitude:la,longitude:lo,halfSize:1000});
const brand={id:'lawson',sign:{background:0x0868b7}};
for(const level of [undefined,null,'','bad','9']){
 assert.deepEqual(resolveConveniencePaint([{brand,level}],b.tags,21),[]);
}
assert.deepEqual(resolveConveniencePaint([{brand,level:'0'}],b.tags,21).map(s=>[s.bottom,s.top]),[[0,3]]);
assert.deepEqual(resolveConveniencePaint([{brand,level:'2;4'}],b.tags,21).map(s=>[s.bottom,s.top]),[[6,9],[12,15]]);
const fallback=render(undefined);
assert.equal(fallback.texturedFaces.length,0,'Missing level must not fabricate a branded facade');
const upper=render('2;3;4');
assert.equal(upper.texturedFaces.length,1,'Only one UV surface for contiguous upper floors');
const face=upper.texturedFaces[0],uv='1,0,0,0,0,1,1,0,0,1,1,1';
assert.ok(face.positions.every((n,i)=>i%3!==1||n>=6-1e-8&&n<=15+1e-8));
let logos=0;
for(let i=0;i<face.uvs.length;i+=12)if(face.uvs.slice(i,i+12).join(',')===uv){
 const p=face.positions.slice(i/12*18,i/12*18+18);
 assert.ok(Math.abs((p[1]+p[7])/2-10.5)<1e-8,'Fixed logo centered within 3-floor run');
 logos++;
}
assert.equal(logos,4);
const first=render('0');
assert.equal(first.texturedFaces.length,1,'Ground level retains the image on its fascia');
const plain=render(undefined);
const count=r=>r.meshes.reduce((n,m)=>n+m.positions.length,0);
assert.ok(count(first)>count(plain)+4*18,'Ground level has glass framing and entrance');
assert.equal(render('1;3;5').texturedFaces.length,3,'Separated floors each keep one logo');
console.log('Ground-glass + centered upper logos + strict level PASS');
