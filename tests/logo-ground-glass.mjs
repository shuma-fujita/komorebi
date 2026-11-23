#!/usr/bin/env node
import assert from 'node:assert/strict';
import {paintIsomaruFacade} from '../komorebi3d/objects/buildings/food/isomaru-sign.js';
import {paintKaikatsuFacade} from '../komorebi3d/objects/buildings/leisure/kaikatsu-sign.js';
import {paintLogoBuilding} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';

const polygon=[[0,0],[24,0],[24,20],[0,20]];
const fullLogo=new Set(['1,0,0,0,0,1,1,0,0,1,1,1','0,0,1,0,1,1,0,0,1,1,0,1']);
function logos(face){
 const centers=[];
 for(let i=0;i<face.uvs.length;i+=12){
  if(!fullLogo.has(face.uvs.slice(i,i+12).join(',')))continue;
  const p=face.positions.slice(i/12*18,i/12*18+18);
  centers.push((p[1]+p[7])/2);
 }
 return centers;
}
const draw=(painter,opts)=>{
 const quads=[],faces=[];
 assert.equal(painter((mesh,a,b,c,d,color)=>quads.push({a,b,c,d,color}),{},polygon,
  {...opts,texturedFaces:faces,entranceEdgeIndex:0}),true);
 assert.equal(faces.length,1);
 return {quads,face:faces[0]};
};
const upper=draw(paintIsomaruFacade,{bottom:3,top:12});
assert.equal(upper.quads.some(q=>q.color===0xbcd3dd),false,'Upper floors must not have glass');
assert.equal(logos(upper.face).length,4,'Upper-only groups retain four logos');
for(const painter of [paintIsomaruFacade,paintKaikatsuFacade]){
 const ground=draw(painter,{bottom:0,top:3,groundGlassTop:3});
 assert.equal(logos(ground.face).length,1,'Ground-only facade has one entrance-side logo');
 assert.ok(ground.quads.some(q=>q.color===0xbcd3dd),'Ground must contain existing glass panes');
 assert.ok(ground.quads.some(q=>q.color===0xb7d0db),'Ground must contain existing sliding doors');
 assert.deepEqual(logos(ground.face),[2.7],
  'One-floor logo is centered in the fascia, not on a glass pane');
 assert.ok(ground.quads.filter(q=>q.color===0xbcd3dd).every(q=>q.c[1]<=2.4+1e-8),
  'Glass ends at 80% of ground floor height');
 const multi=draw(painter,{bottom:0,top:12,groundGlassTop:3});
 assert.deepEqual(logos(multi.face),[7.2],'Four-floor group centers its logo on fascia + upper walls');
 assert.ok(multi.quads.some(q=>q.color===0xbcd3dd));
 assert.ok(multi.quads.every(q=>q.color!==0xbcd3dd||q.c[1]<=2.4+1e-8),
  'Glazing stops below fascia and never reaches upper floors');
 assert.ok(multi.face.positions.every((value,i)=>i%3!==1||value>=2.4-1e-8),
  'Image texture never paints over glazing');
 assert.ok(multi.face.positions.every((n,i)=>i%3!==1||n>=0&&n<=12));
}
// Entry adapter chooses the same per-floor shared renderer and keeps unknown brands untouched.
const stores=[{brand:{id:'isomaru'},level:'0;1;2;3'}];
const rendered=[],quads=[];
assert.equal(paintLogoBuilding((mesh,a,b,c,d,color)=>quads.push(color),{},polygon,stores,
 {'building:levels':'4'},12,null,rendered,'way/test',[],0),1);
assert.equal(rendered[0].texture,'isomaru');
assert.deepEqual(logos(rendered[0]),[7.2]);
assert.ok(quads.includes(0xbcd3dd));
const noGround=[],quadsUpper=[];
assert.equal(paintLogoBuilding((mesh,a,b,c,d,color)=>quadsUpper.push(color),{},polygon,
 [{brand:{id:'isomaru'},level:'1;2;3'}],{'building:levels':'4'},12,null,noGround,'way/test',[],0),1);
assert.equal(logos(noGround[0]).length,4);
assert.equal(quadsUpper.includes(0xbcd3dd),false);
console.log('Ground glass / entrance and centered logo regression PASS');
