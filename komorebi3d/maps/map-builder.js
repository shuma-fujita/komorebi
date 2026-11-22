import {inferBuildingLevelsFromTenants} from './map-tenant-levels.js?v=tenant-level-infer-20261119';
import {matchLoveHotelBuildings,resolveLoveHotelColor,resolveLoveHotelFloorSpans} from '../objects/buildings/love-hotel/osm-adapter.js?v=brothel-floor5-20261119';
import {paintLoveHotelWall} from '../objects/buildings/love-hotel/common.js?v=brothel-floor5-20261119';
import {LOVE_HOTEL_COLOR} from '../objects/buildings/love-hotel/const.js?v=love-hotel-pink-20261119';
import {CONVENIENCE_DOOR_WIDTH_M} from '../objects/buildings/convenience/const.js?v=convenience-one-sign-v3-20261112';
import {matchFoodBuildings,resolveFoodPaint,resolveMcDonaldsPaint} from '../objects/buildings/food/osm-adapter.js?v=food-poi-level-mcdonalds-v3-20261122';
import {paintMcDonaldsFacade} from '../objects/buildings/food/mcdonalds-sign.js?v=mcdonalds-daiso-shared-v1-20261122';
import {matchDaisoBuildings,resolveDaisoPaint} from '../objects/buildings/variety/osm-adapter.js?v=daiso-poi-level-v1-20261122';
import {paintDaisoFacade} from '../objects/buildings/variety/daiso-sign.js?v=daiso-png-wall-v1-20261122';
import {paintFoodWall} from '../objects/buildings/food/common.js?v=food-storefront-20261119';
import {tileCenterWgs84} from './tile-grid.js?v=tile-grid-epsg6677-20261114';
import {parkingAreaFromOsm} from '../objects/parking/osm-adapter.js?v=parking-surface-v1-20261122';
import {paintParkingArea} from '../objects/parking/common.js?v=parking-orange-u-inward-v3-20261122';
import {matchConvenienceBuildings,resolveConveniencePaint,paintConvenienceWall,resolveOsmConvenienceRoofColor} from '../objects/buildings/convenience/osm-adapter.js?v=lawson-storefront-20261119';
// Step 4-B: keep the Step 3 initial ordering, then reprioritize only unfinished
// features when the helicopter moves >= 50m. Sorting yields every 512 operations
// so the browser can enforce the existing per-frame time budget.
function createFeatureWorkQueue(elements,xy,priorityX,priorityZ){
 const entries=elements.map((element,index)=>{
  const points=element.geometry?.length?element.geometry:(Number.isFinite(element.lat)&&Number.isFinite(element.lon)?[element]:[]);
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const point of points){
   const [x,z]=xy(point);
   if(!Number.isFinite(x)||!Number.isFinite(z))continue;
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);
   minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  const dx=(minX+maxX)/2-priorityX,dz=(minZ+maxZ)/2-priorityZ;
  return {element,index,centerX:(minX+maxX)/2,centerZ:(minZ+maxZ)/2,distanceSq:Number.isFinite(dx)&&Number.isFinite(dz)?dx*dx+dz*dz:Infinity};
 }).sort((a,b)=>a.distanceSq-b.distanceSq||a.index-b.index);
 const compare=(a,b)=>a.distanceSq-b.distanceSq||a.index-b.index;
 const total=entries.length;
 let pending=entries,cursor=0,focusX=priorityX,focusZ=priorityZ;
 return {
  total,
  takeNext(){return cursor<pending.length?pending[cursor++]:null;},
  *reprioritize(x,z){
   if(!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x-focusX,z-focusZ)<50)return false;
   focusX=x;focusZ=z;
   const remaining=pending.length-cursor;
   if(remaining<2)return false;
   let source=pending.slice(cursor),destination=new Array(remaining);
   // Do not change the active queue until the new order is fully prepared.
   for(let i=0;i<remaining;i++){
    const entry=source[i],dx=entry.centerX-x,dz=entry.centerZ-z;
    entry.distanceSq=Number.isFinite(dx)&&Number.isFinite(dz)?dx*dx+dz*dz:Infinity;
    if((i+1)%512===0)yield {type:'priority',phase:'distance'};
   }
   // Incremental stable mergesort: bounded work per yield (no 20k-item sort spike).
   let operations=0;
   for(let width=1;width<remaining;width*=2){
    for(let start=0;start<remaining;start+=2*width){
     let left=start,right=Math.min(start+width,remaining),end=Math.min(start+2*width,remaining);
     const mid=right;
     for(let out=start;out<end;out++){
      if(left<mid&&(right>=end||compare(source[left],source[right])<=0))destination[out]=source[left++];
      else destination[out]=source[right++];
      if(++operations%512===0)yield {type:'priority',phase:'sort'};
     }
    }
    [source,destination]=[destination,source];
   }
   pending=source;cursor=0;
   yield {type:'priority',phase:'done'};
   return true;
  }
 };
}
// Convert verified OSM map data into renderer-independent meshes and roof labels.
// Defaults preserve the original Matsudo 500m test snapshot.
// One geometry implementation feeds both the legacy synchronous builder and
// the time-budgeted Step 3 renderer. Each yield occurs AFTER a whole OSM item.
export function* createMapBuildSteps(map,{latitude=35.78444,longitude=139.90061,halfSize=250,priorityX=0,priorityZ=0,timeBatched=false,profile=null}={}){
 // Legacy snapshots keep their exact origin; indexed 2km tiles derive it
 // from the immutable EPSG:6677 grid rather than caller-supplied coordinates.
 const center=map.tile?tileCenterWgs84(map.tile):{latitude,longitude};
 const LAT=center.latitude,LON=center.longitude,HALF=halfSize;
 const xy=p=>[(p.lon-LON)*111320*Math.cos(LAT*Math.PI/180),-(p.lat-LAT)*111320];
const color=c=>[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];
const palette=[0xc9bba8,0x9baeb8,0xb7b0a8,0xdbbfaa,0xabae9e,0xc4a99d];
function builder(){return {positions:[],normals:[],colors:[]};}
function tri(mesh,a,b,c,tint){
 const u=b.map((v,i)=>v-a[i]),v=c.map((w,i)=>w-a[i]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const length=Math.hypot(...n)||1,norm=n.map(x=>x/length),rgb=color(tint);
 for(const p of [a,b,c]){mesh.positions.push(...p);mesh.normals.push(...norm);mesh.colors.push(...rgb);}
}
function quad(m,a,b,c,d,t){tri(m,a,b,c,t);tri(m,a,c,d,t);}
function signedArea(p){let sum=0;for(let i=0,j=p.length-1;i<p.length;j=i++)sum+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return sum/2;}
function top(m,p,h,t){
 // Simple ear clipping handles concave OSM footprints without a Three.js dependency.
 const idx=p.map((_,i)=>i),ccw=signedArea(p)>0;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 let guard=0;
 while(idx.length>3&&guard++<p.length*p.length){
  let found=false;
  for(let i=0;i<idx.length;i++){
   const ia=idx[(i+idx.length-1)%idx.length],ib=idx[i],ic=idx[(i+1)%idx.length],a=p[ia],b=p[ib],c=p[ic];
   if((ccw?1:-1)*cross(a,b,c)<=1e-7)continue;
   let overlaps=false;
   for(const j of idx)if(j!==ia&&j!==ib&&j!==ic){
    const q=p[j],s1=cross(a,b,q),s2=cross(b,c,q),s3=cross(c,a,q);
    if(ccw?Math.min(s1,s2,s3)>=-1e-7:Math.max(s1,s2,s3)<=1e-7){overlaps=true;break;}
   }
   if(overlaps)continue;
   if(ccw)tri(m,[a[0],h,a[1]],[c[0],h,c[1]],[b[0],h,b[1]],t);
   else tri(m,[a[0],h,a[1]],[b[0],h,b[1]],[c[0],h,c[1]],t);
   idx.splice(i,1);found=true;break;
  }
  if(!found)break;
 }
 if(idx.length===3){const a=p[idx[0]],b=p[idx[1]],c=p[idx[2]];if(ccw)tri(m,[a[0],h,a[1]],[c[0],h,c[1]],[b[0],h,b[1]],t);else tri(m,[a[0],h,a[1]],[b[0],h,b[1]],[c[0],h,c[1]],t);}
}
function building(m,p,h,t,spans,roadSegments,tags,pinkSpans=[],foodSpans=[]){
 const n=p.length,area=signedArea(p),outward=area>0?1:-1;
 const edges=p.map((a,i)=>{
  const b=p[(i+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;
  return {a,b,len,mid:[(a[0]+b[0])/2,(a[1]+b[1])/2],normal:[outward*dz/len,-outward*dx/len]};
 });
 let front=edges.reduce((best,e,i)=>e.len>edges[best].len?i:best,0),score=Infinity;
 const eligible=edges.some(e=>e.len>=CONVENIENCE_DOOR_WIDTH_M);
 // The shared-width opening must fit on its chosen edge. Short edges cannot host doors.
 for(let i=0;i<n;i++)for(const [a,b] of roadSegments){
  if(eligible&&edges[i].len<CONVENIENCE_DOOR_WIDTH_M)continue;
  const mx=edges[i].mid[0],mz=edges[i].mid[1],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((mx-a[0])*dx+(mz-a[1])*dz)/(dx*dx+dz*dz||1)));
  const dist=Math.hypot(mx-a[0]-t*dx,mz-a[1]-t*dz);
  if(dist<score){score=dist;front=i;}
 }
 let back=-1,bestDot=.35;
 for(let i=0;i<n;i++)if(i!==front){
  const dot=-(edges[front].normal[0]*edges[i].normal[0]+edges[front].normal[1]*edges[i].normal[1]);
  if(dot>bestDot){bestDot=dot;back=i;}
 }
 for(let i=0;i<n;i++){
  const e=edges[i],side=i===front?'front':i===back?'back':'side';
  paintFoodWall(quad,m,e.a,e.b,h,t,spans,foodSpans,side,outward);
  paintLoveHotelWall(quad,m,e.a,e.b,pinkSpans,LOVE_HOTEL_COLOR,outward);
 }
 top(m,p,h,resolveOsmConvenienceRoofColor(spans,tags,h,t));
}
function strip(m,points,width,t,y=.045){
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  if(len<.01)continue;
  const nx=-dz/len*width/2,nz=dx/len*width/2;
  quad(m,[a[0]-nx,y,a[1]-nz],[a[0]+nx,y,a[1]+nz],[b[0]+nx,y,b[1]+nz],[b[0]-nx,y,b[1]-nz],t);
 }
}
function rectangle(m,x0,z0,x1,z1,t){quad(m,[x0,-.22,z0],[x0,-.22,z1],[x1,-.22,z1],[x1,-.22,z0],t);}
 let buildings=palette.map(builder),roads=builder(),walks=builder(),rails=builder(),parkings=builder();
 let buildingSlices=[]; // Per-building spans inside existing grouped batch meshes.
 let texturedFaces=[]; // UV-mapped facade surfaces live outside the fixed Engine mesh contract.
 const floor=builder(),labels=[],mapFeatures=[],poiLabels=[];
 const facilityKeys=['shop','amenity','tourism','office','leisure','healthcare'];
 // Step 1: prioritize complete OSM features nearest the helicopter.
 // Step 2: group completed feature geometries for gradual display.
 // Step 3: yield between complete features when the caller's time budget expires.
 // The original element index breaks distance ties deterministically.
 const originalOrder=new WeakMap();
 const featureQueue=createFeatureWorkQueue(map.elements,xy,priorityX,priorityZ);
 // Every batch contains only fully generated features. Keep the ground
 // in its own first batch so the helicopter always has visible terrain.
 const displayBatches=[{meshes:[floor],labels:[],mapFeatures:[],texturedFaces:[],start:-1,end:-1}];
 const batchSize=Math.max(1,Math.ceil(featureQueue.total/24));
 let batchStart=0,processed=0,lastLabelIndex=0,lastFeatureIndex=0,lastEarlyPoiIndex=0;
 // Track the REAL processed order, not the initially predicted distance rank.
 // This remains identical in Step 4-A and stays valid after reprioritization.
 const processedIndices=[],completedBatchByIndex=new Array(featureQueue.total);
 const earlyPoiDisplay=[];
 function flushBatch(end){
  const meshes=[...buildings,roads,walks,rails,parkings].filter(m=>m.positions.length>0);
  const batch={meshes,start:batchStart,end,labels:[...labels.slice(lastLabelIndex),...earlyPoiDisplay.slice(lastEarlyPoiIndex)],mapFeatures:mapFeatures.slice(lastFeatureIndex),
   buildingSlices:buildingSlices.map(slice=>({osmKey:slice.osmKey,meshIndex:meshes.indexOf(slice.mesh),start:slice.start,end:slice.end})),
   texturedFaces};
  if(meshes.length||batch.labels.length||batch.mapFeatures.length){
   displayBatches.push(batch);
   for(let i=batchStart;i<=end;i++)completedBatchByIndex[processedIndices[i]]=batch;
  }
  lastLabelIndex=labels.length;lastFeatureIndex=mapFeatures.length;lastEarlyPoiIndex=earlyPoiDisplay.length;
  buildings=palette.map(builder);roads=builder();walks=builder();rails=builder();parkings=builder();
  buildingSlices=[];texturedFaces=[];
  batchStart=end+1;
  return batch;
 }
 const convenienceBuildings=matchConvenienceBuildings(map.elements,xy,HALF);
 const foodBuildings=matchFoodBuildings(map.elements,xy,HALF);
 const daisoBuildings=matchDaisoBuildings(map.elements,xy,HALF);
 const loveHotelBuildings=matchLoveHotelBuildings(map.elements,xy,HALF);
 const inferredTenantLevels=inferBuildingLevelsFromTenants(map.elements,xy,HALF);
 const roadSegments=[];
 for(const way of map.elements){
  if(!way.tags?.highway||['construction','proposed'].includes(way.tags.highway))continue;
  const pts=(way.geometry||[]).map(xy);
  for(let i=1;i<pts.length;i++)roadSegments.push([pts[i-1],pts[i]]);
 }
 // Name equality and short geographic distance: no per-store mappings.
 const normalized=name=>String(name).normalize('NFKC').toLowerCase().replace(/[\s\u2010-\u2015\u2212\uff0d\-]/g,'');
 const isNearby=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<=15;
 // The old end-of-map POI merge is retained as the authoritative final
 // result. Pre-identify *standalone* named POIs for early display; defer POIs
 // that should merge into a named building, and collapse nearby same-name
 // nodes just as the legacy merger does. This avoids duplicate provisional
 // cards and keeps the cost of matching out of the per-frame 6ms budget.
 const namedAnchors=[];
 for(const e of map.elements){
  const tags=e.tags||{},name=String(tags['name:ja']||tags.name||'').trim();
  if(!name||!tags.building||tags.building==='no'||(e.geometry||[]).length<4)continue;
  const p=e.geometry.map(xy);
  if(Math.hypot(p[0][0]-p[p.length-1][0],p[0][1]-p[p.length-1][1])>.5)continue;
  p.pop();if(p.length<3)continue;
  const area=Math.abs(signedArea(p));if(area<3||area>35000)continue;
  const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  if(minX>HALF||maxX< -HALF||minZ>HALF||maxZ< -HALF)continue;
  namedAnchors.push({name:normalized(name),x:(minX+maxX)/2,z:(minZ+maxZ)/2});
 }
 const poiAnchors=[],earlyPoiElements=new WeakSet();
 for(const e of map.elements){
  const tags=e.tags||{};
  if(e.type!=='node'||!facilityKeys.some(key=>tags[key]))continue;
  const name=String(tags['name:ja']||tags.name||'').trim();
  if(!name||!Number.isFinite(e.lat)||!Number.isFinite(e.lon))continue;
  const [x,z]=xy(e);
  if(Math.abs(x)>HALF||Math.abs(z)>HALF)continue;
  const key=normalized(name),anchor={name:key,x,z};
  const existing=namedAnchors.find(a=>a.name===key&&isNearby(a,anchor))
   ||poiAnchors.find(a=>a.name===key&&isNearby(a,anchor));
  if(existing){existing.x=x;existing.z=z;}
  else poiAnchors.push({...anchor,first:e});
 }
 for(const anchor of poiAnchors)earlyPoiElements.add(anchor.first);
 rectangle(floor,-HALF,-HALF,HALF,HALF,0x9fce8d);
 let buildingCount=0,roadCount=0,railCount=0;
 // Make terrain visible before entering the CPU-intensive feature loop.
 yield {type:'batch',batch:displayBatches[0],processed:0,total:featureQueue.total};
 for(let remaining=featureQueue.total;remaining>0;remaining--){
  const {element:e,index}=featureQueue.takeNext();
  function processElement(){
  const tags=e.tags||{},p=(e.geometry||[]).map(xy);
  const parking=parkingAreaFromOsm(e,p,HALF);
  if(parking)paintParkingArea(parkings,parking.points,top,quad);
  // Point-of-interest nodes have coordinates, not a way geometry.
  // Keep their OSM position as the ground-level anchor.
  if(e.type==='node'&&facilityKeys.some(key=>tags[key])){
   const name=String(tags['name:ja']||tags.name||'').trim();
   if(name&&Number.isFinite(e.lat)&&Number.isFinite(e.lon)){
    const [x,z]=xy(e);
    if(Math.abs(x)<=HALF&&Math.abs(z)<=HALF)
     {const label={kind:'poi',osmType:e.type,osmId:e.id,osmVersion:e.version??null,name,tags:{...tags},x,z,y:.9};poiLabels.push(label);originalOrder.set(label,index);if(earlyPoiElements.has(e))earlyPoiDisplay.push(label);}
   }
  }
  if(p.length<2)return;
  if(tags.building&&tags.building!=='no'&&p.length>=4){
   if(Math.hypot(p[0][0]-p[p.length-1][0],p[0][1]-p[p.length-1][1])>.5)return;
   p.pop();if(p.length<3)return;
   const area=Math.abs(signedArea(p));if(area<3||area>35000)return;
   const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
   if(minX>HALF||maxX< -HALF||minZ>HALF||maxZ< -HALF)return;
   let height=Number.parseFloat(tags.height);
   const levels=Number.parseFloat(tags['building:levels']);
   const validHeight=Number.isFinite(height)&&height>=2&&height<=180;
   const validLevels=Number.isFinite(levels)&&levels>0;
   // Infer only where neither authoritative height nor floor count is usable.
   const inferredLevels=!validHeight&&!validLevels?(inferredTenantLevels.get(e.id)||null):null;
   if(!validHeight)height=validLevels?Math.min(60,levels*3):inferredLevels?inferredLevels*4:4;
   const tint=resolveLoveHotelColor(e.id,loveHotelBuildings,palette[e.id%palette.length],tags,height,inferredLevels);
   const pinkSpans=resolveLoveHotelFloorSpans(e.id,loveHotelBuildings,tags,height,inferredLevels)||[];
   const buildingMesh=buildings[e.id%palette.length],buildingStart=buildingMesh.positions.length;
   const convenienceSpans=resolveConveniencePaint(convenienceBuildings.get(e.id),tags,height,inferredLevels);
   const foodSpans=resolveFoodPaint(foodBuildings.get(e.id),tags,height,inferredLevels);
   building(buildingMesh,p,height,tint,convenienceSpans,roadSegments,tags,pinkSpans,foodSpans);
   // Same POI / building association as Yoshinoya and Hidakaya. The tagged
   // zero-based 'level' owns placement; no station/building/floor IDs here.
   // Avoid covering another store's facade on a conflicting level.
   const otherStoreSpans=[...convenienceSpans,...foodSpans];
   const available=span=>!otherStoreSpans.some(other=>
    span.bottom<other.top-1e-8&&span.top>other.bottom+1e-8);
   // Independent images use the same matching, floor and wall-UV rules.
   for(const span of resolveMcDonaldsPaint(foodBuildings.get(e.id),tags,height,inferredLevels)){
    if(!available(span))continue;
    if(paintMcDonaldsFacade(quad,buildingMesh,p,{
     bottom:span.bottom,top:span.top,texturedFaces,ownerKey:e.type+'/'+e.id
    }))otherStoreSpans.push(span);
   }
   for(const span of resolveDaisoPaint(daisoBuildings.get(e.id),tags,height,inferredLevels)){
    if(!available(span))continue;
    if(paintDaisoFacade(quad,buildingMesh,p,{
     bottom:span.bottom,top:span.top,texturedFaces,ownerKey:e.type+'/'+e.id
    }))otherStoreSpans.push(span);
   }
   buildingSlices.push({osmKey:e.type+'/'+e.id,mesh:buildingMesh,start:buildingStart,end:buildingMesh.positions.length});
   {const feature={type:'building',points:p,height,area,osmType:e.type,osmId:e.id,osmVersion:e.version??null,tags:{...tags},bounds:[minX,maxX,minZ,maxZ]};
    // Keep a non-enumerable source for an isolated editor preview; no change to feature JSON/logging.
    Object.defineProperty(feature,'previewSource',{value:e});
    Object.defineProperty(feature,'previewTile',{value:map.tile??null});
    mapFeatures.push(feature);originalOrder.set(feature,index);}
   const name=String(tags['name:ja']||tags.name||'').trim();
   if(name){const label={kind:'building',osmType:e.type,osmId:e.id,osmVersion:e.version??null,name,tags:{...tags},x:(minX+maxX)/2,z:(minZ+maxZ)/2,y:height+.9};labels.push(label);originalOrder.set(label,index);}
   buildingCount++;
  }
  if(tags.highway&&!['construction','proposed'].includes(tags.highway)){
   const pedestrian=['footway','pedestrian','path','steps','cycleway','corridor','living_street'].includes(tags.highway);
   const width=pedestrian?(tags.highway==='pedestrian'?6:2.2):['primary','secondary','tertiary','trunk'].includes(tags.highway)?10:['service','residential','unclassified'].includes(tags.highway)?5.5:3.2;
   strip(pedestrian?walks:roads,p,width,pedestrian?0xc7c6b4:0x596570,pedestrian?.052:.047);
   {const feature={type:'road',points:p};mapFeatures.push(feature);originalOrder.set(feature,index);}
   roadCount++;
  }else if(tags.railway&&['rail','light_rail','tram'].includes(tags.railway)){
   strip(rails,p,3.1,0x806e65,.075);{const feature={type:'rail',points:p};mapFeatures.push(feature);originalOrder.set(feature,index);}railCount++;
  }

  }
  if(profile){
   const start=performance.now();
   processElement();
   profile.record('feature',performance.now()-start,e.id);
  }else processElement();
  processedIndices.push(index);
  processed++;
  // Caller requests a flush when its frame-time budget is exhausted.
  // Synchronous callers retain Step 2's fixed-size geometry batches.
  const control=yield {type:'feature',processed,total:featureQueue.total,counts:{buildings:buildingCount,roads:roadCount,rails:railCount}};
  const flushRequested=control&&typeof control==='object'?Boolean(control.flush):Boolean(control);
  if(flushRequested||(!timeBatched&&processed%batchSize===0)){
   const batch=flushBatch(processed-1);
   yield {type:'batch',batch,processed,total:featureQueue.total};
  }
  if(control&&typeof control==='object'&&timeBatched)
   yield* featureQueue.reprioritize(control.playerX,control.playerZ);
 }
 if(batchStart<processed){
  const batch=flushBatch(processed-1);
  yield {type:'batch',batch,processed,total:featureQueue.total};
 }
 // Step 5: measure the final synchronous sections separately. No geometry,
 // ordering or yield behavior changes; this runs only when profiling is enabled.
 let finalClock=profile?performance.now():0;
 // Keep label and minimap feature order identical to the legacy build.
 labels.sort((a,b)=>originalOrder.get(a)-originalOrder.get(b));
 poiLabels.sort((a,b)=>originalOrder.get(a)-originalOrder.get(b));
 mapFeatures.sort((a,b)=>originalOrder.get(a)-originalOrder.get(b));
 if(profile){profile.record('final-sort',performance.now()-finalClock);finalClock=performance.now();}
 // Step 5-A: group existing labels by normalized name once. Within each
 // group preserve insertion order, so the first nearby match is EXACTLY the
 // same as the former labels.find() scan. Each newly appended POI is indexed
 // immediately; updating an existing label keeps its normalized name.
 const labelsByName=new Map();
 function indexLabel(label){
  const name=normalized(label.name),group=labelsByName.get(name);
  if(group)group.push(label);
  else labelsByName.set(name,[label]);
 }
 for(const label of labels)indexLabel(label);
 // Deduplicate named facilities automatically against nearby same-name buildings
 // and other nodes. Retain the precise POI anchor and merge tags.
 for(const poi of poiLabels){
  const name=normalized(poi.name);
  const existing=(labelsByName.get(name)||[]).find(label=>isNearby(label,poi));
  // Do not merge separate OSM nodes solely because they have nearby equal names.
  // Distinct shop/office identities must remain selectable inside a building.
  if(existing?.kind==='poi'&&existing.osmType===poi.osmType&&existing.osmId===poi.osmId)continue;
  labels.push(poi);indexLabel(poi);
 }
 if(profile){profile.record('final-poi',performance.now()-finalClock);finalClock=performance.now();}
 // Attach the final, deduplicated labels and minimap features to their
 // originating feature's priority batch. The complete collections keep
 // their legacy order for comparisons and other callers.
 for(const batch of displayBatches){
  batch.labels=[];
  batch.mapFeatures=[];
 }
 function batchFor(item){
  return completedBatchByIndex[originalOrder.get(item)]??displayBatches[0];
 }
 for(const label of labels)batchFor(label).labels.push(label);
 for(const feature of mapFeatures)batchFor(feature).mapFeatures.push(feature);
 if(profile){profile.record('final-batches',performance.now()-finalClock);finalClock=performance.now();}
 const meshes=displayBatches.flatMap(batch=>batch.meshes);
 if(profile)profile.record('final-meshes',performance.now()-finalClock);
 return {meshes,displayBatches,labels,mapFeatures,
  texturedFaces:displayBatches.flatMap(batch=>batch.texturedFaces||[]),
  counts:{buildings:buildingCount,roads:roadCount,rails:railCount}};
}

// Existing callers can still request the identical full-map result.
export function buildMap(map,options={}){
 const steps=createMapBuildSteps(map,options);
 let result=steps.next();
 while(!result.done)result=steps.next();
 return result.value;
}
