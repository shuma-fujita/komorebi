#!/usr/bin/env node
import assert from 'node:assert/strict';
import {chooseFacadeCornerColor as choose} from '../komorebi3d/maps/map-facade-textures.js';
import {suppressDenseLogoWalls} from '../komorebi3d/objects/buildings/brand-facade.js';
import {buildMap} from '../komorebi3d/maps/map-builder.js';
import {createMapFacadeTextureLayer} from '../komorebi3d/maps/map-facade-textures.js';
import {paintIsomaruFacade} from '../komorebi3d/objects/buildings/food/isomaru-sign.js';
import {paintKaikatsuFacade} from '../komorebi3d/objects/buildings/leisure/kaikatsu-sign.js';
import {paintHidakayaFacade} from '../komorebi3d/objects/buildings/food/hidakaya-sign.js';
import {paintYoshinoyaFacade} from '../komorebi3d/objects/buildings/food/yoshinoya-sign.js';

{
const black=[0,0,0,255],white=[255,255,255,255],orange=[255,109,0,255],clear=[0,0,0,0];
assert.equal(choose([black,black,black,white],0xffffff),0);
assert.equal(choose([orange,orange,orange,orange],0),0xff6d00);
assert.equal(choose([black,black,white,white],0x123456),0x123456);
assert.equal(choose([clear,clear,clear,white],0x123456),0x123456);
assert.equal(choose([black,black,black,clear],0xffffff),0);
console.log('Facade corner color PASS');
}
const polygon=[[0,0],[24,0],[24,20],[0,20]];
const draw=(painter,opts)=>{
 const quads=[],faces=[];
 assert.equal(painter((mesh,a,b,c,d,color)=>quads.push({a,b,c,d,color}),{},polygon,
  {...opts,texturedFaces:faces,entranceEdgeIndex:0}),true);
 assert.equal(faces.length,1);
 return {quads,face:faces[0]};
};
// Representative surfaces must stay within their assigned vertical range.
for(const painter of [paintIsomaruFacade,paintKaikatsuFacade]){
 for(const [bottom,top] of [[0,3],[3,12],[0,12]]){
  const {face}=draw(painter,{bottom,top,groundGlassTop:3});
  assert.ok(face.positions.length>0);
  assert.ok(face.positions.every(Number.isFinite));
  assert.ok(face.positions.every((v,i)=>i%3!==1||v>=bottom-1e-8&&v<=top+1e-8));
  assert.equal(face.uvs.length,face.positions.length/3*2);
 }
}
const hida=draw(paintHidakayaFacade,{bottom:0,top:3,groundGlassTop:3});
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
assert.ok(south(scene([tenant(90102,'LAWSON','0')])).some(([lo,hi])=>lo===3&&hi===12),'Ground storefront preserves upper walls');
assert.ok(south(scene([tenant(90102,'LAWSON','0;1')])).some(([lo,hi])=>lo===6&&hi===12),'Ground-plus-upper storefront preserves unoccupied upper walls');
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
 assert.ok(rects.some(r=>r.kind==='logo'));
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
assert.ok(noLogo[0].backgroundPositions.length>0,'Logo-free facade remains a solid wall');
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
 const imageA=images.find(i=>i.src?.includes('hidakaya.png'));
 layerA.render([face],camera);
 assert.deepEqual(draws.splice(0),counts.map(n=>[n,0]),'A: loading fills both disjoint rectangles in solid color');
 imageA.onload();
 layerA.render([face],camera);
 assert.deepEqual(draws.splice(0),[[counts[0],0],[counts[1],1]],'A: ready textures only logo rectangle');
 layerA.render([face],camera);draws.length=0;
 assert.equal(samples,1,'Solid RGB sample is cached across frames');
 const cornerFace={...face,texture:'doutor',backgroundUV:[.04,.04],backgroundColor:0};
 const cornerImage=images.find(i=>i.src?.includes('doutor.png'));
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
 const imageB=images.filter(i=>i.src?.includes('hidakaya.png')).at(-1);
 layerB.render([face],camera);
 assert.deepEqual(frames.pop(),counts.map(n=>[n,false]),'B: loading fills wall and logo in solid color');
 imageB.onload();
 layerB.render([face],camera);
 assert.deepEqual(frames.pop(),[[counts[0],false],[counts[1],true]],'B: ready textures only logo rectangle');
 const noLogoFace=noLogo[0];
 layerB.render([noLogoFace],camera);
 assert.deepEqual(frames.pop(),[[noLogoFace.backgroundPositions.length/3,false]],'B: no-logo wall is rendered, not hidden');
 const failedFace={...face,texture:'lawson'};
 const failedImage=images.filter(i=>i.src?.includes('lawson.png')).at(-1);
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

// Horizontal crowding must not remove roomy or separate directions.
const compactOutline=[[0,0],[7,0],[9,6],[-1,6]];
const denseSelected=suppressDenseLogoWalls(compactOutline,[0,1,2],692/193);
assert.equal(denseSelected.length,1,'Connected crowded signs share one representative');
assert.deepEqual(suppressDenseLogoWalls(compactOutline,[0,1,2],1),[0,1,2],'Square artwork leaves space');
assert.deepEqual(suppressDenseLogoWalls(compactOutline.map(p=>p.map(v=>v*3)),[0,1,2],692/193),[0,1,2],'Roomy larger footprint preserves directions');
assert.deepEqual(suppressDenseLogoWalls(compactOutline,[0,2],692/193),[0,2],'Nonadjacent dense signs remain independent');

const priorityAssessment=[{i:0,road:{priority:1},roadEligible:true},{i:1,road:{priority:1},roadEligible:true},{i:2,road:{priority:0},roadEligible:true}];
assert.deepEqual(suppressDenseLogoWalls(compactOutline,[0,1,2],692/193,priorityAssessment),[0],'Dense cluster retains road priority before wall width');
