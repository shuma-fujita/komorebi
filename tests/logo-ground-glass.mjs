#!/usr/bin/env node
import assert from 'node:assert/strict';
import './facade-corner-color.mjs';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {createMapFacadeTextureLayer} from '../komorebi3d/maps/map-facade-textures.js';
import {paintIsomaruFacade} from '../komorebi3d/objects/buildings/food/isomaru-sign.js';
import {paintKaikatsuFacade} from '../komorebi3d/objects/buildings/leisure/kaikatsu-sign.js';
import {paintHidakayaFacade} from '../komorebi3d/objects/buildings/food/hidakaya-sign.js';
import {paintYoshinoyaFacade} from '../komorebi3d/objects/buildings/food/yoshinoya-sign.js';
import {paintLogoBuilding} from '../komorebi3d/objects/buildings/logos/osm-adapter.js';
import {imageFacadeMode} from '../komorebi3d/objects/buildings/brand-facade.js';
import {entranceLogoSize,conveniencePanelLayout,paintConvenienceFasciaDividers} from '../komorebi3d/objects/buildings/convenience/common.js';

const polygon=[[0,0],[24,0],[24,20],[0,20]];
assert.equal(imageFacadeMode({bottom:0,top:3,groundGlassTop:3}),'ground-only');
assert.equal(imageFacadeMode({bottom:0,top:6,groundGlassTop:3}),'ground-and-upper');
assert.equal(imageFacadeMode({bottom:3,top:6}),'upper-only');
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
 assert.deepEqual(logos(multi.face),[7.2],'Multi-floor entrance has one logo on its continuous facade');
 assert.ok(multi.face.positions.some((y,i)=>i%3===1&&Math.abs(y-(7.2-1.325))<1e-8),
  'Multi-floor entrance uses the larger 2.65m-tall brand logo');
 assert.ok(!multi.quads.some(q=>q.color===0x8c9497||q.color===0xc3c9cb),
  'Multi-floor glazing and fascia omit convenience-only gray seams');
 assert.ok(multi.quads.some(q=>q.color===0xb7d0db),
  'Multi-floor entrance retains automatic sliding doors');
 checkFlushUV(multi.face,.012);
 assert.ok(multi.quads.some(q=>q.color===0xbcd3dd));
 assert.ok(multi.quads.every(q=>q.color!==0xbcd3dd||q.c[1]<=2.4+1e-8),
  'Glazing stops below fascia and never reaches upper floors');
 assert.ok(multi.face.positions.every((value,i)=>i%3!==1||value>=2.4-1e-8),
  'Image texture never paints over glazing');
 assert.ok(multi.face.positions.every((n,i)=>i%3!==1||n>=0&&n<=12));
}
// Regression: Yoshinoya's newer artwork is orange at the upper-left
// but white at the bottom. Non-logo UV patches must sample the orange area.
const yoshi=draw(paintYoshinoyaFacade,{bottom:0,top:3,groundGlassTop:3});
assert.equal(yoshi.face.backgroundColor,0xe08831);
assert.deepEqual(yoshi.face.backgroundUV,[.04,.75],'Solid wall color samples the orange region once');
assert.ok(yoshi.face.backgroundPositions.length>0);
assert.equal(yoshi.face.positions.length,18,'Only the entrance logo is textured');
const hida=draw(paintHidakayaFacade,{bottom:0,top:3,groundGlassTop:3});
assert.deepEqual(hida.face.backgroundUV,[.94,.5],'Preserve configured solid-color sample point');
assert.equal(hida.face.backgroundColor,0xffffff);

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
 const multi=draw(painter,{bottom:0,top:6,groundGlassTop:3});
 assert.equal(multi.quads.filter(q=>q.color===0xc3c9cb||q.color===0x8c9497).length,0,
  'Any image brand: upper-contiguous occupancy omits gray storefront separators');
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
// Step 1: verify actual map meshes, not just painter metadata. At every
// tested height, the original footprint plane is either retained or removed
// exactly where an accepted opaque brand background replaces it.
const lat=35.78444,lon=139.90061,sx=111320*Math.cos(lat*Math.PI/180);
const coord=(x,z)=>({lat:lat-z/111320,lon:lon+x/sx});
const way=(id,points)=>({type:'way',id,tags:{building:'yes','building:levels':'4'},
 geometry:[...points,points[0]].map(([x,z])=>coord(x,z))});
const main=way(90101,polygon);
const tenant=(id,name,level)=>({type:'node',id,...coord(12,10),
 tags:{name,...(level===undefined?{}:{level})}});
