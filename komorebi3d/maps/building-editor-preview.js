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
export function buildingEditorCamera(preview,aspect,{yaw=0,zoom=1}={}){
 const {centerX:x,centerZ:z,width,depth,height}=preview;
 const safeAspect=Math.max(.24,Math.min(2,Number.isFinite(aspect)?aspect:1));
 const center=[x,height*.5,z];
 // Rotate the camera around the vertical axis only. Pitch stays unchanged.
 const angle=Math.atan2(.65,.75)+(Number.isFinite(yaw)?yaw:0);
 const direction=[Math.sin(angle)*Math.hypot(.65,.75),.48,Math.cos(angle)*Math.hypot(.65,.75)];
 const directionLength=Math.hypot(...direction);
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
 // Fit against a yaw-independent bounding cylinder. Its projected envelope
 // remains the same through all 360 degrees, so orbiting never changes zoom.
 // The visible top half corresponds to vertical NDC 0..1 (with margins).
 const radius=Math.hypot(width,depth)/2;
 const elevation=Math.abs(backward[1]);
 const horizontal=Math.sqrt(1-elevation*elevation);
 const depthExtent=radius*horizontal+height*.5*elevation;
 const upExtent=radius*elevation+height*.5*horizontal;
 let distance=Math.max(
  18,
  depthExtent+radius/(.84*tanHalf*safeAspect),
  (upExtent/tanHalf+.88*depthExtent)/.38
 )*1.02;
 // Default distance fits all corners; pinch modifies only distance.
 distance/=Math.max(.55,Math.min(3,Number.isFinite(zoom)?zoom:1));
 const offset=distance*tanHalf*.5;
 const eye=center.map((v,i)=>v+backward[i]*distance-up[i]*offset);
 const target=center.map((v,i)=>v-up[i]*offset);
 return {eye,target};
}
