#!/usr/bin/env node
import assert from 'node:assert/strict';
import {paintIsomaruFacade} from '../komorebi3d/objects/buildings/food/isomaru-sign.js';
import {paintKaikatsuFacade} from '../komorebi3d/objects/buildings/leisure/kaikatsu-sign.js';
import {paintHidakayaFacade} from '../komorebi3d/objects/buildings/food/hidakaya-sign.js';
import {paintYoshinoyaFacade} from '../komorebi3d/objects/buildings/food/yoshinoya-sign.js';
import {paintLogoBuilding} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
import {entranceLogoSize,conveniencePanelLayout,paintConvenienceFasciaDividers} from '../komorebi3d/objects/buildings/convenience/common.js';

const polygon=[[0,0],[24,0],[24,20],[0,20]];
const shared=entranceLogoSize(24,.6,1.5,{fit:true});
assert.ok(Math.abs(shared.height-.546)<1e-8,'Image logo height matches legacy 91% fascia scale');
assert.ok(Math.abs(shared.width-.819)<1e-8,'Image logo respects image aspect ratio');
assert.deepEqual(entranceLogoSize(24,.6,1.24),{width:.6*.91*1.24,height:.6*.91});
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
// Geometry contract for all image-logo brands: the logo and its colored
// background occupy one flush UV plane, including ground-floor entrance signs.
function checkFlushUV(face,expectedOffset){
 const logoTriangles=[];
 for(let i=0;i<face.uvs.length;i+=12)
  if(fullLogo.has(face.uvs.slice(i,i+12).join(',')))
   logoTriangles.push(i/12);
 assert.ok(logoTriangles.length,'Image facade must contain at least one full-image logo');
 for(const index of logoTriangles){
  const vertices=face.positions.slice(index*18,index*18+18);
  const xs=[vertices[0],vertices[3],vertices[6],vertices[9],vertices[12],vertices[15]];
  const zs=[vertices[2],vertices[5],vertices[8],vertices[11],vertices[14],vertices[17]];
  const onWall=xs.every(x=>Math.abs(x-xs[0])<1e-6)
   ?Math.abs(xs[0])<.02||Math.abs(xs[0]-24)<.02
   :zs.every(z=>Math.abs(z-zs[0])<1e-6)
    &&(Math.abs(zs[0])<.02||Math.abs(zs[0]-20)<.02);
  assert.ok(onWall,'Logo must follow the wall, not form an offset sign board');
  const distance=Math.min(...xs.map(x=>Math.abs(x)),...xs.map(x=>Math.abs(x-24)),
   ...zs.map(z=>Math.abs(z)),...zs.map(z=>Math.abs(z-20)));
  assert.ok(distance<=expectedOffset+1e-6,'Logo must use flush-mounted depth bias');
 }
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
checkFlushUV(upper.face,.012);
for(const painter of [paintIsomaruFacade,paintKaikatsuFacade]){
 const ground=draw(painter,{bottom:0,top:3,groundGlassTop:3});
 assert.equal(logos(ground.face).length,1,'Ground-only facade has one entrance-side logo');
 assert.ok(ground.quads.some(q=>q.color===0xbcd3dd),'Ground must contain existing glass panes');
 assert.ok(ground.quads.some(q=>q.color===0xb7d0db),'Ground must contain existing sliding doors');
 assert.ok(ground.quads.some(q=>q.color===0x8c9497),'Gray door/window seam is shared');
 checkFlushUV(ground.face,.012);
 // A legacy 4m door sign and UV entrance logo share the same 91% fascia sizing.
 const logoVertices=ground.face.positions.filter((_,i)=>i%3===1);
 assert.ok(logoVertices.some(y=>Math.abs(y-(2.7-.546/2))<1e-8),
  'Ground UV logo uses the shared convenience-sign height');
 assert.deepEqual(logos(ground.face),[2.7],
  'One-floor logo is centered in the fascia, not on a glass pane');
 assert.ok(ground.quads.filter(q=>q.color===0xbcd3dd).every(q=>q.c[1]<=2.4+1e-8),
  'Glass ends at 80% of ground floor height');
 const multi=draw(painter,{bottom:0,top:12,groundGlassTop:3});
 assert.deepEqual(logos(multi.face),[7.2],'Four-floor group centers its logo on fascia + upper walls');
 checkFlushUV(multi.face,.012);
 assert.ok(multi.quads.some(q=>q.color===0xbcd3dd));
 assert.ok(multi.quads.every(q=>q.color!==0xbcd3dd||q.c[1]<=2.4+1e-8),
  'Glazing stops below fascia and never reaches upper floors');
 assert.ok(multi.face.positions.every((value,i)=>i%3!==1||value>=2.4-1e-8),
  'Image texture never paints over glazing');
 assert.ok(multi.face.positions.every((n,i)=>i%3!==1||n>=0&&n<=12));
}
// The shared gray sign-band separators must be present on actual image-logo
// storefronts, not just the glazing. These continue the door/window uprights.
const door=conveniencePanelLayout(24,{entrance:true}).door;
const legacyDividers=[];
paintConvenienceFasciaDividers((u0,u1,y0,y1,color)=>legacyDividers.push({u0,u1,y0,y1,color}),{
 length:24,bottom:2.4,top:3,entrance:true
});
const sharedDoorBorders=[door.start,door.end];
for(const x of sharedDoorBorders)
 assert.ok(legacyDividers.some(q=>Math.abs((q.u0+q.u1)/2-x)<1e-8),
  'Common fascia divider aligns with one edge of the automatic door');
for(const painter of [paintHidakayaFacade,paintYoshinoyaFacade]){
 const ground=draw(painter,{bottom:0,top:3,groundGlassTop:3});
 const facadeSeams=ground.quads.filter(q=>q.color===0xc3c9cb&&
  q.a[1]>=2.4-1e-8&&q.c[1]<=3+1e-8);
 const glassSeams=ground.quads.filter(q=>q.color===0x8c9497&&
  q.a[1]<2.4&&q.c[1]<=2.4+1e-8);
 for(const x of sharedDoorBorders){
  const onDoorEdge=q=>Math.abs((q.a[0]+q.b[0])/2-x)<1e-6;
  assert.ok(facadeSeams.some(onDoorEdge),
   'Hidakaya/Yoshinoya fascia must show gray seam above each door-window joint');
  assert.ok(glassSeams.some(onDoorEdge),
   'Door/window gray frame must continue below each fascia separator');
 }
 assert.ok(facadeSeams.every(q=>q.a[2]<-.012),
  'Gray fascia separators sit in front of the flush-mounted UV image');
 const obstructed=draw(painter,{bottom:0,top:3,groundGlassTop:3,blockedWalls:new Set([0])});
 assert.equal(obstructed.quads.filter(q=>q.color===0xc3c9cb).length,0,
  'Neighbor-blocked entrance facade must not gain gray separators');
}
const upstairsNoSeams=draw(paintHidakayaFacade,{bottom:3,top:6});
assert.equal(upstairsNoSeams.quads.filter(q=>q.color===0xc3c9cb).length,0,
 'Upper-floor-only logos must not gain storefront separators');

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