function scene(stores=[],extras=[],building=main){
 return buildMap({elements:[building,...stores,...extras]},{latitude:lat,longitude:lon,halfSize:200});
}
function originalIntervals(result,building,axis,plane){
 const rows=[];
 for(const batch of result.displayBatches){
  const slice=batch.buildingSlices?.find(s=>s.osmKey==='way/'+building.id);
  if(!slice)continue;
  const pos=batch.meshes[slice.meshIndex].positions;
  for(let i=slice.start;i<slice.end;i+=9){
   if(![0,3,6].every(j=>Math.abs(pos[i+j+axis]-plane)<1e-5))continue;
   const ys=[pos[i+1],pos[i+4],pos[i+7]];
   const lo=Math.min(...ys),hi=Math.max(...ys);
   if(hi-lo<1e-7)continue;
   // Discard perpendicular wall triangles whose horizontal projection is a
   // single point (including degenerate short edges at corners).
   const other=axis===0?2:0;
   const hs=[pos[i+other],pos[i+3+other],pos[i+6+other]];
   if(Math.max(...hs)-Math.min(...hs)<1e-7)continue;
   rows.push([Number(lo.toFixed(6)),Number(hi.toFixed(6))]);
  }
 }
 return [...new Map(rows.map(pair=>[pair.join(','),pair])).values()].sort((a,b)=>a[0]-b[0]);
}
const south=result=>originalIntervals(result,main,2,0);
assert.deepEqual(south(scene()),[[0,12]],'Unbranded original wall remains intact');
assert.deepEqual(south(scene([tenant(90102,'DAISO','1')])),[[0,3],[6,12]],
 'Upper-floor PNG background replaces the corresponding original wall');
assert.deepEqual(south(scene([tenant(90102,'DAISO','1'),tenant(90103,'ガスト','2')])),[[0,3],[9,12]],
 'Adjacent independently branded floors do not leave a duplicate base strip');
assert.deepEqual(south(scene([tenant(90102,'DAISO','1;3')])),[[0,3],[6,9]],
 'Disjoint branded floors preserve the normal floor in between');
assert.deepEqual(south(scene([tenant(90102,'LAWSON','0')])),[[0,2.4],[3,12]],
 'Ground fascia replaces original wall, but glazing backing remains for Step 3');
assert.deepEqual(south(scene([tenant(90102,'LAWSON','0;1')])),[[0,2.4],[6,12]],
 'Ground-plus-upper opaque facade replaces only its covered band');
const neighbor=way(90104,[[0,-2],[24,-2],[24,-.3],[0,-.3]]);
assert.deepEqual(south(scene([tenant(90102,'LAWSON','0')],[neighbor])),[[0,12]],
 'Blocked ground facade retains its entire original wall');
assert.deepEqual(south(scene([tenant(90102,'LAWSON','0;1')],[neighbor])),[[0,3],[6,12]],
 'Blocked ground wall is retained while the painted upper wall is replaced');
assert.deepEqual(south(scene([tenant(90102,'DAISO',undefined)])),[[0,12]],
 'Missing level cannot cut a hole in the building');
assert.deepEqual(south(scene([tenant(90102,'DAISO','9')])),[[0,12]],
 'Out-of-range level cannot cut a hole in the building');
assert.deepEqual(south(scene([tenant(90102,'DAISO','1'),tenant(90103,'ガスト','1')])),[[0,3],[6,12]],
 'Conflicting image tenants only claim the successfully rendered floor');
const triangle=way(90105,[[0,0],[24,0],[12,20]]);
assert.equal(scene([tenant(90102,'DAISO','1')],[],triangle).texturedFaces.length,0,
 'Unsupported triangular image painter does not report a rendered band');
assert.deepEqual(originalIntervals(scene([tenant(90102,'DAISO','1')],[],triangle),triangle,2,0),[[0,12]],
 'Failed painter preserves original wall');
