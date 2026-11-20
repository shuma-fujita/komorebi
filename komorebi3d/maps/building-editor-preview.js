// Isolated OSM-building view for the tenant editor.
// Reuses the same map geometry builder, without moving the helicopter or changing
// the original map meshes. No animation dependencies.
import {buildMap} from './map-builder.js?v=building-preview-source-20261120';
import {tileCenterWgs84} from './tile-grid.js?v=tile-grid-epsg6677-20261114';

export function createBuildingEditorPreview(feature,shops,createMeshGeometry){
 if(!feature||!feature.previewSource||!Array.isArray(feature.bounds))return null;
 const [minX,maxX,minZ,maxZ]=feature.bounds;
 if(![minX,maxX,minZ,maxZ,feature.height].every(Number.isFinite))return null;
 const tile=feature.previewTile;
 const origin=tile?tileCenterWgs84(tile):{latitude:35.78444,longitude:139.90061};
 const cos=Math.cos(origin.latitude*Math.PI/180);
 // Supply nearby store nodes so the existing facade/tenant matching logic runs.
 const tenantNodes=(shops||[]).filter(s=>s.kind==='poi'&&s.osmType==='node'&&
  Number.isFinite(s.x)&&Number.isFinite(s.z)).map(s=>({
   type:'node',id:s.osmId,version:s.osmVersion??null,
   lat:origin.latitude-s.z/111320,
   lon:origin.longitude+s.x/(111320*cos),
   tags:{...(s.tags||{})}
 }));
 const e=feature.previewSource;
 const building={...e,tags:{...(e.tags||{}),height:String(feature.height)}};
 const map={tile,elements:[building,...tenantNodes]};
 const result=buildMap(map,{halfSize:Math.max(1000,Math.abs(minX)+30,Math.abs(maxX)+30,Math.abs(minZ)+30,Math.abs(maxZ)+30),
  priorityX:(minX+maxX)/2,priorityZ:(minZ+maxZ)/2});
 const geometry=[];
 for(const mesh of result.meshes){
  if(!mesh.positions?.length)continue;
  // Exclude the full-map grassy floor: this preview contains only building geometry.
  let raised=false;
  for(let i=1;i<mesh.positions.length;i+=3)if(mesh.positions[i]>.15){raised=true;break;}
  if(!raised)continue;
  geometry.push(createMeshGeometry({
   id:'matsudo:editor-building:'+feature.osmType+':'+feature.osmId+':'+geometry.length,
   positions:mesh.positions,normals:mesh.normals,colors:mesh.colors
  }));
 }
 if(!geometry.length)return null;
 return {geometry,centerX:(minX+maxX)/2,centerZ:(minZ+maxZ)/2,
  width:Math.max(3,maxX-minX),depth:Math.max(3,maxZ-minZ),height:Math.max(3,feature.height)};
}

// The editor sheet covers the lower 50% of each full-height 3D viewport.
// Keep the building centered at x=50%, y=25% of the entire canvas,
// i.e. the visual center of the uncovered upper half.
export function buildingEditorCamera(preview,aspect){
 const {centerX:x,centerZ:z,width,depth,height}=preview;
 const safeAspect=Math.max(.24,Math.min(2,Number.isFinite(aspect)?aspect:1));
 const center=[x,height*.5,z];
 const direction=[.65,.48,.75],directionLength=Math.hypot(...direction);
 const backward=direction.map(v=>v/directionLength);
 const forward=backward.map(v=>-v);
 const right=[-forward[2],0,forward[0]];
 const rightLength=Math.hypot(...right);
 for(let i=0;i<3;i++)right[i]/=rightLength;
 const up=[
  right[1]*forward[2]-right[2]*forward[1],
  right[2]*forward[0]-right[0]*forward[2],
  right[0]*forward[1]-right[1]*forward[0]
 ];
 const tanHalf=Math.tan(45*Math.PI/360);
 const corners=[];
 for(const dx of [-width/2,width/2])
  for(const dz of [-depth/2,depth/2])
   for(const dy of [-height/2,height/2])corners.push([dx,dy,dz]);
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 // Use the actual A/B canvas aspect, including narrow phone viewports.
 // Fit the entire building INSIDE the uncovered top half with 12% margins.
 let distance=Math.max(18,height*2.25,Math.hypot(width,depth)*1.45/Math.min(1,safeAspect));
 function fits(d){
  const offset=d*tanHalf*.5;
  for(const corner of corners){
   const projectedDepth=d-dot(corner,backward);
   if(projectedDepth<=.1)return false;
   const ndcX=dot(corner,right)/(projectedDepth*tanHalf*safeAspect);
   const ndcY=(dot(corner,up)+offset)/(projectedDepth*tanHalf);
   if(Math.abs(ndcX)>.84||ndcY<.12||ndcY>.88)return false;
  }
  return true;
 }
 for(let i=0;i<30&&!fits(distance);i++)distance*=1.2;
 const offset=distance*tanHalf*.5;
 const eye=center.map((v,i)=>v+backward[i]*distance-up[i]*offset);
 const target=center.map((v,i)=>v-up[i]*offset);
 return {eye,target};
}
