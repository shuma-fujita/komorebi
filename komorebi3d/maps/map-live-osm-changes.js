// Scene-only update for successfully saved production OSM tags.
// Keep all operations local: no Overpass, remote API, or complete-tile rebuild.
import {buildMap} from './map-builder.js?v=ground-glass-centered-upper-v1-20261123';
import {tileCenterWgs84} from './tile-grid.js?v=tile-grid-epsg6677-20261114';
import {pointInFootprint,TENANT_OUTSIDE_TOLERANCE_METRES} from './map-occupants.js?v=shared-outside-1m-20261119';
const facilities=['shop','amenity','tourism','office','leisure','healthcare'];
let revision=0;
const keyOf=e=>e.type+'/'+e.id;
const projected=(e,origin)=>[(e.lon-origin.longitude)*111320*Math.cos(origin.latitude*Math.PI/180),
 -(e.lat-origin.latitude)*111320];
const inBounds=(x,z,b,m=0)=>x>=b[0]-m&&x<=b[1]+m&&z>=b[2]-m&&z<=b[3]+m;
function outlineDistance(x,z,points){
 let distance=Infinity;
 for(let i=0;i<points.length;i++){
  const [ax,az]=points[i],[bx,bz]=points[(i+1)%points.length];
  const dx=bx-ax,dz=bz-az,len=dx*dx+dz*dz;
  const t=len?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len)):0;
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }
 return distance;
}
function ownerBuildings(features,node,origin){
 const [x,z]=projected(node,origin);
 const nearby=features.filter(f=>f.type==='building'&&inBounds(x,z,f.bounds,TENANT_OUTSIDE_TOLERANCE_METRES)&&
  (pointInFootprint(x,z,f.points)||outlineDistance(x,z,f.points)<=TENANT_OUTSIDE_TOLERANCE_METRES));
 const containing=nearby.filter(f=>pointInFootprint(x,z,f.points)).sort((a,b)=>a.area-b.area);
 // Inside a nested footprint, the smallest building owns the POI.
 if(containing.length)return [containing[0]];
 // An outside POI is accepted only if the owner is unambiguous.
 return nearby.length===1?nearby:[];
}
function localContext(map,raw,origin){
 const coords=(raw.geometry||[]).map(p=>projected(p,origin));
 if(!coords.length)return {tile:map.tile,elements:[raw]};
 const xs=coords.map(p=>p[0]),zs=coords.map(p=>p[1]);
 const bounds=[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
 const elements=[raw];
 for(const e of map.elements){
  if(e===raw)continue;
  if(e.type==='node'&&Number.isFinite(e.lat)&&Number.isFinite(e.lon)){
   const [x,z]=projected(e,origin);
   if(inBounds(x,z,bounds,3))elements.push(e);
  }else if(e.type==='way'&&Array.isArray(e.geometry)){
   // Near roads preserve the facade's front-facing orientation. Nearby
   // competing building footprints preserve the POI ownership decision.
   const margin=e.tags?.highway?120:e.tags?.building?3:-1;
   if(margin>=0&&e.geometry.some(p=>{
    const [x,z]=projected(p,origin);
    return inBounds(x,z,bounds,margin);
   }))elements.push(e);
  }
 }
 return {tile:map.tile,elements};
}
function rebuildOne(map,building,origin){
 const result=buildMap(localContext(map,building,origin),{halfSize:1000});
 const id=keyOf(building);
 const texturedFaces=result.texturedFaces.filter(face=>face.ownerKey===id);
 const feature=result.mapFeatures.find(f=>f.type==='building'&&f.osmType+'/'+f.osmId===id)||null;
 const label=result.labels.find(l=>l.kind==='building'&&l.osmType+'/'+l.osmId===id)||null;
 for(const batch of result.displayBatches){
  const slice=batch.buildingSlices?.find(item=>item.osmKey===id);
  if(!slice)continue;
  const m=batch.meshes[slice.meshIndex];
  if(!m)continue;
  return {data:{positions:m.positions.slice(slice.start,slice.end),
   normals:m.normals.slice(slice.start,slice.end),
   colors:m.colors.slice(slice.start,slice.end)},feature,label,texturedFaces};
 }
 return {data:null,feature,label,texturedFaces};
}
function removeOriginalTriangles(world,key,createMeshGeometry){
 const span=world.buildingSlices.get(key);
 if(!span)return;
 const previous=world.meshes[span.meshIndex];
 if(!previous)throw Error('建物の元メッシュが見つかりません。');
 const without=data=>data.slice(0,span.start).concat(data.slice(span.end));
 const positions=without(previous.positions);
 const replacement=positions.length?createMeshGeometry({
  id:previous.id+':cut:'+ ++revision,positions,
  normals:without(previous.normals),colors:without(previous.colors)
 }):null;
 world.meshes[span.meshIndex]=replacement;
 world.buildingSlices.delete(key);
 const cutSize=span.end-span.start;
 for(const item of world.buildingSlices.values())
  if(item.meshIndex===span.meshIndex&&item.start>=span.end){
   item.start-=cutSize;item.end-=cutSize;
  }
}
function updateLabel(world,kind,type,id,next){
 const index=world.labels.findIndex(l=>l.kind===kind&&l.osmType===type&&String(l.osmId)===String(id));
 if(index>=0){
  if(next)world.labels[index]=next;
  else world.labels.splice(index,1);
 }else if(next)world.labels.push(next);
}
function updatePoiLabel(world,node,origin){
 const tags=node.tags||{},name=String(tags['name:ja']||tags.name||'').trim();
 let label=null;
 if(name&&facilities.some(k=>tags[k])&&Number.isFinite(node.lat)&&Number.isFinite(node.lon)){
  const [x,z]=projected(node,origin);
  label={kind:'poi',osmType:'node',osmId:node.id,osmVersion:node.version,
   name,tags:{...tags},x,z,y:.9};
 }
 updateLabel(world,'poi','node',node.id,label);
}
// After the caller has recorded a production OSM API success, update only
// its target element and any building whose facade depends on the target POI.
// The original batched building triangles are removed once; subsequent writes
// only replace one small live mesh per building.
export function patchLiveGeofabrikMap(world,entry,createMeshGeometry){
 if(!world?.ready||!world.sourceMap)return {applied:false,reason:'map-not-ready'};
 const map=world.sourceMap;
 const source=map.elements.find(e=>e.type===entry.type&&String(e.id)===String(entry.id));
 if(!source)return {applied:false,reason:'not-in-tile'};
 if(Number(source.version)>Number(entry.version))return {applied:false,reason:'newer-in-map'};
 const tags={...(source.tags||{})};
 for(const [k,value] of Object.entries(entry.changes)){
  if(value===null)delete tags[k];else tags[k]=value;
 }
 source.tags=tags;source.version=entry.version;
 const origin=tileCenterWgs84(map.tile);
 const affected=new Set();
 if(source.type==='way'&&Array.isArray(source.geometry)&&source.geometry.length>=4)
  affected.add(keyOf(source));
 if(source.type==='node'&&Number.isFinite(source.lat)&&Number.isFinite(source.lon))
  for(const b of ownerBuildings(world.mapFeatures,source,origin))
   affected.add(b.osmType+'/'+b.osmId);
 for(const id of affected){
  const building=map.elements.find(e=>keyOf(e)===id);
  if(!building)continue;
  const replacement=rebuildOne(map,building,origin);
  const geometry=replacement.data?.positions.length?createMeshGeometry({
   id:'matsudo:live:'+id+':'+ ++revision,...replacement.data
  }):null;
  // Build first, then replace: a geometry error leaves the old 3D intact.
  removeOriginalTriangles(world,id,createMeshGeometry);
  if(geometry)world.liveMeshes.set(id,geometry);else world.liveMeshes.delete(id);
  // Replace only this building's PNG UV surface as localStorage / OSM tags
  // change. No full-tile rebuild; the app-side texture layer drops stale
  // surfaces on its next frame while other buildings keep their identity.
  world.texturedFaces=(world.texturedFaces||[]).filter(face=>face.ownerKey!==id)
   .concat(replacement.texturedFaces||[]);
  const i=world.mapFeatures.findIndex(f=>f.type==='building'&&f.osmType+'/'+f.osmId===id);
  if(replacement.feature){
   if(i>=0)world.mapFeatures[i]=replacement.feature;
   else world.mapFeatures.push(replacement.feature);
  }else if(i>=0)world.mapFeatures.splice(i,1);
  const [type,osmId]=id.split('/');
  updateLabel(world,'building',type,osmId,replacement.label);
 }
 if(source.type==='node')updatePoiLabel(world,source,origin);
 return {applied:true,rebuiltBuildings:affected.size};
}