// Inlay contract: disjoint solid rectangles + exactly one full-image
// rectangle fill each selected facade, at the same exact depth.
for(const painter of [paintHidakayaFacade,paintYoshinoyaFacade,paintIsomaruFacade,paintKaikatsuFacade]){
 const {face,quads}=draw(painter,{bottom:3,top:6});
 assert.equal(quads.length,0);
 const rects=[];
 for(const [kind,data] of [['solid',face.backgroundPositions],['logo',face.positions]])
  for(let i=0;i<data.length;i+=18){
   const p=data.slice(i,i+18),xs=p.filter((v,j)=>j%3===0),ys=p.filter((v,j)=>j%3===1),zs=p.filter((v,j)=>j%3===2);
   const axis=Math.max(...xs)-Math.min(...xs)<1e-7?0:2;
   const fixed=axis===0?xs:zs,horizontal=axis===0?zs:xs;
   rects.push({kind,axis,plane:fixed[0],l:Math.min(...horizontal),r:Math.max(...horizontal),b:Math.min(...ys),t:Math.max(...ys)});
  }
 assert.ok(rects.filter(r=>r.kind==='logo').length===4);
 assert.ok(Math.abs(rects.reduce((n,r)=>n+(r.r-r.l)*(r.t-r.b),0)-264)<1e-6,'All four walls covered once');
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
  const a=rects[i],b=rects[j];
  if(a.axis!==b.axis||Math.abs(a.plane-b.plane)>1e-7)continue;
  assert.ok(Math.min(a.r,b.r)-Math.max(a.l,b.l)<1e-7||Math.min(a.t,b.t)-Math.max(a.b,b.b)<1e-7,'No positive-area overlap');
 }
}
const noLogo=[];
assert.equal(paintHidakayaFacade(()=>{},{},polygon,{bottom:3,top:6,texturedFaces:noLogo,logoWallIndices:[]}),true);
assert.equal(noLogo[0].positions.length,0);
assert.equal(noLogo[0].backgroundPositions.length,4*18,'Logo-free facade remains a solid wall');
// Backend contract with simulated upload/error events. The same two
// geometry parts must be drawn in loading, ready and failure states.
const camera={eye:[20,10,30],target:[12,3,10],fovDegrees:45,near:.1,far:2200};
const originalImage=globalThis.Image,originalDocument=globalThis.document;
const images=[];let samples=0;const sampleCoordinates=[];
globalThis.Image=class {constructor(){images.push(this);this.naturalWidth=16;this.naturalHeight=16;}};
globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},drawImage(_image,x,y){sampleCoordinates.push([x,y]);},getImageData(){samples++;return {data:[18,52,86,255]};}})})};
try{
 const face=hida.face;
 const counts=[face.backgroundPositions.length/3,face.positions.length/3];
 const draws=[];let useImage=0;
 const gl=new Proxy({drawingBufferWidth:200,drawingBufferHeight:100,
  getShaderParameter:()=>true,getProgramParameter:()=>true,
  getUniformLocation:(_,name)=>name,getAttribLocation:(_,name)=>name,
  uniform1i:(name,value)=>{if(name==='uUseImage')useImage=value;},
  drawArrays:(_,start,count)=>draws.push([count,useImage])
 },{get:(target,key)=>key in target?target[key]:
  typeof key==='string'&&key===key.toUpperCase()?key:
  typeof key==='string'&&key.startsWith('create')?()=>({}):()=>{}});
 const layerA=createMapFacadeTextureLayer({gl});
 const imageA=images.find(i=>i.src.includes('hidakaya.png'));
 layerA.render([face],camera);
 assert.deepEqual(draws.splice(0),counts.map(n=>[n,0]),'A: loading fills both disjoint rectangles in solid color');
 imageA.onload();
 layerA.render([face],camera);
 assert.deepEqual(draws.splice(0),[[counts[0],0],[counts[1],1]],'A: ready textures only logo rectangle');
 layerA.render([face],camera);draws.length=0;
 assert.equal(samples,1,'Solid RGB sample is cached across frames');
 const cornerFace={...face,texture:'doutor',backgroundUV:[.04,.04],backgroundColor:0};
 const cornerImage=images.find(i=>i.src.includes('doutor.png'));
 cornerImage.onload();
 sampleCoordinates.length=0;
 layerA.render([cornerFace],camera);
 assert.deepEqual(sampleCoordinates,[[0,0],[15,0],[0,15],[15,15]],'Default background samples the four outermost corners');
 assert.equal(samples,5,'Four corner samples are read once');
 layerA.render([cornerFace],camera);
 assert.equal(samples,5,'Corner color is cached across frames');
 draws.length=0;
 layerA.render([],camera);assert.equal(draws.length,0,'A: stale facade removed');
 layerA.dispose();

 const frames=[];
 class Material {constructor(options){Object.assign(this,options);}dispose(){}}
 class Geometry {constructor(){this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}dispose(){}}
 class Scene {constructor(){this.children=[];}add(m){this.children.push(m);}remove(m){this.children=this.children.filter(x=>x!==m);}}
 const THREE={Scene,Texture:class {dispose(){}},MeshBasicMaterial:Material,BufferGeometry:Geometry,
  Float32BufferAttribute:class {constructor(values,size){this.count=values.length/size;}},
  Mesh:class {constructor(geometry,material){this.geometry=geometry;this.material=material;}},
  Color:class {constructor(value){this.value=value;}setHex(value){this.value=value;}}};
 const layerB=createMapFacadeTextureLayer({THREE,scene:{fog:null},camera:{},renderer:{
  autoClear:true,render(scene){frames.push(scene.children.map(m=>[m.geometry.attributes.position.count,!!m.material.map]));}
 }});
 const imageB=images.filter(i=>i.src.includes('hidakaya.png')).at(-1);
 layerB.render([face],camera);
 assert.deepEqual(frames.pop(),counts.map(n=>[n,false]),'B: loading fills wall and logo in solid color');
 imageB.onload();
 layerB.render([face],camera);
 assert.deepEqual(frames.pop(),[[counts[0],false],[counts[1],true]],'B: ready textures only logo rectangle');
 const noLogoFace=noLogo[0];
 layerB.render([noLogoFace],camera);
 assert.deepEqual(frames.pop(),[[noLogoFace.backgroundPositions.length/3,false]],'B: no-logo wall is rendered, not hidden');
 const failedFace={...face,texture:'lawson'};
 const failedImage=images.filter(i=>i.src.includes('lawson.png')).at(-1);
 const warn=console.warn;
 try{console.warn=()=>{};failedImage.onerror();}finally{console.warn=warn;}
 layerB.render([failedFace],camera);
 assert.deepEqual(frames.pop(),counts.map(n=>[n,false]),'B: image error leaves both solid wall regions visible');
 layerB.dispose();
}finally{
 if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;
 if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
}
console.log('Ground glass / entrance, centered logo, Step 1 and Step 2 wall inlay regression PASS');
